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
    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const customer = await customerService.create({ name, phone });
    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
});

export default router;
