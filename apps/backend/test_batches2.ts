import { db } from './src/db/index.js';
import { batch } from './src/db/schema/batch.js';
import { branchStock } from './src/db/schema/branch-stock.js';
async function main() {
  try {
    const b = await db.select().from(batch);
    console.log("Batches:", b.length);
    const bs = await db.select().from(branchStock);
    console.log("BranchStocks:", bs.length);
  } catch(e) { console.error(e); }
  process.exit(0);
}
main();
