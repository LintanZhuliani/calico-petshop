// ===================================================
// BATCH SCHEMA — Stock batches per branch_stock
// Each batch tracks qty, expiry date, and received date.
// Used for FEFO (First Expired, First Out) logic.
// ===================================================

import { pgTable, text, integer, date, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { branchStock } from "./branch-stock";

export const batch = pgTable("batch", {
  id: text("id").primaryKey(),
  branchStockId: text("branch_stock_id")
    .notNull()
    .references(() => branchStock.id, { onDelete: "cascade" }),
  qty: integer("qty").notNull(),
  expiredDate: date("expired_date"),
  receivedDate: date("received_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const batchRelations = relations(batch, ({ one }) => ({
  branchStock: one(branchStock, {
    fields: [batch.branchStockId],
    references: [branchStock.id],
  }),
}));
