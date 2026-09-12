import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { rekapKasir, user, transaction, transactionItem } from "../db/schema/index.js";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { generateId } from "../lib/utils.js";

const router = Router();

// POST /api/rekap - Simpan data rekap harian
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { branchId, startTime, endTime, modalAwal, totalCash, totalNonCash, totalRevenue, totalTransactions, uangFisik, selisih, pengeluaran } = req.body;
    const userId = req.user!.id;
    const cashierName = req.user!.name;

    const newRekap = await db.insert(rekapKasir).values({
      id: generateId("rkp"),
      branchId,
      userId,
      cashierName,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      modalAwal,
      totalCash,
      totalNonCash,
      totalRevenue,
      totalTransactions,
      uangFisik,
      selisih,
      pengeluaran: pengeluaran || [],
    }).returning();

    res.status(201).json(newRekap[0]);
  } catch (error) {
    next(error);
  }
});

// GET /api/rekap - Get list of rekaps
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.query;
    let query = db.select().from(rekapKasir).orderBy(desc(rekapKasir.createdAt));
    
    // Admin can filter by branch. Cashier can only see their own (or their branch).
    if (req.user!.role === 'admin') {
      if (branchId) {
        query = db.select().from(rekapKasir).where(eq(rekapKasir.branchId, branchId as string)).orderBy(desc(rekapKasir.createdAt)) as any;
      }
    } else {
      // If cashier, only see their branch's recaps (or just their own)
      query = db.select().from(rekapKasir).where(eq(rekapKasir.branchId, req.user!.branchId!)).orderBy(desc(rekapKasir.createdAt)) as any;
    }

    const rekaps = await query;
    res.json(rekaps);
  } catch (error) {
    next(error);
  }
});

export default router;
