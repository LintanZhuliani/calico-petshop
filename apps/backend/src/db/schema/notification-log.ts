import { pgTable, text, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { branch } from "./branch.js";
import { product } from "./product.js";
import { batch } from "./batch.js";
import { generateId } from "../../lib/utils.js";

export const notificationLog = pgTable("notification_log", {
  id: text("id").primaryKey().$defaultFn(() => generateId("nl")),
  branchId: text("branch_id").notNull(),
  type: text("type").notNull(), // 'expiry_30', 'expiry_7', 'expired', 'out_of_stock'
  message: text("message").notNull(),
  productId: text("product_id").notNull(),
  batchId: text("batch_id"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  unqBatchType: uniqueIndex("unq_batch_type").on(t.batchId, t.type),
}));

export const notificationLogRelations = relations(notificationLog, ({ one }) => ({
  branch: one(branch, { fields: [notificationLog.branchId], references: [branch.id] }),
  product: one(product, { fields: [notificationLog.productId], references: [product.id] }),
  batch: one(batch, { fields: [notificationLog.batchId], references: [batch.id] }),
}));
