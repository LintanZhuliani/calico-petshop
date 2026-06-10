// ===================================================
// PRODUCT SERVICE — Global catalog + branch stock + batch
// Includes FEFO (First Expired, First Out) logic
// ===================================================

import { eq, and, like, sql, isNull, lte, gte, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  product,
  branchStock,
  batch,
} from "../db/schema/index.js";
import { generateId, daysUntilExpiry } from "../lib/utils.js";
import { uploadBase64Image } from "../lib/cloudinary.js";
import { getIo } from "../lib/socket.js";

export const productService = {
  /**
   * List all products with optional filters.
   * If branchId is provided, include stock info for that branch.
   */
  async getAll(filters: {
    search?: string;
    category?: string;
    branchId?: string;
    status?: "critical" | "empty";
  }) {
    // Get all products
    let products = await db.select().from(product);

    // Apply search filter
    if (filters.search) {
      const s = filters.search.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          (p.barcode && p.barcode.includes(s))
      );
    }

    // Apply category filter
    if (filters.category) {
      products = products.filter((p) => p.category === filters.category);
    }

    // If branchId provided, include stock data
    if (filters.branchId) {
      const stockData = await this.getBranchStockForProducts(
        products.map((p) => p.id),
        filters.branchId
      );

      const enriched = products.map((p) => {
        const stock = stockData.find((s) => s.productId === p.id);
        let totalQty = 0;
        let expiredQty = 0;
        if (stock) {
          stock.batches.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          stock.batches.forEach(b => {
             if (b.expiredDate && daysUntilExpiry(b.expiredDate) <= 0) {
                 expiredQty += b.qty;
             } else {
                 totalQty += b.qty;
             }
          });
        }
        return { ...p, totalStock: totalQty, expiredStock: expiredQty, batches: stock?.batches || [] };
      });

      // Apply stock status filters
      if (filters.status === "critical") {
        return enriched.filter(
          (p) => p.totalStock <= p.minStock && p.totalStock > 0
        );
      }
      if (filters.status === "empty") {
        return enriched.filter((p) => p.totalStock === 0);
      }

      return enriched;
    }

    return products;
  },

  /** Get a single product by ID with stock data for a specific branch */
  async getById(id: string, branchId?: string) {
    const results = await db.select().from(product).where(eq(product.id, id));
    const p = results[0];
    if (!p) return null;

    if (branchId) {
      const stockData = await this.getBranchStockForProducts([id], branchId);
      const stock = stockData[0];
      let totalQty = 0;
      let expiredQty = 0;
      if (stock) {
        stock.batches.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        stock.batches.forEach(b => {
           if (b.expiredDate && daysUntilExpiry(b.expiredDate) <= 0) {
               expiredQty += b.qty;
           } else {
               totalQty += b.qty;
           }
        });
      }
      return {
        ...p,
        totalStock: totalQty,
        expiredStock: expiredQty,
        batches: stock?.batches || [],
      };
    }

    // Return product with all branch stocks
    const allStocks = await db
      .select()
      .from(branchStock)
      .where(eq(branchStock.productId, id));

    const stocksWithBatches = await Promise.all(
      allStocks.map(async (bs) => {
        const batches = await db
          .select()
          .from(batch)
          .where(eq(batch.branchStockId, bs.id));
          let totalQty = 0;
          let expiredQty = 0;
          batches.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          batches.forEach(b => {
             if (b.expiredDate && daysUntilExpiry(b.expiredDate) <= 0) {
                 expiredQty += b.qty;
             } else {
                 totalQty += b.qty;
             }
          });
          return {
            ...bs,
            batches,
            totalStock: totalQty,
            expiredStock: expiredQty,
          };
      })
    );

    return { ...p, branchStocks: stocksWithBatches };
  },

  /** Find product by barcode */
  async getByBarcode(barcode: string, branchId?: string) {
    const results = await db
      .select()
      .from(product)
      .where(eq(product.barcode, barcode));
    const p = results[0];
    if (!p) return null;

    if (branchId) {
      return this.getById(p.id, branchId);
    }
    return p;
  },

  /** Create a new product (global catalog) */
  async create(data: {
    name: string;
    category: string;
    buyPrice?: number;
    price: number;
    barcode?: string;
    image?: string;
    imageEmoji?: string;
    minStock?: number;
  }) {
    if (data.image) {
      data.image = await uploadBase64Image(data.image);
    }

    const id = generateId("p");
    const results = await db
      .insert(product)
      .values({
        id,
        name: data.name,
        category: data.category,
        buyPrice: data.buyPrice || 0,
        price: data.price,
        barcode: data.barcode || null,
        image: data.image || null,
        imageEmoji: data.imageEmoji || null,
        minStock: data.minStock || 5,
      })
      .returning();
      
    getIo()?.emit("DATA_UPDATED");
    return results[0];
  },

  /** Update product info */
  async update(
    id: string,
    data: Partial<{
      name: string;
      category: string;
      buyPrice: number;
      price: number;
      barcode: string;
      image: string;
      imageEmoji: string;
      minStock: number;
    }>
  ) {
    if (data.image) {
      data.image = await uploadBase64Image(data.image);
    }

    const results = await db
      .update(product)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(product.id, id))
      .returning();
      
    getIo()?.emit("DATA_UPDATED");
    return results[0] || null;
  },

  /** Delete a product */
  async delete(id: string) {
    try {
      const results = await db
        .delete(product)
        .where(eq(product.id, id))
        .returning();
        
      getIo()?.emit("DATA_UPDATED");
      return results[0] || null;
    } catch (err: any) {
      if (err.code === "23503") {
        throw Object.assign(
          new Error("Produk ini tidak bisa dihapus karena sudah memiliki riwayat transaksi."),
          { statusCode: 400 }
        );
      }
      throw err;
    }
  },

  /**
   * Add stock batch to a product at a specific branch.
   * Auto-creates branch_stock if not exists.
   */
  async addStock(data: {
    productId: string;
    branchId: string;
    qty: number;
    expiredDate?: string | null;
  }) {
    // Find or create branch_stock
    let bs = await db
      .select()
      .from(branchStock)
      .where(
        and(
          eq(branchStock.productId, data.productId),
          eq(branchStock.branchId, data.branchId)
        )
      );

    let branchStockId: string;
    if (bs.length === 0) {
      const newBs = await db
        .insert(branchStock)
        .values({
          id: generateId("bs"),
          productId: data.productId,
          branchId: data.branchId,
        })
        .returning();
      branchStockId = newBs[0].id;
    } else {
      branchStockId = bs[0].id;
    }

    // Add batch
    const newBatch = await db
      .insert(batch)
      .values({
        id: generateId("b"),
        branchStockId,
        qty: data.qty,
        expiredDate: data.expiredDate || null,
        receivedDate: new Date().toISOString().split("T")[0],
      })
      .returning();

    getIo()?.emit("DATA_UPDATED");
    return newBatch[0];
  },

  /**
   * Update a batch's quantity (admin stock correction).
   * Only affects the specific batch at a specific branch.
   */
  async updateBatchQty(batchId: string, newQty: number) {
    if (newQty <= 0) {
      // If qty is 0 or negative, delete the batch
      return this.deleteBatch(batchId);
    }
    const results = await db
      .update(batch)
      .set({ qty: newQty })
      .where(eq(batch.id, batchId))
      .returning();
    return results[0] || null;
  },

  /**
   * Delete a specific batch (admin stock correction).
   */
  async deleteBatch(batchId: string) {
    const results = await db
      .delete(batch)
      .where(eq(batch.id, batchId))
      .returning();
        
    getIo()?.emit("DATA_UPDATED");
    return results[0] || null;
  },

  /**
   * FEFO: Deduct stock from a product at a branch.
   * Deducts from batches with earliest expiry first.
   */
  async deductStockFEFO(
    productId: string,
    branchId: string,
    qtyToDeduct: number
  ): Promise<{ success: boolean; deducted: number }> {
    // Get branch_stock
    const bsResult = await db
      .select()
      .from(branchStock)
      .where(
        and(
          eq(branchStock.productId, productId),
          eq(branchStock.branchId, branchId)
        )
      );

    if (bsResult.length === 0) {
      return { success: false, deducted: 0 };
    }

    const branchStockId = bsResult[0].id;

    // Get all batches, sorted FEFO
    const batches = await db
      .select()
      .from(batch)
      .where(eq(batch.branchStockId, branchStockId));

    // Sort: earliest expiry first, null expiry last
    batches.sort((a, b) => {
      if (!a.expiredDate) return 1;
      if (!b.expiredDate) return -1;
      return (
        new Date(a.expiredDate).getTime() - new Date(b.expiredDate).getTime()
      );
    });

    let remaining = qtyToDeduct;
    for (const b of batches) {
      if (remaining <= 0) break;
      // Skip expired batches in FEFO, cannot sell expired items!
      if (b.expiredDate && daysUntilExpiry(b.expiredDate) <= 0) continue;

      const deduct = Math.min(b.qty, remaining);
      remaining -= deduct;
      const newQty = b.qty - deduct;

      if (newQty <= 0) {
        // Remove empty batch
        await db.delete(batch).where(eq(batch.id, b.id));
      } else {
        await db
          .update(batch)
          .set({ qty: newQty })
          .where(eq(batch.id, b.id));
      }
    }

    getIo()?.emit("DATA_UPDATED");
    return { success: remaining <= 0, deducted: qtyToDeduct - remaining };
  },

  /** Get low-stock products at a branch */
  async getLowStock(branchId: string) {
    const products = await this.getAll({ branchId });
    return (products as any[]).filter(
      (p: any) => p.totalStock <= p.minStock
    );
  },

  /** Get expiring batches at a branch within N days */
  async getExpiringBatches(branchId: string, withinDays: number = 90) {
    // Get all branch_stocks for this branch
    const bsResults = await db
      .select()
      .from(branchStock)
      .where(eq(branchStock.branchId, branchId));

    const alerts: any[] = [];

    for (const bs of bsResults) {
      const batches = await db
        .select()
        .from(batch)
        .where(eq(batch.branchStockId, bs.id));

      // Get product info
      const prodResult = await db
        .select()
        .from(product)
        .where(eq(product.id, bs.productId));
      const prod = prodResult[0];

      for (const b of batches) {
        if (!b.expiredDate) continue;
        const days = daysUntilExpiry(b.expiredDate);
        if (days <= withinDays) {
          alerts.push({
            product: prod,
            batch: b,
            branchId: bs.branchId,
            daysLeft: days,
          });
        }
      }
    }

    return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  },

  /** Helper: get branch stock with batches for multiple products at a branch */
  async getBranchStockForProducts(productIds: string[], branchId: string) {
    if (productIds.length === 0) return [];

    const stocks = await db.query.branchStock.findMany({
      where: and(
        eq(branchStock.branchId, branchId),
        inArray(branchStock.productId, productIds)
      ),
      with: {
        batches: true
      }
    });

    return stocks;
  },
};
