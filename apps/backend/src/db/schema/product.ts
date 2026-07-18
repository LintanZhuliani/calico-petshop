// ===================================================
// PRODUCT SCHEMA — Global product catalog
// Products are NOT branch-specific. Stock is tracked
// per-branch via the branch_stock table.
// ===================================================

import { pgTable, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { branchStock } from "./branch-stock.js";

export const product = pgTable("product", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  buyPrice: integer("buy_price").default(0),
  price: integer("price").notNull(),
  barcode: text("barcode").unique(),
  image: text("image"), // base64 data URI or URL
  imageEmoji: text("image_emoji"), // Material Symbols icon name fallback
  minStock: integer("min_stock").notNull().default(5),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const productRelations = relations(product, ({ many }) => ({
  branchStocks: many(branchStock),
}));

