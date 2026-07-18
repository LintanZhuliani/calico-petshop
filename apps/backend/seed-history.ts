import { db } from "./src/db/index.js";
import { branchStock } from "./src/db/schema/branch-stock.js";
import { batch } from "./src/db/schema/batch.js";
import { product } from "./src/db/schema/product.js";
import { notificationLog } from "./src/db/schema/notification-log.js";
import { eq } from "drizzle-orm";
import { daysUntilExpiry } from "./src/lib/utils.js";

async function seedHistory() {
  const bsResults = await db.select().from(branchStock);
  for (const bs of bsResults) {
    const batches = await db.select().from(batch).where(eq(batch.branchStockId, bs.id));
    for (const b of batches) {
      if (!b.expiredDate || b.qty <= 0) continue;
      
      const days = daysUntilExpiry(b.expiredDate);
      let type = '';
      let message = '';
      
      if (days <= 0) {
        type = 'expired';
        message = `Telah Kadaluarsa sejak ${Math.abs(days)} hari yang lalu`;
      } else if (days <= 7) {
        type = 'expiry_7';
        message = `Akan Kadaluarsa dalam ${days} hari (1 Minggu)`;
      } else if (days <= 30) {
        type = 'expiry_30';
        message = `Akan Kadaluarsa dalam ${days} hari (1 Bulan)`;
      }

      if (type) {
        // Use insert ON CONFLICT to avoid duplicate logs for same batch and type
        await db.insert(notificationLog).values({
          branchId: bs.branchId,
          productId: bs.productId,
          batchId: b.id,
          type: type,
          message: message,
        }).onConflictDoNothing();
      }
    }
  }
  console.log("Seeded notification history.");
  process.exit(0);
}

seedHistory();
