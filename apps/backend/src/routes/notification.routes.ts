import { Router } from "express";
import { db } from "../db/index.js";
import { notificationLog } from "../db/schema/notification-log.js";
import { branchStock } from "../db/schema/branch-stock.js";
import { batch } from "../db/schema/batch.js";
import { product } from "../db/schema/product.js";
import { eq, desc, and } from "drizzle-orm";
import { daysUntilExpiry } from "../lib/utils.js";

const router = Router();

// GET /notifications/seed
router.get("/seed", async (req, res) => {
  try {
    let count = 0;
    const bsResults = await db.select().from(branchStock);
    for (const bs of bsResults) {
      const batches = await db.select().from(batch).where(eq(batch.branchStockId, bs.id));
      for (const b of batches) {
        if (!b.expiredDate || b.qty <= 0) continue;
        
        const days = daysUntilExpiry(b.expiredDate);
        let type = '';
        let message = '';
        
        if (days <= 0) {
          type = 'expired';
          message = `Telah Kadaluarsa sejak ${Math.abs(days)} hari yang lalu`;
        } else if (days <= 7) {
          type = 'expiry_7';
          message = `Akan Kadaluarsa dalam ${days} hari (1 Minggu)`;
        } else if (days <= 30) {
          type = 'expiry_30';
          message = `Akan Kadaluarsa dalam ${days} hari (1 Bulan)`;
        }

        if (type) {
          const existing = await db.select().from(notificationLog).where(
            and(
              eq(notificationLog.batchId, b.id),
              eq(notificationLog.type, type)
            )
          );
          if (existing.length === 0) {
            await db.insert(notificationLog).values({
              branchId: bs.branchId,
              productId: bs.productId,
              batchId: b.id,
              type: type,
              message: message,
            });
            count++;
          }
        }
      }
    }
    res.json({ success: true, count });
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /notifications?branchId=xyz
router.get("/", async (req, res) => {
  try {
    const { branchId } = req.query;
    if (!branchId || typeof branchId !== 'string') {
      return res.status(400).json({ error: "branchId is required" });
    }

    const logs = await db
      .select({
        id: notificationLog.id,
        type: notificationLog.type,
        message: notificationLog.message,
        isRead: notificationLog.isRead,
        createdAt: notificationLog.createdAt,
        product: product,
        batch: batch,
      })
      .from(notificationLog)
      .leftJoin(product, eq(notificationLog.productId, product.id))
      .leftJoin(batch, eq(notificationLog.batchId, batch.id))
      .where(eq(notificationLog.branchId, branchId))
      .orderBy(desc(notificationLog.createdAt))
      .limit(100);

    // Compute session index for each log that has a batch
    const productIds = Array.from(new Set(logs.map(l => l.product?.id).filter(Boolean)));
    if (productIds.length > 0) {
      const { branchStock } = await import('../db/schema/branch-stock.js');
      const { inArray } = await import('drizzle-orm');
      
      const allBatches = await db.select({
        id: batch.id,
        productId: branchStock.productId,
        createdAt: batch.createdAt
      })
      .from(batch)
      .innerJoin(branchStock, eq(batch.branchStockId, branchStock.id))
      .where(inArray(branchStock.productId, productIds as string[]));

      const productBatches: Record<string, any[]> = {};
      allBatches.forEach(b => {
        if (!productBatches[b.productId]) productBatches[b.productId] = [];
        productBatches[b.productId].push(b);
      });

      for (const log of logs) {
        if (log.batch && log.product) {
          const pBatches = productBatches[log.product.id];
          if (pBatches) {
            pBatches.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            const idx = pBatches.findIndex(b => b.id === log.batch?.id);
            if (idx !== -1) {
              (log as any).sessionIndex = idx + 1;
            }
          }
        }
      }
    }

    res.json(logs);
  } catch (error) {
    console.error("Fetch notifications error:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// PATCH /notifications/:id/read
router.patch("/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    await db.update(notificationLog).set({ isRead: true }).where(eq(notificationLog.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update notification" });
  }
});

// DELETE /notifications/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(notificationLog).where(eq(notificationLog.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

export default router;
