import { db } from "./src/db/index.js";
import { batch } from "./src/db/schema/batch.js";
import { branchStock } from "./src/db/schema/branch-stock.js";
import { product } from "./src/db/schema/product.js";
import { branch } from "./src/db/schema/branch.js";
import { ilike, eq } from "drizzle-orm";

async function check() {
  try {
    const gempi = await db.select().from(branch).where(ilike(branch.name, "%gempi%")).limit(1);
    const gempiId = gempi[0].id;
    console.log(`Branch: ${gempi[0].name} (${gempiId})`);

    const products = await db.select().from(product).where(ilike(product.name, "%Tuna 800gr%"));

    for (const p of products) {
      console.log(`\nProduct: ${p.name}`);
      const bs = await db.select().from(branchStock).where(eq(branchStock.productId, p.id)).where(eq(branchStock.branchId, gempiId));
      for (const b of bs) {
        const batches = await db.select().from(batch).where(ilike(batch.branchStockId, b.id));
        let total = 0;
        batches.forEach(bat => {
          total += bat.qty;
          console.log(` - Batch: qty=${bat.qty}, exp=${bat.expiredDate}`);
        });
        console.log(` - Total computed stock in Gempi: ${total}`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();
