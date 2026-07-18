import { Router } from "express";
import { db } from "../db/index.js";
import { notificationLog } from "../db/schema/notification-log.js";
import { product } from "../db/schema/product.js";
import { batch } from "../db/schema/batch.js";
import { eq, desc } from "drizzle-orm";

const router = Router();

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

export default router;
