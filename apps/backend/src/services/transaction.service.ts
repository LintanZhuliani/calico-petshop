// ===================================================
// TRANSACTION SERVICE — POS checkout + reports
// ===================================================

import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  transaction,
  transactionItem,
  product,
} from "../db/schema/index.js";
import { generateId, generateTxId } from "../lib/utils.js";
import { productService } from "./product.service.js";
import { getIo } from "../lib/socket.js";

export const transactionService = {
  async getAll(filters: {
    date?: string; // 'YYYY-MM-DD'
    branchId?: string;
    cashierId?: string;
    status?: string;
  }) {
    // Collect conditions
    const conditions = [];
    if (filters.branchId) {
      conditions.push(eq(transaction.branchId, filters.branchId));
    }
    if (filters.cashierId) {
      conditions.push(eq(transaction.cashierId, filters.cashierId));
    }
    if (filters.status) {
      conditions.push(eq(transaction.status, filters.status));
    }
    
    // We cannot easily filter by YYYY-MM-DD string in raw SQL in a cross-database way without raw sql, 
    // so we will fetch and filter in JS for the date if provided.
    
    const txs = await db.query.transaction.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [sql`${transaction.date} DESC`],
      with: {
        items: true
      }
    });

    if (filters.date) {
      return txs.filter((t) => {
        const txDate = new Date(t.date).toISOString().split("T")[0];
        return txDate === filters.date;
      });
    }

    return txs;
  },

  /** Get a single transaction with items */
  async getById(id: string) {
    const txs = await db
      .select()
      .from(transaction)
      .where(eq(transaction.id, id));
    const tx = txs[0];
    if (!tx) return null;

    const items = await db
      .select()
      .from(transactionItem)
      .where(eq(transactionItem.transactionId, id));

    return { ...tx, items };
  },

  /**
   * POS Checkout — Create transaction and deduct stock.
   * Uses FEFO logic for stock deduction.
   */
  async checkout(data: {
    branchId: string;
    cashierId: string;
    cashierName: string;
    items: Array<{
      productId: string;
      productName: string;
      qty: number;
      price: number;
      buyPrice?: number;
    }>;
    paid: number;
    change: number;
    paymentMethod: string;
    status?: "PENDING" | "COMPLETED";
    customerId?: string;
    customerName?: string;
    orderType?: string;
    pickupDate?: Date;
    additionalFee?: number;
    additionalFeeType?: string;
    additionalFeesDetails?: string;
    dueDate?: Date;
  }) {
    const totalItems = data.items.reduce((s, i) => s + i.price * i.qty, 0);
    const total = totalItems + (data.additionalFee || 0);
    const txId = generateTxId();
    const isPending = data.status === "PENDING";

    // Step 1: Create transaction record FIRST (safe — no stock changes yet)
    const txResult = await db
      .insert(transaction)
      .values({
        id: txId,
        branchId: data.branchId,
        cashierId: data.cashierId,
        cashierName: data.cashierName,
        total,
        paid: data.paid,
        change: data.change,
        paymentMethod: data.paymentMethod || "Tunai",
        status: isPending ? "PENDING" : "COMPLETED",
        customerId: data.customerId || null,
        customerName: data.customerName || null,
        orderType: data.orderType || null,
        pickupDate: data.pickupDate || null,
        additionalFee: data.additionalFee || 0,
        additionalFeesDetails: data.additionalFeesDetails || null,
        dueDate: data.dueDate || null,
      })
      .returning();

    // Step 2: Deduct stock FEFO first to get accurate batch costs (SKIP IF PENDING)
    const deductionResults: { productId: string; totalCost: number; qty: number }[] = [];
    if (!isPending) {
      for (const item of data.items) {
        const result = await productService.deductStockFEFO(
          item.productId,
          data.branchId,
          item.qty,
          db
        );
        if (!result.success) {
          // If we are not using atomic transactions, we ideally should rollback here. 
          // For now, we throw and leave the transaction record (it will be considered failed or we can delete it)
          await db.delete(transaction).where(eq(transaction.id, txId));
          throw Object.assign(
            new Error(`Stok tidak cukup untuk ${item.productName}. Hanya tersedia ${result.deducted} unit.`),
            { statusCode: 400 }
          );
        }
        deductionResults.push({
          productId: item.productId,
          totalCost: result.totalCost,
          qty: item.qty,
        });
      }
    }

    // Step 3: Create transaction items
    const txItems = await Promise.all(
      data.items.map(async (item) => {
        const deduction = deductionResults.find(d => d.productId === item.productId);
        // Use weighted average buyPrice from the actual batches that were deducted
        const buyPrice = deduction && deduction.qty > 0
          ? Math.round(deduction.totalCost / deduction.qty)
          : 0;

        const result = await db
          .insert(transactionItem)
          .values({
            id: generateId("ti"),
            transactionId: txId,
            productId: item.productId,
            productName: item.productName,
            qty: item.qty,
            price: item.price,
            buyPrice,
          })
          .returning();
        return result[0];
      })
    );

    return { ...txResult[0], items: txItems };
  },

  /** Pay for a pending order */
  async payOrder(id: string, data: { paid: number; change: number; paymentMethod: string }) {
    const tx = await this.getById(id);
    if (!tx) throw new Error("Pesanan tidak ditemukan");
    if (tx.status !== "PENDING") throw new Error("Pesanan tidak dalam status PENDING");

    // 1. Deduct stock for all items now (FEFO) and calculate actual buyPrice
    for (const item of tx.items) {
      const result = await productService.deductStockFEFO(
        item.productId,
        tx.branchId,
        item.qty,
        db
      );
      if (!result.success) {
        throw Object.assign(
          new Error(`Stok tidak cukup untuk ${item.productName}. Hanya tersedia ${result.deducted} unit.`),
          { statusCode: 400 }
        );
      }
      
      const buyPrice = result.qty > 0 ? Math.round(result.totalCost / result.qty) : 0;
      
      // Update the transaction item with new buyPrice
      await db
        .update(transactionItem)
        .set({ buyPrice })
        .where(eq(transactionItem.id, item.id));
    }

    // 2. Mark transaction as COMPLETED
    const [updated] = await db
      .update(transaction)
      .set({
        status: "COMPLETED",
        paid: data.paid,
        change: data.change,
        paymentMethod: data.paymentMethod || "Tunai",
      })
      .where(eq(transaction.id, id))
      .returning();

    getIo()?.emit("DATA_UPDATED");
    return updated;
  },

  /** Cancel a pending order and restore stock */
  async cancelOrder(id: string) {
    const tx = await this.getById(id);
    if (!tx) throw new Error("Pesanan tidak ditemukan");
    if (tx.status !== "PENDING") throw new Error("Hanya pesanan PENDING yang bisa dibatalkan");

    // Because PENDING orders do not deduct stock in the new logic, we don't need to restore stock here!
    
    // 2. Mark transaction as CANCELLED
    const [updated] = await db
      .update(transaction)
      .set({ status: "CANCELLED" })
      .where(eq(transaction.id, id))
      .returning();

    getIo()?.emit("DATA_UPDATED");
    return updated;
  },

  /**
   * Daily summary — total transactions, revenue, breakdown per payment method.
   */
  async getSummary(filters: { date?: string; branchId?: string; cashierId?: string }) {
    // Only include COMPLETED transactions for financial reports
    const txs = await this.getAll({ ...filters, status: "COMPLETED" });

    const total = txs.reduce((s, tx) => s + tx.total, 0);
    const count = txs.length;

    // Calculate total profit (revenue - cost)
    const totalProfit = txs.reduce((s, tx) =>
      s + tx.items.reduce((si, item) =>
        si + (item.price - (item.buyPrice ?? 0)) * item.qty, 0
      ), 0
    );

    // Breakdown per payment method
    const methodBreakdown: Record<
      string,
      { count: number; total: number }
    > = {};
    for (const tx of txs) {
      const method = tx.paymentMethod || "Tunai";
      if (!methodBreakdown[method]) {
        methodBreakdown[method] = { count: 0, total: 0 };
      }
      methodBreakdown[method].count += 1;
      methodBreakdown[method].total += tx.total;
    }

    return {
      date: filters.date || new Date().toISOString().split("T")[0],
      branchId: filters.branchId || "all",
      totalTransactions: count,
      totalRevenue: total,
      totalProfit,
      methodBreakdown,
    };
  },

  /**
   * Export transactions as CSV string.
   */
  async exportCSV(filters: { date?: string; branchId?: string }) {
    const txs = await this.getAll(filters);

    const headers = [
      "ID Transaksi",
      "Tanggal",
      "Waktu",
      "Cabang",
      "Kasir",
      "Total",
      "Metode Bayar",
      "Rincian Item",
    ];

    const rows = txs.map((tx) => {
      const d = new Date(tx.date);
      const itemsStr = tx.items
        .map((i) => `${i.productName} (x${i.qty})`)
        .join("; ");
      return [
        tx.id,
        d.toLocaleDateString("id-ID"),
        d.toLocaleTimeString("id-ID"),
        tx.branchId,
        tx.cashierName,
        tx.total,
        tx.paymentMethod,
        `"${itemsStr}"`,
      ].join(",");
    });

    return [headers.join(","), ...rows].join("\n");
  },

  /**
   * Delete a transaction (admin only) and restore stock
   */
  async delete(id: string) {
    const tx = await this.getById(id);
    if (!tx) throw new Error("Transaksi tidak ditemukan");

    // 1. Restore stock for all items ONLY IF status was COMPLETED
    if (tx.status === "COMPLETED") {
      for (const item of tx.items) {
        await productService.addStock({
          productId: item.productId,
          branchId: tx.branchId,
          qty: item.qty,
          expiredDate: null, // We don't know the exact original expiry, so we append without expiry
        }, db);
      }
    }

    // 2. Delete transaction items
    await db.delete(transactionItem).where(eq(transactionItem.transactionId, id));

    // 3. Delete transaction
    await db.delete(transaction).where(eq(transaction.id, id));

    getIo()?.emit("DATA_UPDATED");
    return true;
  },
};
