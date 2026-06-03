// ===================================================
// TRANSFER ROUTES — /api/transfers
// ===================================================

import { Router } from "express";
import { transferService } from "../services/transfer.service.js";
import { getIo } from "../lib/socket.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// GET /api/transfers/incoming — In-transit transfers for kasir's branch
router.get("/incoming", requireAuth, async (req, res, next) => {
  try {
    const branchId = req.user!.branchId;
    if (!branchId) {
      res.status(400).json({ error: "User has no branch assigned" });
      return;
    }
    const transfers = await transferService.getIncoming(branchId);
    res.json(transfers);
  } catch (err) {
    next(err);
  }
});

// GET /api/transfers — List transfers
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;

    const transfers = await transferService.getAll({
      branchId: (req.query.branchId as string) || req.user!.branchId || undefined,
      status: req.query.status as string,
      direction: req.query.direction as "incoming" | "outgoing" | undefined,
      year: !isNaN(year!) ? year : undefined,
      month: !isNaN(month!) ? month : undefined,
    });
    res.json(transfers);
  } catch (err) {
    next(err);
  }
});

// GET /api/transfers/export/csv — Export transfers as CSV (Admin only)
router.get("/export/csv", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;

    const transfers = await transferService.getAll({
      branchId: req.query.branchId as string | undefined,
      status: req.query.status as string,
      direction: req.query.direction as "incoming" | "outgoing" | undefined,
      year: !isNaN(year!) ? year : undefined,
      month: !isNaN(month!) ? month : undefined,
    });

    const headers = [
      "ID",
      "Tanggal",
      "Dari",
      "Ke",
      "Status",
      "Inisiator",
      "Dikonfirmasi Oleh",
      "Waktu Konfirmasi",
      "Catatan",
      "Items (Requested/Received)"
    ];

    const rows = transfers.map(t => {
      const itemsStr = t.items.map(i => `${i.productName} (${i.qtyRequested}/${i.qtyReceived || 0})`).join(" | ");
      return [
        t.id,
        new Date(t.createdAt).toISOString(),
        t.fromBranchId,
        t.toBranchId,
        t.status,
        t.initiatedByName,
        t.confirmedByName || "",
        t.confirmedAt ? new Date(t.confirmedAt).toISOString() : "",
        `"${t.note || ""}"`,
        `"${itemsStr}"`
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    let filename = "transfer_history.csv";
    if (year && month !== undefined) {
      filename = `transfer_history_${year}_${month + 1}.csv`;
    }
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
});

// GET /api/transfers/:id — Get single transfer
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const transfer = await transferService.getById(req.params.id as string);
    if (!transfer) {
      res.status(404).json({ error: "Transfer not found" });
      return;
    }
    res.json(transfer);
  } catch (err) {
    next(err);
  }
});

// POST /api/transfers — Create transfer (Admin only)
router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { fromBranchId, toBranchId, note, items } = req.body;

    if (!fromBranchId || !toBranchId || !items || items.length === 0) {
      res.status(400).json({
        error: "fromBranchId, toBranchId, and items are required",
      });
      return;
    }

    if (fromBranchId === toBranchId) {
      res.status(400).json({ error: "Cannot transfer to same branch" });
      return;
    }

    const transfer = await transferService.create({
      fromBranchId,
      toBranchId,
      initiatedById: req.user!.id,
      initiatedByName: req.user!.name,
      note,
      items,
    });

    getIo()?.emit("DATA_UPDATED");
    res.status(201).json(transfer);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/transfers/:id/confirm — Confirm receipt (Kasir)
router.patch("/:id/confirm", requireAuth, async (req, res, next) => {
  try {
    const { receivedItems } = req.body;

    const transfer = await transferService.confirmReceipt({
      transferId: req.params.id as string,
      confirmedById: req.user!.id,
      confirmedByName: req.user!.name,
      receivedItems: receivedItems || [],
    });

    res.json(transfer);
  } catch (err) {
    next(err);
  }
});

export default router;
