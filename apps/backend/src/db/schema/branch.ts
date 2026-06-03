// ===================================================
// BRANCH SCHEMA — Store/branch locations
// ===================================================

import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";
import { branchStock } from "./branch-stock";

export const branch = pgTable("branch", {
  id: text("id").primaryKey(), // e.g. 'pusat', 'gempi', 'baba'
  name: text("name").notNull(), // e.g. "Calico's Pet Care (Pusat)"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const branchRelations = relations(branch, ({ many }) => ({
  users: many(user),
  branchStocks: many(branchStock),
}));
