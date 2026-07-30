import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const platformsTable = pgTable("platforms", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(), // youtube | instagram | tiktok
  isConnected: boolean("is_connected").notNull().default(false),
  accountName: text("account_name"),
  accountId: text("account_id"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Platform = typeof platformsTable.$inferSelect;
export type InsertPlatform = typeof platformsTable.$inferInsert;
