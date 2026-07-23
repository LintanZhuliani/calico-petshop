// ===================================================
// TRANSACTION ROUTES — /api/transactions
// ===================================================

import { Router } from "express";
import { transactionService } from "../services/transaction.service.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// GET /api/transactions/summary — Daily summary
router.get("/summary", requireAuth, async (req, res, next) => {
  try {
    const summary = await transactionService.getSummary({
      date: req.query.date as string,
      branchId: (req.query.branchId as string) || req.user!.branchId || undefined,
      cashierId: req.user!.role === 'admin' ? (req.query.cashierId as string) : req.user!.id,
    });
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

// GET /api/transactions/export/csv — CSV export (Admin only)
router.get("/export/csv", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const csv = await transactionService.exportCSV({
      date: req.query.date as string,
      branchId: req.query.branchId as string,
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="laporan_${req.query.date || "all"}.csv"`
    );
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// GET /api/transactions — List transactions
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const txs = await transactionService.getAll({
      date: req.query.date as string,
      branchId: (req.query.branchId as string) || req.user!.branchId || undefined,
      cashierId: req.user!.role === 'admin' ? (req.query.cashierId as string) : req.user!.id,
    });
    res.json(txs);
  } catch (err) {
    next(err);
  }
});

// GET /api/transactions/:id — Get single transaction
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const tx = await transactionService.getById(req.params.id as string);
    if (!tx) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }
    res.json(tx);
  } catch (err) {
    next(err);
  }
});

// POST /api/transactions — POS Checkout
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { items, paid, change, paymentMethod, branchId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Cart items are required" });
      return;
    }

    const tx = await transactionService.checkout({
      branchId: branchId || req.user!.branchId!,
      cashierId: req.user!.id,
      cashierName: req.user!.name,
      items,
      paid: Number(paid),
      change: Number(change),
      paymentMethod: paymentMethod || "Tunai",
    });

    res.status(201).json(tx);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/transactions/:id — Delete transaction (Admin only)
router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await transactionService.delete(req.params.id as string);
    res.json({ success: true, message: "Transaksi berhasil dihapus" });
  } catch (err) {
    next(err);
  }
});

export default router;
