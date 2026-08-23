// PRODUCT REQUEST ROUTES (Secure & Isolated)

import { Router } from "express";
import { productRequestService } from "../services/product-request.service.js";

export const productRequestRouter = Router();

// GET /api/requests - Get all requests
productRequestRouter.get("/", async (req, res) => {
  try {
    const { branchId, status } = req.query;
    const filters: any = {};
    if (branchId) filters.branchId = branchId as string;
    if (status) filters.status = status as string;

    const requests = await productRequestService.getAll(filters);
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/requests - Create new request (Kasir)
productRequestRouter.post("/", async (req, res) => {
  try {
    const data = req.body;
    // Basic validation
    if (!data.requestType || !data.items || !Array.isArray(data.items) || data.items.length === 0 || !data.branchId || !data.requestedById) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const request = await productRequestService.create(data);
    res.status(201).json(request);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/requests/:id/approve - Approve request (Admin)
productRequestRouter.post("/:id/approve", async (req, res) => {
  try {
    const { adminId, adminName, sourceBranchId } = req.body;
    if (!adminId || !adminName) {
      return res.status(400).json({ error: "Admin credentials required" });
    }
    await productRequestService.approve(req.params.id, adminId, adminName, sourceBranchId);
    res.json({ success: true, message: "Request approved and stock updated" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/requests/:id/reject - Reject request (Admin)
productRequestRouter.post("/:id/reject", async (req, res) => {
  try {
    const { adminId, adminName } = req.body;
    if (!adminId || !adminName) {
      return res.status(400).json({ error: "Admin credentials required" });
    }
    const request = await productRequestService.reject(req.params.id, adminId, adminName);
    res.json(request);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
