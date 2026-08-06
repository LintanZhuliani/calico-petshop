import { db } from "./src/db/index.js";
import { batch } from "./src/db/schema/batch.js";
import { branchStock } from "./src/db/schema/branch-stock.js";
import { product } from "./src/db/schema/product.js";
import { ilike } from "drizzle-orm";

async function check() {
  try {
    const products = await db.select().from(product).where(ilike(product.name, "%Bolt%Ungu%Tuna%"));

    for (const p of products) {
      console.log(`\nProduct: ${p.name}`);
      const bs = await db.select().from(branchStock).where(ilike(branchStock.productId, p.id));
      for (const b of bs) {
        const batches = await db.select().from(batch).where(ilike(batch.branchStockId, b.id));
        let total = 0;
        batches.forEach(bat => {
          total += bat.qty;
          console.log(` - Batch: qty=${bat.qty}, exp=${bat.expiredDate}`);
        });
        console.log(` - Total computed stock: ${total}`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();
