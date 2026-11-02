import { sql } from "drizzle-orm";
import { boolean, index, integer, pgSchema, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, ts, updatedAt, version } from "./_shared";
import { accounts } from "./identity";

/** Community, Gruppen, Merkliste (COM01–COM08, HOM04). */
export const community = pgSchema("community");

export const groupType = community.enum("group_type", ["open", "closed"]);
export const groupStatus = community.enum("group_status", ["active", "archived"]);
export const membershipStatus = community.enum("membership_status", [
  "requested",
  "active",
  "rejected",
  "left",
  "removed",
  "withdrawn",
]);
export const contentStatus = community.enum("content_status", ["published", "hidden", "deleted", "removed"]);
export const bookmarkTarget = community.enum("bookmark_target", ["post", "article", "offer"]);

export const topics = community.table("topics", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const groups = community.table(
  "groups",
  {
    id: id(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    topicId: uuid("topic_id").references(() => topics.id),
    type: groupType("type").notNull(),
    /** Nur für geschlossene Gruppen relevant: auffindbar oder verborgen */
    discoverable: boolean("discoverable").notNull().default(true),
    rules: text("rules").notNull(),
    rulesVersion: text("rules_version").notNull(),
    status: groupStatus("status").notNull().default("active"),
    moderatorAccountId: uuid("moderator_account_id").references(() => accounts.id),
    createdBy: uuid("created_by").references(() => accounts.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    version: version(),
  },
  (t) => [uniqueIndex("groups_slug_uq").on(t.slug)],
);

export const groupMemberships = community.table(
  "group_memberships",
  {
    id: id(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    status: membershipStatus("status").notNull(),
    rulesVersionAccepted: text("rules_version_accepted"),
    decidedBy: uuid("decided_by"),
    decidedAt: ts("decided_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    version: version(),
  },
  (t) => [
    uniqueIndex("group_memberships_uq").on(t.groupId, t.accountId),
    index("group_memberships_account_idx").on(t.accountId, t.status),
  ],
);

export const posts = community.table(
  "posts",
  {
    id: id(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id),
    /** null = Plattformfeed, sonst genau eine Gruppe. Unveränderlich (COM03). */
    groupId: uuid("group_id").references(() => groups.id),
    title: text("title"),
    body: text("body").notNull(),
    status: contentStatus("status").notNull().default("published"),
    editedAt: ts("edited_at"),
    publishedAt: ts("published_at").notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    version: version(),
  },
  (t) => [
    index("posts_feed_idx").on(t.groupId, t.publishedAt.desc(), t.id.desc()),
    index("posts_author_idx").on(t.authorId),
    index("posts_search_idx").using(
      "gin",
      sql`to_tsvector('german', coalesce(${t.title}, '') || ' ' || ${t.body})`,
    ),
  ],
);

export const comments = community.table(
  "comments",
  {
    id: id(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    status: contentStatus("status").notNull().default("published"),
    editedAt: ts("edited_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    version: version(),
  },
  (t) => [index("comments_post_idx").on(t.postId, t.createdAt)],
);

export const bookmarks = community.table(
  "bookmarks",
  {
    id: id(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    targetType: bookmarkTarget("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("bookmarks_uq").on(t.accountId, t.targetType, t.targetId)],
);
