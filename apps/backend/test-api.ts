import { db } from "./src/db/index.js";
import { branchStock } from "./src/db/schema/branch-stock.js";
import { batch } from "./src/db/schema/batch.js";
import { product } from "./src/db/schema/product.js";
import { eq } from "drizzle-orm";
import { daysUntilExpiry } from "./src/lib/utils.js";

async function getExpiringBatches(branchId: string, withinDays: number = 90) {
  const bsResults = await db.select().from(branchStock).where(eq(branchStock.branchId, branchId));
  const alerts: any[] = [];
  for (const bs of bsResults) {
    const batches = await db.select().from(batch).where(eq(batch.branchStockId, bs.id));
    batches.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const prodResult = await db.select().from(product).where(eq(product.id, bs.productId));
    const prod = prodResult[0];

    batches.forEach((b, index) => {
      if (!b.expiredDate || b.qty <= 0) return;
      const days = daysUntilExpiry(b.expiredDate);
      if (days <= withinDays) {
        alerts.push({
          product: prod,
          batch: b,
          branchId: bs.branchId,
          daysLeft: days,
          sessionIndex: index + 1,
        });
      }
    });
  }
  return alerts;
}

async function run() {
  const alerts = await getExpiringBatches("pusat", 30);
  const expired = alerts.filter(a => a.daysLeft <= 0);
  console.log(`Total alerts for pusat (<= 30 days): ${alerts.length}`);
  console.log(`Expired alerts: ${expired.length}`);
  process.exit(0);
}
run();
