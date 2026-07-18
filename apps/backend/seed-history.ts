import { db } from "./src/db/index.js";
import { branchStock } from "./src/db/schema/branch-stock.js";
import { batch } from "./src/db/schema/batch.js";
import { product } from "./src/db/schema/product.js";
import { notificationLog } from "./src/db/schema/notification-log.js";
import { eq } from "drizzle-orm";
import { daysUntilExpiry } from "./src/lib/utils.js";

async function seedHistoryBulk() {
  console.log("Fetching batches...");
  const bsResults = await db.select().from(branchStock);
  const allBatches = await db.select().from(batch);
  
  const logsToInsert: any[] = [];
  
  for (const b of allBatches) {
    if (!b.expiredDate || b.qty <= 0) continue;
    const bs = bsResults.find(x => x.id === b.branchStockId);
    if (!bs) continue;
    
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
      logsToInsert.push({
        branchId: bs.branchId,
        productId: bs.productId,
        batchId: b.id,
        type: type,
        message: message,
      });
    }
  }
  
  console.log(`Found ${logsToInsert.length} logs to insert.`);
  if (logsToInsert.length > 0) {
    // Bulk insert
    await db.insert(notificationLog).values(logsToInsert).onConflictDoNothing({
      target: [notificationLog.batchId, notificationLog.type]
    });
    console.log("Bulk insert completed.");
  }
  
  const all = await db.select().from(notificationLog);
  console.log("Total rows in DB:", all.length);
  process.exit(0);
}

seedHistoryBulk();
