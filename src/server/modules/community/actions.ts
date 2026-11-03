"use server";

import { and, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { COMMUNITY_RULES_VERSION } from "@/lib/catalog";
import { cleanText, runAction, str, UserError } from "../../action";
import { actionViewer, type Viewer } from "../../auth/viewer";
import { db } from "../../db";
import { comments, communityProfiles, consentRecords, groupMemberships, posts, topics } from "../../db/schema";
import { assertEnabled } from "../../flags";
import { consume, LIMITS } from "../../rate-limit";
import { retireGroupNotifications } from "../messaging/access";
import { notify } from "../messaging/notify";
import { trackLater } from "../analytics/track";
import { loadGroupForAction } from "./groups";
import { LIMIT_REVIEW_HINT, recordLimitHit } from "./limit-hits";
import { canViewPost, COMMENT_MAX, isUuid, loadPostAccess, POST_MAX, POST_TITLE_MAX } from "./queries";

/* ───────────────────────── Hilfen ───────────────────────── */

/** SAF07: vor dem ersten Community-Schreiben müssen die aktuellen Regeln bestätigt sein. */
function assertRulesAccepted(viewer: Viewer) {
  if (viewer.rulesAcceptedVersion !== COMMUNITY_RULES_VERSION)
    throw new UserError("Bitte bestätige zuerst die aktuellen Community-Regeln.", undefined, { rules: true });
}

function lengthError(value: string, max: number, label: string): string | null {
  if (value.length > max) return `${label} darf höchstens ${max.toLocaleString("de-CH")} Zeichen lang sein (jetzt ${value.length.toLocaleString("de-CH")}).`;
  return null;
}

/* ───────────────────────── Regeln bestätigen (SAF07) ───────────────────────── */

export async function acceptRulesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer();
    if (str(formData, "accept") !== "on")
      return fail("Bitte bestätige die Regeln, um fortzufahren.", {
        fieldErrors: { accept: "Diese Bestätigung ist für das Schreiben in der Community erforderlich." },
      });
    const now = new Date();
    await db.transaction(async (tx) => {
      // Versionierter Nachweis, kein überschriebenes Boolean (PRD 09).
      await tx.insert(consentRecords).values({
        accountId: viewer.accountId,
        purpose: "community_rules",
        textVersion: COMMUNITY_RULES_VERSION,
        decision: "granted",
        decidedAt: now,
      });
      await tx
        .update(communityProfiles)
        .set({
          rulesAcceptedVersion: COMMUNITY_RULES_VERSION,
          rulesAcceptedAt: now,
          version: sql`${communityProfiles.version} + 1`,
        })
        .where(eq(communityProfiles.accountId, viewer.accountId));
    });
    refresh();
    return ok("Danke, die Regeln sind bestätigt. Du kannst jetzt schreiben.");
  });
}

/* ───────────────────────── S30 Beitrag erstellen (COM02) ───────────────────────── */

/**
 * Zweistufig: «preview» prüft und zeigt die bereinigte Fassung, «publish» veröffentlicht.
 * Der Zielbereich ist ausdrücklich: «platform» oder die id einer Gruppe mit aktiver Mitgliedschaft.
 */
export async function createPostAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = {
    topic: str(formData, "topic"),
    title: str(formData, "title"),
    body: typeof formData.get("body") === "string" ? String(formData.get("body")) : "",
    target: str(formData, "target"),
  };
  const intent = str(formData, "intent");
  if (intent === "edit") return { status: "idle", values: raw, data: { step: "edit" } };

  return runAction(async () => {
    const viewer = await actionViewer({ requireWrite: true });
    await assertEnabled("community_write");
    assertRulesAccepted(viewer);

    const values = { topic: raw.topic, title: cleanText(raw.title).replace(/\n+/g, " "), body: cleanText(raw.body), target: raw.target };
    const fieldErrors: Record<string, string> = {};
    if (!values.topic) fieldErrors.topic = "Bitte wähle ein Thema.";
    if (!values.target) fieldErrors.target = "Bitte wähle, wer den Beitrag sehen kann.";
    if (!values.body) fieldErrors.body = "Bitte schreibe einen Text.";
    const tErr = lengthError(values.title, POST_TITLE_MAX, "Der Titel");
    if (tErr) fieldErrors.title = tErr;
    const bErr = lengthError(values.body, POST_MAX, "Der Text");
    if (bErr) fieldErrors.body = bErr;

    const [topic] = values.topic
      ? await db
          .select({ id: topics.id })
          .from(topics)
          .where(and(eq(topics.slug, values.topic), eq(topics.active, true)))
          .limit(1)
      : [];
    if (values.topic && !topic) fieldErrors.topic = "Dieses Thema ist nicht mehr verfügbar. Bitte wähle ein anderes.";

    let groupId: string | null = null;
    if (values.target && values.target !== "platform") {
      const group = await loadGroupForAction(values.target, viewer);
      // COM07: nur Gruppen mit aktiver Mitgliedschaft und nicht archiviert (COM08).
      if (!group || group.membership !== "active" || group.status !== "active") {
        fieldErrors.target = "In diese Gruppe kannst du nicht schreiben. Bitte wähle einen anderen Bereich.";
      } else {
        const [m] = await db
          .select({ v: groupMemberships.rulesVersionAccepted })
          .from(groupMemberships)
          .where(eq(groupMemberships.id, group.membershipId!));
        if (m?.v !== group.rulesVersion)
          fieldErrors.target = "Die Regeln dieser Gruppe wurden aktualisiert. Bitte bestätige sie zuerst im Gruppenraum.";
        groupId = group.id;
      }
    }

    if (Object.keys(fieldErrors).length > 0)
      return fail("Bitte prüfe die markierten Angaben.", { fieldErrors, values, data: { step: "edit" } });

    if (intent !== "publish") return { status: "idle", values, data: { step: "preview" } };

    // SAF08: höchstens fünf Beiträge pro Stunde.
    if (!(await consume(`post:${viewer.accountId}`, LIMITS.postsPerHour.limit, LIMITS.postsPerHour.window))) {
      await recordLimitHit("post", viewer.accountId, LIMITS.postsPerHour.window);
      return fail(
        `Du hast in der letzten Stunde bereits fünf Beiträge veröffentlicht. Bitte warte etwas – dein Text bleibt hier erhalten. ${LIMIT_REVIEW_HINT}`,
        { values, data: { step: "preview" } },
      );
    }

    const [created] = await db
      .insert(posts)
      .values({
        authorId: viewer.accountId,
        topicId: topic!.id,
        groupId,
        title: values.title || null,
        body: values.body,
      })
      .returning({ id: posts.id });
    redirect(`/community/beitrag/${created.id}?status=veroeffentlicht`);
  }, raw);
}

/* ───────────────────────── S32 Beitrag bearbeiten / löschen (COM03) ───────────────────────── */

export async function updatePostAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = {
    topic: str(formData, "topic"),
    title: str(formData, "title"),
    body: typeof formData.get("body") === "string" ? String(formData.get("body")) : "",
  };
  return runAction(async () => {
    const viewer = await actionViewer({ requireWrite: true });
    await assertEnabled("community_write");
    assertRulesAccepted(viewer);
    const postId = str(formData, "postId");
    const readVersion = Number(str(formData, "version"));

    const access = await loadPostAccess(viewer, postId);
    if (!access || access.authorId !== viewer.accountId || !canViewPost(viewer, access))
      return fail("Dieser Beitrag kann nicht bearbeitet werden.", { values: raw });
    if (access.groupStatus === "archived")
      return fail("Diese Gruppe ist archiviert und schreibgeschützt. Löschen bleibt möglich.", { values: raw });

    const values = { topic: raw.topic, title: cleanText(raw.title).replace(/\n+/g, " "), body: cleanText(raw.body) };
    const fieldErrors: Record<string, string> = {};
    if (!values.body) fieldErrors.body = "Bitte schreibe einen Text.";
    const tErr = lengthError(values.title, POST_TITLE_MAX, "Der Titel");
    if (tErr) fieldErrors.title = tErr;
    const bErr = lengthError(values.body, POST_MAX, "Der Text");
    if (bErr) fieldErrors.body = bErr;
    const [topic] = await db
      .select({ id: topics.id })
      .from(topics)
      .where(and(eq(topics.slug, values.topic), eq(topics.active, true)))
      .limit(1);
    if (!topic) fieldErrors.topic = "Bitte wähle ein Thema.";
    if (Object.keys(fieldErrors).length > 0) return fail("Bitte prüfe die markierten Angaben.", { fieldErrors, values });

    // Optimistische Versionierung; group_id bleibt unverändert (Trigger posts_target_immutable, COM03).
    const updated = await db
      .update(posts)
      .set({
        topicId: topic!.id,
        title: values.title || null,
        body: values.body,
        editedAt: new Date(),
        version: sql`${posts.version} + 1`,
      })
      .where(
        and(
          eq(posts.id, access.id),
          eq(posts.authorId, viewer.accountId),
          eq(posts.status, "published"),
          eq(posts.version, Number.isInteger(readVersion) ? readVersion : -1),
        ),
      )
      .returning({ id: posts.id });
    if (updated.length === 0)
      return fail(
        "Dein Beitrag wurde inzwischen an anderer Stelle geändert. Kopiere deinen Text bei Bedarf und lade die Seite neu, um die aktuelle Fassung zu sehen.",
        { values, data: { conflict: true } },
      );
    redirect(`/community/beitrag/${access.id}?status=bearbeitet`);
  }, raw);
}

/**
 * Löschen entfernt den Text sofort (COM03). Bleiben Antworten, zeigt der Beitrag nur einen
 * neutralen Platzhalter ohne Text oder Autor. Auch nach Austritt möglich (COM08, AT04).
 */
export async function deletePostAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer();
    const postId = str(formData, "postId");
    if (!isUuid(postId)) return fail("Dieser Beitrag kann nicht gelöscht werden.");
    const deleted = await db
      .update(posts)
      .set({ status: "deleted", title: null, body: "", version: sql`${posts.version} + 1` })
      .where(and(eq(posts.id, postId), eq(posts.authorId, viewer.accountId), eq(posts.status, "published")))
      .returning({ id: posts.id });
    if (deleted.length === 0) return fail("Dieser Beitrag kann nicht gelöscht werden. Vielleicht wurde er bereits entfernt.");
    if (str(formData, "from") === "meine-gruppen") {
      refresh();
      return ok("Dein Beitrag wurde gelöscht.");
    }
    redirect("/community?status=geloescht");
  });
}

/* ───────────────────────── Antworten (COM02, eine Ebene) ───────────────────────── */

export async function createCommentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = { body: typeof formData.get("body") === "string" ? String(formData.get("body")) : "" };
  return runAction(async () => {
    const viewer = await actionViewer({ requireWrite: true });
    await assertEnabled("community_write");
    assertRulesAccepted(viewer);
    const body = cleanText(raw.body);
    if (!body) return fail("Bitte schreibe eine Antwort.", { fieldErrors: { body: "Bitte schreibe eine Antwort." }, values: raw });
    const lErr = lengthError(body, COMMENT_MAX, "Die Antwort");
    if (lErr) return fail("Bitte prüfe deine Antwort.", { fieldErrors: { body: lErr }, values: raw });

    const access = await loadPostAccess(viewer, str(formData, "postId"));
    if (!access || !canViewPost(viewer, access)) return fail("Auf diesen Beitrag kann nicht mehr geantwortet werden.", { values: raw });
    if (access.groupStatus === "archived")
      return fail("Diese Gruppe ist archiviert und schreibgeschützt.", { values: raw });
    if (access.groupId && access.memberRulesVersion !== access.groupRulesVersion)
      return fail("Die Regeln dieser Gruppe wurden aktualisiert. Bitte bestätige sie zuerst im Gruppenraum.", { values: raw });

    // SAF08: höchstens 20 Antworten pro Stunde.
    if (!(await consume(`comment:${viewer.accountId}`, LIMITS.commentsPerHour.limit, LIMITS.commentsPerHour.window))) {
      await recordLimitHit("comment", viewer.accountId, LIMITS.commentsPerHour.window);
      return fail(
        `Du hast in der letzten Stunde bereits 20 Antworten geschrieben. Bitte warte etwas – dein Text bleibt erhalten. ${LIMIT_REVIEW_HINT}`,
        { values: raw },
      );
    }

    const commentId = await db.transaction(async (tx) => {
      const [c] = await tx
        .insert(comments)
        .values({ postId: access.id, authorId: viewer.accountId, body })
        .returning({ id: comments.id });
      // MSG07: Hinweis an den Autor – nur, wenn er den Beitrag selbst noch sehen darf (AT04: nach Austritt keine neuen Hinweise).
      const authorStillMember =
        !access.groupId ||
        (
          await tx
            .select({ id: groupMemberships.id })
            .from(groupMemberships)
            .where(
              and(
                eq(groupMemberships.groupId, access.groupId),
                eq(groupMemberships.accountId, access.authorId),
                eq(groupMemberships.status, "active"),
              ),
            )
            .limit(1)
        ).length > 0;
      if (authorStillMember)
        await notify(
          {
            accountId: access.authorId,
            type: "comment_reply",
            targetType: "post",
            targetId: access.id,
            actorId: viewer.accountId,
            dedupeKey: `reply:${c.id}`,
          },
          tx,
        );
      return c.id;
    });
    refresh();
    return ok("Deine Antwort ist veröffentlicht.", { data: { commentId } });
  }, raw);
}

export async function updateCommentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = { body: typeof formData.get("body") === "string" ? String(formData.get("body")) : "" };
  return runAction(async () => {
    const viewer = await actionViewer({ requireWrite: true });
    await assertEnabled("community_write");
    assertRulesAccepted(viewer);
    const commentId = str(formData, "commentId");
    const readVersion = Number(str(formData, "version"));
    if (!isUuid(commentId)) return fail("Diese Antwort kann nicht bearbeitet werden.", { values: raw });
    const body = cleanText(raw.body);
    if (!body) return fail("Bitte schreibe eine Antwort.", { fieldErrors: { body: "Bitte schreibe eine Antwort." }, values: raw });
    const lErr = lengthError(body, COMMENT_MAX, "Die Antwort");
    if (lErr) return fail("Bitte prüfe deine Antwort.", { fieldErrors: { body: lErr }, values: raw });

    const [c] = await db
      .select({ postId: comments.postId })
      .from(comments)
      .where(and(eq(comments.id, commentId), eq(comments.authorId, viewer.accountId), eq(comments.status, "published")))
      .limit(1);
    const access = c ? await loadPostAccess(viewer, c.postId) : null;
    // Bearbeiten nur mit aktuellem Zugang zum Beitragsbereich; nach Austritt nur Löschen (AT04).
    if (!c || !access || (access.groupId && !access.member) || access.blocked)
      return fail("Diese Antwort kann nicht bearbeitet werden.", { values: raw });
    if (access.groupStatus === "archived") return fail("Diese Gruppe ist archiviert und schreibgeschützt.", { values: raw });

    const updated = await db
      .update(comments)
      .set({ body, editedAt: new Date(), version: sql`${comments.version} + 1` })
      .where(
        and(
          eq(comments.id, commentId),
          eq(comments.authorId, viewer.accountId),
          eq(comments.status, "published"),
          eq(comments.version, Number.isInteger(readVersion) ? readVersion : -1),
        ),
      )
      .returning({ id: comments.id });
    if (updated.length === 0)
      return fail("Diese Antwort wurde inzwischen geändert. Lade die Seite neu, um die aktuelle Fassung zu sehen.", {
        values: raw,
        data: { conflict: true },
      });
    refresh();
    return ok("Deine Antwort ist gespeichert.", { data: { saved: Date.now() } });
  }, raw);
}

/** Eigene Antwort löschen – Text wird sofort entfernt, auch nach Austritt (COM03, COM08). */
export async function deleteCommentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer();
    const commentId = str(formData, "commentId");
    if (!isUuid(commentId)) return fail("Diese Antwort kann nicht gelöscht werden.");
    const deleted = await db
      .update(comments)
      .set({ status: "deleted", body: "", version: sql`${comments.version} + 1` })
      .where(and(eq(comments.id, commentId), eq(comments.authorId, viewer.accountId), eq(comments.status, "published")))
      .returning({ id: comments.id });
    if (deleted.length === 0) return fail("Diese Antwort kann nicht gelöscht werden. Vielleicht wurde sie bereits entfernt.");
    refresh();
    return ok("Deine Antwort wurde gelöscht.");
  });
}

/* ───────────────────────── Gruppen beitreten, anfragen, verlassen (COM07, COM08) ───────────────────────── */

const UNAVAILABLE = "Diese Gruppe ist nicht verfügbar.";

export async function joinGroupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer();
    const group = await loadGroupForAction(str(formData, "groupId"), viewer);
    const hidden = group && group.type === "closed" && !group.discoverable;
    if (!group || (hidden && group.membership !== "active" && group.membership !== "requested")) return fail(UNAVAILABLE);
    if (group.status === "archived") return fail("Diese Gruppe ist archiviert. Ein Beitritt ist nicht mehr möglich.");
    if (group.membership === "active") return ok("Du bist bereits Mitglied dieser Gruppe.");
    if (group.membership === "requested") return ok("Deine Anfrage ist bereits gesendet.");
    if (group.membership === "removed")
      return fail("Ein erneuter Beitritt ist nicht möglich. Bei Fragen hilft dir das Moderationsteam über das Kontaktformular.");
    if (str(formData, "accept") !== "on")
      return fail("Bitte bestätige die Regeln der Gruppe.", {
        fieldErrors: { accept: "Diese Bestätigung ist für den Beitritt erforderlich." },
      });
    if (!(await consume(`group-join:${viewer.accountId}`, 20, 3600)))
      return fail("Du hast in kurzer Zeit viele Gruppenanfragen gestellt. Bitte versuche es später erneut.");

    // COM07: offene Gruppe → sofort aktiv; geschlossene → Anfrage ohne Freitext.
    const status = group.type === "open" ? ("active" as const) : ("requested" as const);
    const now = new Date();
    if (group.membershipId) {
      const updated = await db
        .update(groupMemberships)
        .set({
          status,
          rulesVersionAccepted: group.rulesVersion,
          decidedAt: status === "active" ? now : null,
          decidedBy: null,
          version: sql`${groupMemberships.version} + 1`,
        })
        .where(
          and(
            eq(groupMemberships.id, group.membershipId),
            eq(groupMemberships.version, group.membershipVersion!),
            sql`${groupMemberships.status} in ('left', 'withdrawn', 'rejected')`,
          ),
        )
        .returning({ id: groupMemberships.id });
      if (updated.length === 0) return fail("Das hat nicht geklappt. Bitte lade die Seite neu und versuche es erneut.");
    } else {
      await db
        .insert(groupMemberships)
        .values({
          groupId: group.id,
          accountId: viewer.accountId,
          status,
          rulesVersionAccepted: group.rulesVersion,
          decidedAt: status === "active" ? now : null,
        })
        .onConflictDoNothing({ target: [groupMemberships.groupId, groupMemberships.accountId] });
    }
    // PRD 15: «Gruppe beigetreten» ohne Gruppen-ID, nur mit Einwilligung
    if (status === "active") trackLater(viewer.accountId, { name: "useful_action_completed", params: { action: "group_joined", success: true } });
    refresh();
    return ok(
      status === "active"
        ? "Willkommen! Du bist jetzt Mitglied dieser Gruppe."
        : "Deine Anfrage ist gesendet. Du erhältst einen Hinweis, sobald die Moderation entschieden hat.",
    );
  }, undefined, { flow: "F04" });
}

/** Rücknahme wirkt sofort (COM08). */
export async function withdrawRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer();
    const groupId = str(formData, "groupId");
    if (!isUuid(groupId)) return fail(UNAVAILABLE);
    const updated = await db
      .update(groupMemberships)
      .set({ status: "withdrawn", version: sql`${groupMemberships.version} + 1` })
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.accountId, viewer.accountId),
          eq(groupMemberships.status, "requested"),
        ),
      )
      .returning({ id: groupMemberships.id });
    if (updated.length === 0) return fail("Es gibt keine ausstehende Anfrage für diese Gruppe.");
    refresh();
    return ok("Deine Anfrage ist zurückgezogen.");
  });
}

/** Austritt entzieht sofort Lesen und Schreiben; eigene Beiträge bleiben bestehen (COM08, F04). */
export async function leaveGroupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer();
    const groupId = str(formData, "groupId");
    if (!isUuid(groupId)) return fail(UNAVAILABLE);
    const updated = await db.transaction(async (tx) => {
      const rows = await tx
        .update(groupMemberships)
        .set({ status: "left", version: sql`${groupMemberships.version} + 1` })
        .where(
          and(
            eq(groupMemberships.groupId, groupId),
            eq(groupMemberships.accountId, viewer.accountId),
            eq(groupMemberships.status, "active"),
          ),
        )
        .returning({ id: groupMemberships.id });
      // MSG08/AT04: nach Austritt keine Hinweise mehr zu Gruppenbeiträgen.
      if (rows.length > 0) await retireGroupNotifications(tx, viewer.accountId, groupId);
      return rows;
    });
    if (updated.length === 0) return fail("Du bist nicht Mitglied dieser Gruppe.");
    if (str(formData, "from") === "gruppe") redirect("/community/meine-gruppen?status=verlassen");
    refresh();
    return ok("Du hast die Gruppe verlassen.");
  });
}

/** Neue Fassung der Gruppenregeln bestätigen (SAF07: Regeländerung nachvollziehbar). */
export async function acceptGroupRulesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer();
    const group = await loadGroupForAction(str(formData, "groupId"), viewer);
    if (!group || group.membership !== "active") return fail(UNAVAILABLE);
    if (str(formData, "accept") !== "on")
      return fail("Bitte bestätige die Regeln der Gruppe.", {
        fieldErrors: { accept: "Diese Bestätigung ist zum Schreiben in der Gruppe erforderlich." },
      });
    await db
      .update(groupMemberships)
      .set({ rulesVersionAccepted: group.rulesVersion, version: sql`${groupMemberships.version} + 1` })
      .where(and(eq(groupMemberships.id, group.membershipId!), eq(groupMemberships.status, "active")));
    refresh();
    return ok("Danke, die aktuellen Gruppenregeln sind bestätigt.");
  });
}
