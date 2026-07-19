import cron from "node-cron";
import { db } from "../db/index.js";
import { branchStock, batch, product, user, branch } from "../db/schema/index.js";
import { eq, inArray, and } from "drizzle-orm";
import { daysUntilExpiry } from "../lib/utils.js";
import { sendEmail } from "../lib/mailer.js";

/**
 * Run daily at 08:00 AM
 */
export function initCronJobs() {
  // Check if SMTP is configured, else log a warning
  if (!process.env.SMTP_EMAIL && !process.env.SMTP_USER) {
    console.warn("⚠️  SMTP is not configured. Email notifications will not be sent successfully. Set SMTP_EMAIL and SMTP_PASSWORD in .env");
  }

  cron.schedule("0 8 * * *", async () => {
    console.log("⏰ Running daily expiry check cron job...");
    try {
      await checkAndSendExpiryAlerts();
    } catch (error) {
      console.error("Cron Job Error:", error);
    }
  });
}

export async function checkAndSendExpiryAlerts() {
  // 1. Get all batches with their product and branch info
  const allBatchesInfo = await db
    .select({
      batchId: batch.id,
      expiredDate: batch.expiredDate,
      qty: batch.qty,
      productName: product.name,
      productId: product.id,
      branchId: branchStock.branchId,
    })
    .from(batch)
    .innerJoin(branchStock, eq(batch.branchStockId, branchStock.id))
    .innerJoin(product, eq(branchStock.productId, product.id));

  // 2. Filter batches that expire in EXACTLY 30 days or EXACTLY 7 days, or EXACTLY 0 days and have qty > 0
  const alertsByBranch: Record<string, any[]> = {};
  const logsToInsert: any[] = [];

  allBatchesInfo.forEach((b) => {
    if (!b.expiredDate || b.qty <= 0) return;
    const days = daysUntilExpiry(b.expiredDate);
    
    if (days === 30 || days === 7 || days === 1 || days === 0) {
      if (!alertsByBranch[b.branchId]) {
        alertsByBranch[b.branchId] = [];
      }
      alertsByBranch[b.branchId].push({
        ...b,
        daysLeft: days,
      });

      // Prepare DB log
      let type = '';
      let message = '';
      if (days === 0) {
        type = 'expired';
        message = 'Telah Kadaluarsa Hari Ini';
      } else if (days === 1) {
        type = 'expiry_1';
        message = 'Akan Kadaluarsa BESOK (1 Hari)';
      } else if (days === 7) {
        type = 'expiry_7';
        message = 'Akan Kadaluarsa dalam 7 hari (1 Minggu)';
      } else if (days === 30) {
        type = 'expiry_30';
        message = 'Akan Kadaluarsa dalam 30 hari (1 Bulan)';
      }

      if (type) {
        logsToInsert.push({
          branchId: b.branchId,
          productId: b.productId,
          batchId: b.batchId,
          type: type,
          message: message,
        });
      }
    }
  });

  // 2.5 Insert Logs into DB (on conflict do nothing)
  if (logsToInsert.length > 0) {
    // Import at top of file needed for notificationLog, I'll add it
    const { notificationLog } = await import('../db/schema/notification-log.js');
    for (const log of logsToInsert) {
      await db.insert(notificationLog).values(log).onConflictDoNothing();
    }
  }

  // 3. For each branch that has alerts, get branch info and users (Admin + Kasir)
  for (const branchId of Object.keys(alertsByBranch)) {
    const alerts = alertsByBranch[branchId];
    if (alerts.length === 0) continue;

    // Get Branch Name
    const branchInfo = await db
      .select({ name: branch.name })
      .from(branch)
      .where(eq(branch.id, branchId))
      .limit(1);
    
    const branchName = branchInfo[0]?.name || "Cabang";

    // Get all users in the system (Admin + Kasir)
    // Send to everyone so admins and new cashiers all get notified
    const allUsers = await db
      .select({ email: user.email, name: user.name, role: user.role })
      .from(user);

    if (allUsers.length === 0) continue;

    // 4. Construct HTML Email
    const htmlContent = generateEmailHTML(branchName, alerts);

    // 5. Send emails
    for (const u of allUsers) {
      if (!u.email) continue;
      
      console.log(`Sending expiry alert email to ${u.email} (${u.role}) at ${branchName}`);
      await sendEmail({
        to: u.email,
        subject: `Peringatan Kadaluarsa Barang - ${branchName}`,
        html: htmlContent,
      });
    }
  }
}

function generateEmailHTML(branchName: string, alerts: any[]) {
  const tableRows = alerts
    .map((alert) => {
      const color = alert.daysLeft <= 7 ? "#dc2626" : "#eab308"; // red for <= 7 days, yellow for 30
      const dateStr = new Date(alert.expiredDate).toLocaleDateString("id-ID");
      return `
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>${alert.productName}</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${alert.qty}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${dateStr}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: ${color}; font-weight: bold;">
            Tinggal ${alert.daysLeft} Hari!
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e293b;">Peringatan Kadaluarsa Barang</h2>
      <p>Halo Tim <strong>${branchName}</strong>,</p>
      <p>Berikut adalah daftar barang yang akan kadaluarsa dalam waktu dekat (1 bulan, 1 minggu, atau besok) di cabang Anda. Mohon segera periksa stok fisik dan lakukan tindakan yang diperlukan (seperti promosi diskon atau retur).</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Nama Produk</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Qty (Batch)</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Tgl Kadaluarsa</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <p style="margin-top: 30px; font-size: 12px; color: #64748b;">
        Email ini dikirim secara otomatis oleh Sistem Manajemen Calico Petshop. Harap tidak membalas email ini.
      </p>
    </div>
  `;
}
