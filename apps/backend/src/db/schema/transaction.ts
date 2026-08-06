// ===================================================
// TRANSACTION SCHEMA — Sales transactions (POS)
// ===================================================

import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { branch } from "./branch.js";
import { user } from "./auth.js";
import { product } from "./product.js";
import { customer } from "./customer.js";

export const transaction = pgTable("transaction", {
  id: text("id").primaryKey(),
  branchId: text("branch_id")
    .notNull()
    .references(() => branch.id),
  cashierId: text("cashier_id")
    .notNull()
    .references(() => user.id),
  cashierName: text("cashier_name").notNull(),
  total: integer("total").notNull(),
  paid: integer("paid").notNull(),
  change: integer("change").notNull().default(0),
  paymentMethod: text("payment_method").notNull().default("Tunai"),
  date: timestamp("date").notNull().defaultNow(),
  status: text("status").notNull().default("COMPLETED"), // PENDING, COMPLETED, CANCELLED
  customerId: text("customer_id"),
  customerName: text("customer_name"),
  orderType: text("order_type"),
  pickupDate: timestamp("pickup_date"),
  additionalFee: integer("additional_fee").notNull().default(0),
  additionalFeesDetails: text("additional_fees_details"), // JSON stringified array of {name, amount}
  dueDate: timestamp("due_date"),
});

export const transactionRelations = relations(transaction, ({ one, many }) => ({
  branch: one(branch, {
    fields: [transaction.branchId],
    references: [branch.id],
  }),
  cashier: one(user, {
    fields: [transaction.cashierId],
    references: [user.id],
  }),
  customer: one(customer, {
    fields: [transaction.customerId],
    references: [customer.id],
  }),
  items: many(transactionItem),
}));

export const transactionItem = pgTable("transaction_item", {
  id: text("id").primaryKey(),
  transactionId: text("transaction_id")
    .notNull()
    .references(() => transaction.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => product.id),
  productName: text("product_name").notNull(),
  qty: integer("qty").notNull(),
  price: integer("price").notNull(),
  buyPrice: integer("buy_price").notNull().default(0),
});

export const transactionItemRelations = relations(
  transactionItem,
  ({ one }) => ({
    transaction: one(transaction, {
      fields: [transactionItem.transactionId],
      references: [transaction.id],
    }),
    product: one(product, {
      fields: [transactionItem.productId],
      references: [product.id],
    }),
  })
);

