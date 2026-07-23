// ===================================================
// DASHBOARD ROUTES — /api/dashboard
// ===================================================

import { Router } from "express";
import { dashboardService } from "../services/dashboard.service.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/dashboard/summary
// Optional query: ?branchId=
router.get("/summary", requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branchId as string | undefined;
    const cashierId = req.user!.role === 'admin' ? undefined : req.user!.id;
    const summary = await dashboardService.getSummary(branchId, cashierId);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

export { router as dashboardRoutes };
