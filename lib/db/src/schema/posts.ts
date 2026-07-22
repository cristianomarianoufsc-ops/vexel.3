import { pgTable, serial, text, timestamp, json } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const postsTable = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  caption: text("caption").notNull().default(""),
  videoObjectPath: text("video_object_path"),
  thumbnailUrl: text("thumbnail_url"),
  status: text("status").notNull().default("draft"), // draft | scheduled | published | failed
  platforms: json("platforms").$type<string[]>().notNull().default([]),
  scheduledAt: timestamp("scheduled_at"),
  publishedAt: timestamp("published_at"),
  platformResults: json("platform_results").$type<Array<{
    platform: string;
    status: string;
    postUrl: string | null;
    errorMessage: string | null;
  }>>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Post = typeof postsTable.$inferSelect;
export type InsertPost = typeof postsTable.$inferInsert;
