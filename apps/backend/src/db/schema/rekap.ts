import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { branch } from "./branch.js";
import { user } from "./auth.js";

export const rekapKasir = pgTable("rekap_kasir", {
  id: text("id").primaryKey(),
  branchId: text("branch_id").notNull().references(() => branch.id),
  userId: text("user_id").notNull().references(() => user.id),
  cashierName: text("cashier_name").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  
  modalAwal: integer("modal_awal").notNull().default(0),
  totalCash: integer("total_cash").notNull().default(0),
  totalNonCash: integer("total_non_cash").notNull().default(0),
  totalRevenue: integer("total_revenue").notNull().default(0),
  totalTransactions: integer("total_transactions").notNull().default(0),
  
  uangFisik: integer("uang_fisik").notNull().default(0),
  selisih: integer("selisih").notNull().default(0),
  
  pengeluaran: jsonb("pengeluaran").notNull().default([]), // array of { name: string, amount: number }
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const rekapKasirRelations = relations(rekapKasir, ({ one }) => ({
  branch: one(branch, {
    fields: [rekapKasir.branchId],
    references: [branch.id],
  }),
  user: one(user, {
    fields: [rekapKasir.userId],
    references: [user.id],
  }),
}));
