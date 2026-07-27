import { pgTable, serial, text, timestamp, json } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const ideasTable = pgTable("ideas", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  tags: json("tags").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Idea = typeof ideasTable.$inferSelect;
export type InsertIdea = typeof ideasTable.$inferInsert;
