// ===================================================
// DASHBOARD ROUTES — /api/dashboard
// ===================================================

import { Router } from "express";
import { dashboardService } from "../services/dashboard.service.js";

const router = Router();

// GET /api/dashboard/summary
// Optional query: ?branchId=
router.get("/summary", async (req, res, next) => {
  try {
    const branchId = req.query.branchId as string | undefined;
    const summary = await dashboardService.getSummary(branchId);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

export { router as dashboardRoutes };
