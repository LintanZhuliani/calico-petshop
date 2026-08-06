import { db } from "./src/db/index.js";
import { batch } from "./src/db/schema/batch.js";
import { branchStock } from "./src/db/schema/branch-stock.js";
import { product } from "./src/db/schema/product.js";
import { eq, ilike } from "drizzle-orm";

async function check() {
  try {
    const prod = await db.select().from(product).where(ilike(product.name, "%Animal%Tuna%")).limit(1);
    console.log("Product:", prod[0]?.name);

    if (prod[0]) {
      const bs = await db.select().from(branchStock).where(eq(branchStock.productId, prod[0].id));
      console.log("BranchStocks:", bs.map(b => ({ id: b.id, branch: b.branchId, total: b.totalStock })));

      const bsIds = bs.map(b => b.id);
      const batches = await db.select().from(batch);
      const relevant = batches.filter(b => bsIds.includes(b.branchStockId));
      console.log("Batches:", relevant.map(b => ({ id: b.id, qty: b.qty })));
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();
