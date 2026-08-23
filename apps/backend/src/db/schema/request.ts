// PRODUCT REQUEST SCHEMA

import { pgTable, text, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { branch } from "./branch.js";
import { user } from "./auth.js";

export const requestTypeEnum = pgEnum("request_type", ["RESTOCK", "ADJUSTMENT"]);
export const requestStatusEnum = pgEnum("request_status", ["pending", "approved", "rejected"]);

export const productRequest = pgTable("product_request", {
  id: text("id").primaryKey(), // prq_...
  
  requestType: requestTypeEnum("request_type").notNull(),
  status: requestStatusEnum("status").notNull().default("pending"),
  
  // array of { productId, productName, qty, expiredDate? }
  items: jsonb("items").$type<Array<{
    productId: string;
    productName: string;
    qty: number;
    expiredDate?: string;
  }>>().notNull(),
  
  branchId: text("branch_id")
    .notNull()
    .references(() => branch.id, { onDelete: "cascade" }),
    
  note: text("note"),
  
  // Who requested
  requestedById: text("requested_by_id")
    .notNull()
    .references(() => user.id),
  requestedByName: text("requested_by_name").notNull(),
  
  // Who resolved (Admin)
  resolvedById: text("resolved_by_id")
    .references(() => user.id),
  resolvedByName: text("resolved_by_name"),
  resolvedAt: timestamp("resolved_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productRequestRelations = relations(productRequest, ({ one }) => ({
  branch: one(branch, {
    fields: [productRequest.branchId],
    references: [branch.id],
  }),
  requestedBy: one(user, {
    fields: [productRequest.requestedById],
    references: [user.id],
  }),
  resolvedBy: one(user, {
    fields: [productRequest.resolvedById],
    references: [user.id],
  })
}));
