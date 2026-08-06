// ===================================================
// DASHBOARD SERVICE — Summary metrics & alerts
// ===================================================

import { eq, and, sql, gte, lt, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { product, branchStock, batch, transaction, transfer } from "../db/schema/index.js";
import { daysUntilExpiry } from "../lib/utils.js";

export const dashboardService = {
  async getSummary(branchId?: string, cashierId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // 7 days including today

    // 1. Total products (unarchived)
    const totalProductsResult = await db.select({ count: sql<number>`count(*)` })
      .from(product)
      .where(eq(product.isArchived, false));
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

    // 4. In Transit Transfers
    let transitQuery = db.select({ count: sql<number>`count(*)` })
      .from(transfer)
      .where(and(
        eq(transfer.status, 'transit'),
        branchId ? or(eq(transfer.fromBranchId, branchId), eq(transfer.toBranchId, branchId)) : undefined
      ));
    const transitResult = await transitQuery;
    const inTransitCount = Number(transitResult[0]?.count || 0);

    // 5. Low Stock Count
    // Fetch aggregated stock per product
    let lowStockCount = 0;
    if (branchId) {
      const stockAgg = await db.select({
        productId: branchStock.productId,
        minStock: product.minStock,
        totalStock: sql<number>`sum(case when ${batch.expiredDate} is null or ${batch.expiredDate} > current_date then ${batch.qty} else 0 end)`
      })
      .from(branchStock)
      .innerJoin(product, and(eq(branchStock.productId, product.id), eq(product.isArchived, false)))
      .leftJoin(batch, eq(batch.branchStockId, branchStock.id))
      .where(eq(branchStock.branchId, branchId))
      .groupBy(branchStock.productId, product.minStock);

      lowStockCount = stockAgg.filter(s => Number(s.totalStock || 0) <= s.minStock).length;
    }

    // 6. Expiring Count (<= 30 days)
    let expiringCount = 0;
    if (branchId) {
      const expiringQuery = await db.select({
        expiredDate: batch.expiredDate,
        qty: batch.qty
      })
      .from(batch)
      .innerJoin(branchStock, eq(batch.branchStockId, branchStock.id))
      .innerJoin(product, and(eq(branchStock.productId, product.id), eq(product.isArchived, false)))
      .where(and(
        eq(branchStock.branchId, branchId)
      ));

      expiringCount = expiringQuery.filter(row => {
        if (!row.expiredDate || row.qty <= 0) return false;
        const days = daysUntilExpiry(row.expiredDate);
        return days <= 30 && days >= 0;
      }).length;
    }

    // 7. Last 7 Days Chart Data
    let txQuery = db.select({
      date: transaction.date,
      total: transaction.total
    })
    .from(transaction)
    .where(and(
      gte(transaction.date, sevenDaysAgo),
      branchId ? eq(transaction.branchId, branchId) : undefined,
      cashierId ? eq(transaction.cashierId, cashierId) : undefined
    ));
    
    const recentTxs = await txQuery;
    
    // Group by date string (YYYY-MM-DD)
    const chartMap: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      chartMap[dateStr] = 0;
    }

    for (const tx of recentTxs) {
      const d = new Date(tx.date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      if (chartMap[dateStr] !== undefined) {
        chartMap[dateStr] += cashierId ? 1 : tx.total; // Cashiers see count, admins see revenue
      }
    }

    const chartData = Object.keys(chartMap).sort().map(dateStr => {
      const d = new Date(dateStr);
      return {
        dateStr,
        label: d.toLocaleDateString('id-ID', { weekday: 'short' }),
        total: chartMap[dateStr]
      };
    });

    return {
      totalProducts,
      totalStock,
      todayRevenue,
      todayTxCount,
      inTransitCount,
      lowStockCount,
      expiringCount,
      chartData
    };
  }
};
