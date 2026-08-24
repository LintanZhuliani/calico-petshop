// PRODUCT REQUEST SERVICE (Secure & Isolated)

import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { productRequest, product, branch, branchStock, batch } from "../db/schema/index.js";
import { generateId, generateShortId } from "../lib/utils.js";
import { productService } from "./product.service.js";
import { getIo } from "../lib/socket.js";
import { sendEmail } from "../lib/mailer.js";
import { user } from "../db/schema/index.js";

export const productRequestService = {
  /** Get all requests, optionally filtered by branch */
  async getAll(filters?: { branchId?: string; status?: "pending" | "approved" | "rejected" }) {
    let query = db
      .select({
        request: productRequest,
        branch: branch,
      })
      .from(productRequest)
      .innerJoin(branch, eq(productRequest.branchId, branch.id))
      .orderBy(desc(productRequest.createdAt));

    let requests = await query;

    if (filters?.branchId) {
      requests = requests.filter((r) => r.request.branchId === filters.branchId);
    }
    if (filters?.status) {
      requests = requests.filter((r) => r.request.status === filters.status);
    }

    return requests.map(r => ({ ...r.request, branchName: r.branch.name }));
  },

  /** Create a new request (Kasir) */
  async create(data: {
    requestType: "RESTOCK" | "ADJUSTMENT";
    items: Array<{
      productId: string;
      productName: string;
      qty: number;
      expiredDate?: string;
    }>;
    branchId: string;
    requestedById: string;
    requestedByName: string;
    note?: string;
  }) {
    const newRequest = await db.insert(productRequest).values({
      id: generateShortId("PRQ"),
      requestType: data.requestType,
      items: data.items,
      branchId: data.branchId,
      requestedById: data.requestedById,
      requestedByName: data.requestedByName,
      note: data.note || null,
    }).returning();

    getIo()?.emit("NEW_REQUEST", newRequest[0]);

    // Send Email to all Admins
    try {
      const typeText = data.requestType === "RESTOCK" ? "Restock" : "Penyesuaian Stok";
      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #D35400;">Request Produk Baru</h2>
          <p><strong>ID:</strong> ${newRequest[0].id}</p>
          <p><strong>Dari:</strong> ${data.requestedByName}</p>
          <p><strong>Jenis:</strong> ${typeText}</p>
          <p><strong>Catatan:</strong> ${data.note || "-"}</p>
          <br/>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">Nama Produk</th>
                <th style="padding: 10px; border: 1px solid #dee2e6; text-align: center;">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map(i => `
                <tr>
                  <td style="padding: 10px; border: 1px solid #dee2e6;">${i.productName}</td>
                  <td style="padding: 10px; border: 1px solid #dee2e6; text-align: center;">${i.qty} unit</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <p style="margin-top: 20px;">Mohon segera dicek di halaman aplikasi kasir.</p>
        </div>
      `;

      // Ambil admin dari database
      const admins = await db.select({ email: user.email }).from(user).where(eq(user.role, "admin"));
      const adminEmails = new Set(admins.map(a => a.email).filter(Boolean));
      
      // Tambahkan email yang diminta secara paksa
      adminEmails.add("furrkid5data@gmail.com");
      adminEmails.add("lintanzhuliani840@gmail.com");

      for (const email of adminEmails) {
        // Fire and forget so it doesn't block Kasir
        sendEmail({
          to: email as string,
          subject: `[Calico PetShop] Request Baru - ${typeText}`,
          html: htmlBody,
        }).catch(console.error);
      }
    } catch (e) {
      console.error("Failed to send request emails", e);
    }
    return newRequest[0];
  },

  /** Approve a request (Admin) */
  async approve(
    id: string,
    adminId: string,
    adminName: string,
    sourceBranchId?: string // Where to take stock from for RESTOCK
  ) {
    const reqs = await db.select().from(productRequest).where(eq(productRequest.id, id));
    const req = reqs[0];
    if (!req) throw new Error("Request not found");
    if (req.status !== "pending") throw new Error("Request is not pending");

    await db.transaction(async (tx) => {
      for (const item of req.items) {
        if (req.requestType === "RESTOCK") {
          if (!sourceBranchId) throw new Error("Source branch must be specified for RESTOCK");
          // 1. Deduct from source branch
          const deductResult = await productService.deductStockFEFO(item.productId, sourceBranchId, item.qty, tx);
          if (!deductResult.success) {
             // We won't throw Error to fail the whole transaction if one item is out of stock, OR we could. Let's fail it for simplicity.
             throw new Error(`Stok tidak cukup untuk ${item.productName} di cabang asal. Hanya tersedia ${deductResult.deducted}.`);
          }
          
          // 2. Add to destination branch
          await productService.addStock({
            productId: item.productId,
            branchId: req.branchId,
            qty: item.qty,
          }, tx);
          
        } else if (req.requestType === "ADJUSTMENT") {
          // OVERWRITE stock logic
          // 1. Delete all existing batches for this product in this branch
          const bs = await tx.select().from(branchStock).where(and(
            eq(branchStock.productId, item.productId),
            eq(branchStock.branchId, req.branchId)
          ));
          
          if (bs.length > 0) {
             await tx.delete(batch).where(eq(batch.branchStockId, bs[0].id));
          }

          // 2. Add the new adjusted stock as a single batch (if qty > 0)
          if (item.qty > 0) {
            await productService.addStock({
              productId: item.productId,
              branchId: req.branchId,
              qty: item.qty,
              expiredDate: item.expiredDate,
            }, tx);
          }
        }
      }

      // Update request status
      await tx.update(productRequest).set({
        status: "approved",
        resolvedById: adminId,
        resolvedByName: adminName,
        resolvedAt: new Date(),
      }).where(eq(productRequest.id, id));
    });

    getIo()?.emit("DATA_UPDATED");
    return { success: true };
  },

  /** Reject a request (Admin) */
  async reject(id: string, adminId: string, adminName: string) {
    const result = await db.update(productRequest).set({
      status: "rejected",
      resolvedById: adminId,
      resolvedByName: adminName,
      resolvedAt: new Date(),
    }).where(eq(productRequest.id, id)).returning();
    
    getIo()?.emit("DATA_UPDATED");
    return result[0];
  }
};
