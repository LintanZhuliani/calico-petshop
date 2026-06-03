// ===================================================
// TRANSFER SERVICE — Inter-branch stock transfers
// ===================================================

import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { transfer, transferItem } from "../db/schema/index.js";
import { generateId } from "../lib/utils.js";
import { productService } from "./product.service.js";

export const transferService = {
  /**
   * List transfers with optional filters.
   */
  async getAll(filters: {
    branchId?: string;
    status?: string;
    direction?: "incoming" | "outgoing";
    month?: number; // 0-11
    year?: number;
  }) {
    let transfers = await db
      .select()
      .from(transfer)
      .orderBy(sql`${transfer.createdAt} DESC`);

    if (filters.year !== undefined && filters.month !== undefined) {
      const startDate = new Date(filters.year, filters.month, 1);
      const endDate = new Date(filters.year, filters.month + 1, 0, 23, 59, 59, 999);
      transfers = transfers.filter(
        (t) => t.createdAt >= startDate && t.createdAt <= endDate
      );
    }

    if (filters.branchId) {
      if (filters.direction === "incoming") {
        transfers = transfers.filter(
          (t) => t.toBranchId === filters.branchId
        );
      } else if (filters.direction === "outgoing") {
        transfers = transfers.filter(
          (t) => t.fromBranchId === filters.branchId
        );
      } else {
        transfers = transfers.filter(
          (t) =>
            t.fromBranchId === filters.branchId ||
            t.toBranchId === filters.branchId
        );
      }
    }

    if (filters.status) {
      transfers = transfers.filter((t) => t.status === filters.status);
    }

    // Attach items
    const result = await Promise.all(
      transfers.map(async (tr) => {
        const items = await db
          .select()
          .from(transferItem)
          .where(eq(transferItem.transferId, tr.id));
        return { ...tr, items };
      })
    );

    return result;
  },

  /** Get a single transfer with items */
  async getById(id: string) {
    const trs = await db
      .select()
      .from(transfer)
      .where(eq(transfer.id, id));
    const tr = trs[0];
    if (!tr) return null;

    const items = await db
      .select()
      .from(transferItem)
      .where(eq(transferItem.transferId, id));

    return { ...tr, items };
  },

  /** Get incoming in-transit transfers for a branch */
  async getIncoming(branchId: string) {
    return this.getAll({
      branchId,
      status: "transit",
      direction: "incoming",
    });
  },

  /**
   * Create a new transfer (Admin).
   * Deducts stock from the source branch.
   */
  async create(data: {
    fromBranchId: string;
    toBranchId: string;
    initiatedById: string;
    initiatedByName: string;
    note?: string;
    items: Array<{
      productId: string;
      productName: string;
      qty: number;
    }>;
  }) {
    const trId = generateId("tr");

    // Deduct stock from source branch for each item
    for (const item of data.items) {
      const result = await productService.deductStockFEFO(
        item.productId,
        data.fromBranchId,
        item.qty
      );
      if (!result.success) {
        throw Object.assign(
          new Error(
            `Insufficient stock at source branch for ${item.productName}. Only ${result.deducted} available.`
          ),
          { statusCode: 400 }
        );
      }
    }

    // Create transfer record
    const trResult = await db
      .insert(transfer)
      .values({
        id: trId,
        fromBranchId: data.fromBranchId,
        toBranchId: data.toBranchId,
        initiatedById: data.initiatedById,
        initiatedByName: data.initiatedByName,
        status: "transit",
        note: data.note || null,
      })
      .returning();

    // Create transfer items
    const trItems = await Promise.all(
      data.items.map(async (item) => {
        const result = await db
          .insert(transferItem)
          .values({
            id: generateId("tri"),
            transferId: trId,
            productId: item.productId,
            productName: item.productName,
            qtyRequested: item.qty,
            qtyReceived: null,
          })
          .returning();
        return result[0];
      })
    );

    return { ...trResult[0], items: trItems };
  },

  /**
   * Confirm receipt of transfer (Kasir).
   * Updates status and adds stock to destination branch.
   */
  async confirmReceipt(data: {
    transferId: string;
    confirmedById: string;
    confirmedByName: string;
    receivedItems: Array<{
      productId: string;
      qtyReceived: number;
    }>;
  }) {
    // Get the transfer
    const tr = await this.getById(data.transferId);
    if (!tr) {
      throw Object.assign(new Error("Transfer not found"), {
        statusCode: 404,
      });
    }
    if (tr.status !== "transit") {
      throw Object.assign(
        new Error("Transfer is not in transit status"),
        { statusCode: 400 }
      );
    }

    // Check for discrepancy
    let hasDiscrepancy = false;
    for (const item of tr.items) {
      const received = data.receivedItems.find(
        (r) => r.productId === item.productId
      );
      const qtyReceived = received
        ? received.qtyReceived
        : item.qtyRequested;

      if (qtyReceived !== item.qtyRequested) {
        hasDiscrepancy = true;
      }

      // Update transfer item with received qty
      await db
        .update(transferItem)
        .set({ qtyReceived })
        .where(eq(transferItem.id, item.id));

      // Add received stock to destination branch
      if (qtyReceived > 0) {
        await productService.addStock({
          productId: item.productId,
          branchId: tr.toBranchId,
          qty: qtyReceived,
        });
      }
    }

    // Update transfer status
    const updated = await db
      .update(transfer)
      .set({
        status: hasDiscrepancy ? "discrepancy" : "completed",
        confirmedById: data.confirmedById,
        confirmedByName: data.confirmedByName,
        confirmedAt: new Date(),
      })
      .where(eq(transfer.id, data.transferId))
      .returning();

    return this.getById(data.transferId);
  },
};
