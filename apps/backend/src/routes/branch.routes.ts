// ===================================================
// BRANCH ROUTES — /api/branches
// ===================================================

import { Router } from "express";
import { branchService } from "../services/branch.service.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// GET /api/branches — List all branches
router.get("/", async (req, res, next) => {
  try {
    const branches = await branchService.getAll();
    res.json(branches);
  } catch (err) {
    next(err);
  }
});

// GET /api/branches/:id — Get single branch
router.get("/:id", async (req, res, next) => {
  try {
    const branch = await branchService.getById(req.params.id as string);
    if (!branch) {
      res.status(404).json({ error: "Branch not found" });
      return;
    }
    res.json(branch);
  } catch (err) {
    next(err);
  }
});

// POST /api/branches — Create branch (Admin only)
router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id, name } = req.body;
    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const branch = await branchService.create({ id, name });
    res.status(201).json(branch);
  } catch (err) {
    next(err);
  }
});

// PUT /api/branches/:id — Update branch (Admin only)
router.put("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const branch = await branchService.update(req.params.id as string, { name });
    if (!branch) {
      res.status(404).json({ error: "Branch not found" });
      return;
    }
    res.json(branch);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/branches/:id — Delete branch (Admin only)
router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const branch = await branchService.delete(req.params.id as string);
    if (!branch) {
      res.status(404).json({ error: "Branch not found" });
      return;
    }
    res.json({ message: "Branch deleted", branch });
  } catch (err) {
    next(err);
  }
});

export default router;
