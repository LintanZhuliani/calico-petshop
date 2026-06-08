// ===================================================
// TRANSFER SCHEMA — Inter-branch stock transfers
// ===================================================

import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { branch } from "./branch.js";
import { user } from "./auth.js";
import { product } from "./product.js";

export const transfer = pgTable("transfer", {
  id: text("id").primaryKey(),
  fromBranchId: text("from_branch_id")
    .notNull()
    .references(() => branch.id),
  toBranchId: text("to_branch_id")
    .notNull()
    .references(() => branch.id),
  initiatedById: text("initiated_by_id")
    .notNull()
    .references(() => user.id),
  initiatedByName: text("initiated_by_name").notNull(),
  status: text("status").notNull().default("transit"), // 'transit' | 'completed' | 'discrepancy'
  note: text("note"),
  confirmedById: text("confirmed_by_id").references(() => user.id),
  confirmedByName: text("confirmed_by_name"),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transferRelations = relations(transfer, ({ one, many }) => ({
  fromBranch: one(branch, {
    fields: [transfer.fromBranchId],
    references: [branch.id],
    relationName: "fromBranch",
  }),
  toBranch: one(branch, {
    fields: [transfer.toBranchId],
    references: [branch.id],
    relationName: "toBranch",
  }),
  initiatedBy: one(user, {
    fields: [transfer.initiatedById],
    references: [user.id],
    relationName: "initiatedBy",
  }),
  confirmedBy: one(user, {
    fields: [transfer.confirmedById],
    references: [user.id],
    relationName: "confirmedBy",
  }),
  items: many(transferItem),
}));

export const transferItem = pgTable("transfer_item", {
  id: text("id").primaryKey(),
  transferId: text("transfer_id")
    .notNull()
    .references(() => transfer.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => product.id),
  productName: text("product_name").notNull(),
  qtyRequested: integer("qty_requested").notNull(),
  qtyReceived: integer("qty_received"),
});

export const transferItemRelations = relations(transferItem, ({ one }) => ({
  transfer: one(transfer, {
    fields: [transferItem.transferId],
    references: [transfer.id],
  }),
  product: one(product, {
    fields: [transferItem.productId],
    references: [product.id],
  }),
}));

