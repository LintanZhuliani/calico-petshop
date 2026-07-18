import { db } from "./src/db/index.js";
import { branch } from "./src/db/schema/branch.js";
import { branchStock } from "./src/db/schema/branch-stock.js";
import { batch } from "./src/db/schema/batch.js";
import { eq } from "drizzle-orm";
import { daysUntilExpiry } from "./src/lib/utils.js";

async function run() {
  const allBranches = await db.select().from(branch);
  for (const br of allBranches) {
    const bsResults = await db.select().from(branchStock).where(eq(branchStock.branchId, br.id));
    let expiredCount = 0;
    for (const bs of bsResults) {
      const batches = await db.select().from(batch).where(eq(batch.branchStockId, bs.id));
      for (const b of batches) {
        if (b.expiredDate && daysUntilExpiry(b.expiredDate) <= 0 && b.qty > 0) {
          expiredCount++;
        }
      }
    }
    console.log(`Branch ${br.name} (ID: ${br.id}) has ${expiredCount} expired batches.`);
  }
  process.exit(0);
}
run();
