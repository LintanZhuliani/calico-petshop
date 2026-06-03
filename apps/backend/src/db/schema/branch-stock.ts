// ===================================================
// BRANCH_STOCK SCHEMA — Product × Branch junction
// Each row represents a product being stocked at a
// specific branch. Batches belong to branch_stock.
// ===================================================

import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { product } from "./product";
import { branch } from "./branch";
import { batch } from "./batch";

export const branchStock = pgTable(
  "branch_stock",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    branchId: text("branch_id")
      .notNull()
      .references(() => branch.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.productId, table.branchId)]
);

export const branchStockRelations = relations(branchStock, ({ one, many }) => ({
  product: one(product, {
    fields: [branchStock.productId],
    references: [product.id],
  }),
  branch: one(branch, {
    fields: [branchStock.branchId],
    references: [branch.id],
  }),
  batches: many(batch),
}));
