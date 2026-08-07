import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { transaction } from "./transaction.js";

export const customer = pgTable("customer", {
  id: text("id").primaryKey(),
  branchId: text("branch_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customerRelations = relations(customer, ({ many }) => ({
  transactions: many(transaction),
}));
