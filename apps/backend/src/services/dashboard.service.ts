// ===================================================
// DASHBOARD SERVICE — Summary metrics & alerts
// ===================================================

import { eq, and, sql, gte, lt } from "drizzle-orm";
import { db } from "../db/index.js";
import { product, branchStock, batch, transaction, transactionItem } from "../db/schema/index.js";

export const dashboardService = {
  /**
   * Get dashboard summary (Total products, total stock, today's revenue, today's transactions)
   */
  async getSummary(branchId?: string, cashierId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Total products
    const totalProductsResult = await db.select({ count: sql<number>`count(*)` }).from(product);
    const totalProducts = Number(totalProductsResult[0]?.count || 0);

    // 2. Total stock (all batches)
    let totalStockQuery = db.select({ total: sql<number>`sum(${batch.qty})` })
      .from(batch)
      .leftJoin(branchStock, eq(batch.branchStockId, branchStock.id));
    
    if (branchId) {
      totalStockQuery = totalStockQuery.where(eq(branchStock.branchId, branchId)) as any;
    }
    
    const totalStockResult = await totalStockQuery;
    const totalStock = Number(totalStockResult[0]?.total || 0);

    // 3. Today's Revenue & Transactions
    let todayQuery = db.select({
      revenue: sql<number>`sum(${transaction.total})`,
      count: sql<number>`count(*)`
    })
    .from(transaction)
    .where(and(
      gte(transaction.date, today),
      lt(transaction.date, tomorrow),
      branchId ? eq(transaction.branchId, branchId) : undefined,
      cashierId ? eq(transaction.cashierId, cashierId) : undefined
    ));

    const todayResult = await todayQuery;
    const todayRevenue = Number(todayResult[0]?.revenue || 0);
    const todayTxCount = Number(todayResult[0]?.count || 0);

    return {
      totalProducts,
      totalStock,
      todayRevenue,
      todayTxCount
    };
  },

  /**
   * Get alerts (Low stock & Expiring soon)
   */
  async getAlerts(branchId?: string) {
    // We already have product.service methods for this, but we can aggregate them here or just re-use product service
    // For simplicity, we can fetch them via product service in the controller, or implement here.
    return {
      message: "Alerts should be fetched via /api/products/alerts endpoints"
    };
  }
};
