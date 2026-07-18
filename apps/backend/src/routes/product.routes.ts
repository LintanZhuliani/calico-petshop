// ===================================================
// PRODUCT ROUTES — /api/products
// ===================================================

import { Router } from "express";
import { productService } from "../services/product.service.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// GET /api/products/alerts/low-stock — Low stock products
router.get("/alerts/low-stock", requireAuth, async (req, res, next) => {
  try {
    const branchId = (req.query.branchId as string) || req.user!.branchId;
    if (!branchId) {
      res.status(400).json({ error: "branchId is required" });
      return;
    }
    const products = await productService.getLowStock(branchId);
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/alerts/expiring — Expiring batches
router.get("/alerts/expiring", requireAuth, async (req, res, next) => {
  try {
    const branchId = (req.query.branchId as string) || req.user!.branchId;
    const days = parseInt(req.query.days as string) || 90;
    if (!branchId) {
      res.status(400).json({ error: "branchId is required" });
      return;
    }
    const alerts = await productService.getExpiringBatches(branchId, days);
    res.json(alerts);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/barcode/:code — Find by barcode
router.get("/barcode/:code", requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branchId as string;
    const product = await productService.getByBarcode(
      req.params.code as string,
      branchId
    );
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// GET /api/products — List products
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const filters = {
      search: req.query.search as string,
      category: req.query.category as string,
      branchId: (req.query.branchId as string) || req.user!.branchId || undefined,
      status: req.query.status as "critical" | "empty" | undefined,
    };
    const products = await productService.getAll(filters);
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id — Get single product
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branchId as string;
    const product = await productService.getById(req.params.id as string, branchId);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// POST /api/products — Create product (Admin only)
router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { name, category, buyPrice, price, barcode, image, imageEmoji, minStock } =
      req.body;
    if (!name || !category || !price) {
      res.status(400).json({ error: "name, category, and price are required" });
      return;
    }
    const product = await productService.create({
      name,
      category,
      buyPrice,
      price,
      barcode,
      image,
      imageEmoji,
      minStock,
    });
    res.status(201).json(product);
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(400).json({ error: "Gagal: Barcode sudah terdaftar untuk produk lain." });
      return;
    }
    next(err);
  }
});

// PUT /api/products/:id — Update product (Admin only)
router.put("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const product = await productService.update(req.params.id as string, req.body);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(product);
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(400).json({ error: "Gagal: Barcode sudah terdaftar untuk produk lain." });
      return;
    }
    next(err);
  }
});

// DELETE /api/products/:id — Delete product (Admin only)
router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const product = await productService.delete(req.params.id as string);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json({ message: "Product deleted", product });
  } catch (err: any) {
    if (err.statusCode === 400) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// POST /api/products/:id/stock — Add stock to branch (Admin only)
router.post("/:id/stock", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { branchId, qty, expiredDate } = req.body;
    if (!branchId || !qty) {
      res.status(400).json({ error: "branchId and qty are required" });
      return;
    }
    const batch = await productService.addStock({
      productId: req.params.id as string,
      branchId,
      qty: Number(qty),
      expiredDate,
    });
    res.status(201).json(batch);
  } catch (err) {
    next(err);
  }
});

// POST /api/products/:id/stock/deduct — Deduct stock (Admin only, FEFO override)
router.post("/:id/stock/deduct", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { branchId, qty } = req.body;
    if (!branchId || !qty) {
      res.status(400).json({ error: "branchId and qty are required" });
      return;
    }
    const result = await productService.deductStockFEFO(
      req.params.id as string,
      branchId,
      Number(qty)
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/products/:id/stock/:batchId — Update batch qty/expiry (Admin only, per-branch correction)
router.patch("/:id/stock/:batchId", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { qty, expiredDate } = req.body;
    if (qty === undefined && expiredDate === undefined) {
      res.status(400).json({ error: "qty or expiredDate is required" });
      return;
    }
    const updates: any = {};
    if (qty !== undefined) updates.qty = Number(qty);
    if (expiredDate !== undefined) updates.expiredDate = expiredDate;

    const result = await productService.updateBatch(
      req.params.batchId as string,
      updates
    );
    if (!result) {
      res.status(404).json({ error: "Batch not found" });
      return;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id/stock/:batchId — Delete batch (Admin only, per-branch correction)
router.delete("/:id/stock/:batchId", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const result = await productService.deleteBatch(req.params.batchId as string);
    if (!result) {
      res.status(404).json({ error: "Batch not found" });
      return;
    }
    res.json({ message: "Batch deleted", batch: result });
  } catch (err) {
    next(err);
  }
});

export default router;
