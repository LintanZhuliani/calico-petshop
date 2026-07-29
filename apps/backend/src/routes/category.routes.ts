import { Router } from "express";
import { categoryService } from "../services/category.service.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// GET /api/categories — List all categories
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const categories = await categoryService.getAll();
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

// POST /api/categories — Create category (Admin only)
router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const cat = await categoryService.create(name);
    res.status(201).json(cat);
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(400).json({ error: "Gagal: Kategori dengan nama tersebut sudah ada." });
      return;
    }
    next(err);
  }
});

// PUT /api/categories/:id — Update category and update all products
router.put("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const cat = await categoryService.update(req.params.id, name);
    res.json(cat);
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(400).json({ error: "Gagal: Kategori dengan nama tersebut sudah ada." });
      return;
    }
    next(err);
  }
});

// DELETE /api/categories/:id — Delete category and set products to Lainnya
router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const cat = await categoryService.delete(req.params.id);
    if (!cat) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    res.json({ message: "Category deleted", category: cat });
  } catch (err: any) {
    if (err.message === "Cannot delete Lainnya") {
      res.status(400).json({ error: "Gagal: Kategori 'Lainnya' adalah kategori bawaan dan tidak dapat dihapus." });
      return;
    }
    next(err);
  }
});

export default router;
