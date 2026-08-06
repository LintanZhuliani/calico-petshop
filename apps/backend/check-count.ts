import { db } from "./src/db/index.js";
import { batch } from "./src/db/schema/batch.js";
import { branchStock } from "./src/db/schema/branch-stock.js";

async function check() {
  try {
    const bsCount = await db.select().from(branchStock);
    const batchCount = await db.select().from(batch);
    
    console.log(`Total BranchStocks: ${bsCount.length}`);
    console.log(`Total Batches: ${batchCount.length}`);
    
    const ghostStock = bsCount.filter(bs => bs.totalStock > 0);
    console.log(`BranchStocks with > 0 totalStock: ${ghostStock.length}`);
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();
