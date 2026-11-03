/**
 * QA04 / AT04 – Geschlossene Gruppe gegen die echte Datenbank: Nichtmitglieder sehen weder
 * Titel noch Text, Anzahl oder Mitglieder (Feed, Gruppenliste, Direktlink, Suche); nach dem
 * Austritt sind auch offene Ansichten unzugänglich; eigene Texte bleiben isoliert löschbar.
 */
import { sql as dsql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { deletePostAction, leaveGroupAction } from "@/server/modules/community/actions";
import { getGroupForViewer, listDiscoverableGroups } from "@/server/modules/community/groups";
import { getFeed, getGroupPosts, getPostForViewer, searchCommunityForViewer } from "@/server/modules/community/queries";
import { createGroup, createMember, createPost, form, redirectTarget, rows, signIn } from "./fixtures";

const idle = { status: "idle" } as const;
const SECRET = "Lavendelfeld";

describe("AT04 Geschlossene Gruppe", () => {
  it("Nichtmitglied sieht weder Beitrag, Titel, Anzahl noch Mitglieder – in Feed, Liste, Direktlink und Suche", async () => {
    const a = await createMember();
    const b = await createMember();
    const hidden = await createGroup({ type: "closed", discoverable: false, members: [a.id] });
    const listed = await createGroup({ type: "closed", discoverable: true, members: [a.id] });
    const postHidden = await createPost(a.id, { groupId: hidden.id, title: `${SECRET} verborgen`, body: `Privater Text ${SECRET}` });
    const postListed = await createPost(a.id, { groupId: listed.id, title: `${SECRET} auffindbar`, body: `Text ${SECRET}` });

    const va = await signIn(a.id);
    expect((await getFeed(va)).items.map((p) => p.id)).toEqual(expect.arrayContaining([postHidden, postListed]));
    expect((await searchCommunityForViewer(va, SECRET)).map((h) => h.id).sort()).toEqual([postHidden, postListed].sort());

    const vb = await signIn(b.id);
    const feedB = (await getFeed(vb)).items.map((p) => p.id);
    expect(feedB).not.toContain(postHidden);
    expect(feedB).not.toContain(postListed);
    expect(await searchCommunityForViewer(vb, SECRET)).toEqual([]);
    expect(await getPostForViewer(vb, postHidden)).toBeNull();
    expect(await getPostForViewer(vb, postListed)).toBeNull();
    expect((await getGroupPosts(vb, listed.id)).items).toEqual([]);
    // verborgene Gruppe existiert für B nicht, auffindbare zeigt nur Beschreibung ohne Beiträge/Mitglieder
    expect(await getGroupForViewer(vb, hidden.slug)).toBeNull();
    expect((await listDiscoverableGroups(vb)).map((g) => g.slug)).not.toContain(hidden.slug);
    const outside = await getGroupForViewer(vb, listed.slug);
    expect(outside).not.toBeNull();
    expect(Object.keys(outside!)).not.toEqual(expect.arrayContaining(["memberCount"]));
    expect(JSON.stringify(outside)).not.toContain(SECRET);
    expect(outside!.membership).toBeNull();

    // Direktzugriffe werden ohne Werte technisch erfasst
    const denied = await rows<{ kind: string }>(dsql`select kind from ops.security_events where actor_id = ${b.id}`);
    expect(denied.filter((d) => d.kind === "community.post_denied").length).toBeGreaterThanOrEqual(2);
  });

  it("nach dem Austritt sind Gruppenbeiträge und Direktlinks unzugänglich; eigener Beitrag bleibt isoliert löschbar", async () => {
    const a = await createMember();
    const c = await createMember();
    const group = await createGroup({ type: "closed", discoverable: false, members: [a.id, c.id] });
    const own = await createPost(a.id, { groupId: group.id, body: "Mein eigener Text in der Gruppe" });
    const other = await createPost(c.id, { groupId: group.id, body: "Text einer anderen Person" });

    const va = await signIn(a.id);
    expect(await getPostForViewer(va, other)).not.toBeNull();
    expect(await leaveGroupAction(idle, form({ groupId: group.id }))).toMatchObject({ status: "success" });

    const [m] = await rows<{ status: string }>(
      dsql`select status from community.group_memberships where group_id = ${group.id} and account_id = ${a.id}`,
    );
    expect(m!.status).toBe("left");
    expect(await getPostForViewer(va, other)).toBeNull();
    expect((await getFeed(va)).items.map((p) => p.id)).not.toContain(other);
    expect(await getGroupForViewer(va, group.slug)).toBeNull();

    // A löscht nur den eigenen Text; der Beitrag der anderen Person bleibt unverändert
    expect(await deletePostAction(idle, form({ postId: other }))).toMatchObject({ status: "error" });
    expect(await redirectTarget(deletePostAction(idle, form({ postId: own })))).toBe("/community?status=geloescht");
    const states = await rows<{ id: string; status: string }>(
      dsql`select id, status from community.posts where id in (${own}, ${other}) order by created_at`,
    );
    expect(states).toEqual([
      { id: own, status: "deleted" },
      { id: other, status: "published" },
    ]);
  });
});
