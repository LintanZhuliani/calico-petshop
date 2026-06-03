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
import { generateId } from "../lib/utils.js";
import { productService } from "./product.service.js";
import { getIo } from "../lib/socket.js";

export const transactionService = {
  /**
   * List transactions with optional filters.
   */
  async getAll(filters: {
    date?: string; // 'YYYY-MM-DD'
    branchId?: string;
    cashierId?: string;
  }) {
    let txs = await db
      .select()
      .from(transaction)
      .orderBy(sql`${transaction.date} DESC`);

    if (filters.branchId) {
      txs = txs.filter((t) => t.branchId === filters.branchId);
    }
    if (filters.cashierId) {
      txs = txs.filter((t) => t.cashierId === filters.cashierId);
    }
    if (filters.date) {
      txs = txs.filter((t) => {
        const txDate = new Date(t.date).toISOString().split("T")[0];
        return txDate === filters.date;
      });
    }

    // Attach items to each transaction
    const result = await Promise.all(
      txs.map(async (tx) => {
        const items = await db
          .select()
          .from(transactionItem)
          .where(eq(transactionItem.transactionId, tx.id));
        return { ...tx, items };
      })
    );

    return result;
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
  }) {
    const total = data.items.reduce((s, i) => s + i.price * i.qty, 0);
    const txId = generateId("tx");

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
      })
      .returning();

    // Step 2: Create transaction items (with buyPrice snapshot)
    const txItems = await Promise.all(
      data.items.map(async (item) => {
        let buyPrice = item.buyPrice ?? 0;
        if (!buyPrice) {
          const prod = await db.select().from(product).where(eq(product.id, item.productId));
          buyPrice = prod[0]?.buyPrice ?? 0;
        }
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

    // Step 3: Deduct stock FEFO — only AFTER transaction is saved
    try {
      for (const item of data.items) {
        const result = await productService.deductStockFEFO(
          item.productId,
          data.branchId,
          item.qty
        );
        if (!result.success) {
          throw Object.assign(
            new Error(
              `Stok tidak cukup untuk ${item.productName}. Hanya tersedia ${result.deducted} unit.`
            ),
            { statusCode: 400 }
          );
        }
      }
    } catch (err) {
      // Rollback: hapus transaksi yang sudah dibuat jika stok gagal
      await db.delete(transactionItem).where(eq(transactionItem.transactionId, txId));
      await db.delete(transaction).where(eq(transaction.id, txId));
      throw err;
    }

    return { ...txResult[0], items: txItems };
  },

  /**
   * Daily summary — total transactions, revenue, breakdown per payment method.
   */
  async getSummary(filters: { date?: string; branchId?: string }) {
    const txs = await this.getAll(filters);

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
};
