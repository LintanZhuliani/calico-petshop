// ===================================================
// REPORT ROUTES — /api/reports
// ===================================================

import { Router } from "express";
import { reportService } from "../services/report.service.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// Only Admins can access reports
router.use(requireAdmin);

// GET /api/reports/sales/monthly?year=2026&month=4&branchId=
router.get("/sales/monthly", async (req, res, next) => {
  try {
    const year = parseInt(req.query.year as string);
    const month = parseInt(req.query.month as string); // 0-11
    const branchId = req.query.branchId as string | undefined;

    if (isNaN(year) || isNaN(month)) {
      res.status(400).json({ error: "Missing year or month parameter" });
      return;
    }

    const report = await reportService.getMonthlySales(year, month, branchId);
    res.json(report);
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/sales/monthly/csv?year=2026&month=4&branchId=
router.get("/sales/monthly/csv", async (req, res, next) => {
  try {
    const year = parseInt(req.query.year as string);
    const month = parseInt(req.query.month as string); // 0-11
    const branchId = req.query.branchId as string | undefined;

    if (isNaN(year) || isNaN(month)) {
      res.status(400).json({ error: "Missing year or month parameter" });
      return;
    }

    const txs = await reportService.getMonthlyTransactions(year, month, branchId);
    
    // Generate CSV
    const headers = [
      "ID Transaksi",
      "Tanggal",
      "Cabang",
      "Kasir",
      "Total",
      "Dibayar",
      "Kembalian",
      "Metode Pembayaran",
      "Items"
    ];

    const rows = txs.map(tx => {
      const itemsStr = tx.items.map(i => `${i.productName} (x${i.qty})`).join(" | ");
      return [
        tx.id,
        new Date(tx.date).toISOString(),
        tx.branchId,
        tx.cashierName,
        tx.total,
        tx.paid,
        tx.change,
        `"${tx.paymentMethod}"`,
        `"${itemsStr}"`
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=sales_report_${year}_${month + 1}.csv`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

export { router as reportRoutes };
