// ===================================================
// REPORT SERVICE — Monthly sales aggregations
// ===================================================

import { eq, and, sql, gte, lte, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { transaction, transactionItem } from "../db/schema/index.js";

export const reportService = {
  /**
   * Get monthly sales aggregated by day
   */
  async getMonthlySales(year: number, month: number, branchId?: string) {
    // Note: month is 0-indexed in JS dates, but 1-indexed for users usually. 
    // Assuming month param is 0-11
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    let query = db.select({
      day: sql<number>`EXTRACT(DAY FROM ${transaction.date})`,
      total: sql<number>`sum(${transaction.total})`,
      count: sql<number>`count(*)`
    })
    .from(transaction)
    .where(and(
      gte(transaction.date, startDate),
      lte(transaction.date, endDate),
      branchId ? eq(transaction.branchId, branchId) : undefined
    ))
    .groupBy(sql`EXTRACT(DAY FROM ${transaction.date})`)
    .orderBy(sql`EXTRACT(DAY FROM ${transaction.date})`);

    const results = await query;
    return results;
  },

  /**
   * Get all transactions for a specific month for CSV export
   */
  async getMonthlyTransactions(year: number, month: number, branchId?: string) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    let query = db.select()
      .from(transaction)
      .where(and(
        gte(transaction.date, startDate),
        lte(transaction.date, endDate),
        branchId ? eq(transaction.branchId, branchId) : undefined
      ))
      .orderBy(transaction.date);

    const txs = await query;
    
    // For CSV, we might want to include items
    // Fetch items for all these transactions
    if (txs.length === 0) return [];

    const txIds = txs.map(t => t.id);
    const itemsQuery = await db.select()
      .from(transactionItem)
      .where(inArray(transactionItem.transactionId, txIds));
      
    // Group items by tx
    const itemsByTx: Record<string, any[]> = {};
    for (const item of itemsQuery) {
      if (!itemsByTx[item.transactionId]) itemsByTx[item.transactionId] = [];
      itemsByTx[item.transactionId].push(item);
    }

    return txs.map(tx => ({
      ...tx,
      items: itemsByTx[tx.id] || []
    }));
  }
};
