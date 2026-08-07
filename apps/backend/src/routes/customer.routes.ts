import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { customerService } from "../services/customer.service.js";

const router = Router();

// GET /api/customers
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const customers = await customerService.getAll(req.query.search as string);
    res.json(customers);
  } catch (err) {
    next(err);
  }
});

// POST /api/customers
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    let branchId = req.user?.branchId;

    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    if (!branchId) {
      const { db } = await import("../db/index.js");
      const { branch } = await import("../db/schema/index.js");
      const branches = await db.select().from(branch).limit(1);
      if (branches.length > 0) {
        branchId = branches[0].id;
      }
    }
    
    if (!branchId) {
      res.status(400).json({ error: "Branch ID is required. Kasir must be assigned to a branch." });
      return;
    }

    const customer = await customerService.create({ name, phone, branchId });
    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/customers/:id
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    await customerService.delete(id as string);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
