import { Router } from "express";
import { db } from "../db/index.js";
import { notificationLog } from "../db/schema/notification-log.js";
import { branchStock } from "../db/schema/branch-stock.js";
import { batch } from "../db/schema/batch.js";
import { product } from "../db/schema/product.js";
import { eq, desc, and, inArray } from "drizzle-orm";
import { daysUntilExpiry } from "../lib/utils.js";

const router = Router();

// GET /notifications/seed
router.get("/seed", async (req, res) => {
  try {
    let count = 0;
    
    // 1. Fetch all batches and branchStocks in a single JOIN
    const results = await db.select({
      batch: batch,
      branchId: branchStock.branchId,
      productId: branchStock.productId
    })
    .from(batch)
    .innerJoin(branchStock, eq(batch.branchStockId, branchStock.id))
    .where(and(
      db.isNotNull(batch.expiredDate),
      db.sql`${batch.qty} > 0`
    ));

    if (results.length === 0) {
      return res.json({ success: true, count: 0 });
    }

    // 2. Fetch all existing notification logs for these batches
    const existingLogs = await db.select({
      batchId: notificationLog.batchId,
      type: notificationLog.type
    })
    .from(notificationLog);
    
    const existingSet = new Set(existingLogs.map(l => `${l.batchId}_${l.type}`));

    // 3. Determine new logs
    const logsToInsert: any[] = [];
    
    for (const row of results) {
      const b = row.batch;
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
        const key = `${b.id}_${type}`;
        if (!existingSet.has(key)) {
          logsToInsert.push({
            branchId: row.branchId,
            productId: row.productId,
            batchId: b.id,
            type: type,
            message: message,
          });
          existingSet.add(key); // Prevent duplicates in the same run
          count++;
        }
      }
    }

    // 4. Bulk insert
    if (logsToInsert.length > 0) {
      await db.insert(notificationLog).values(logsToInsert);
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

// POST /notifications/bulk-delete
router.post("/bulk-delete", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No IDs provided" });
    }
    
    await db.delete(notificationLog).where(inArray(notificationLog.id, ids));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete notifications" });
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
