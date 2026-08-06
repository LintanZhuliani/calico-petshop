import { db } from './src/db/index.js';
import { batch } from './src/db/schema/batch.js';
import { branchStock } from './src/db/schema/branch-stock.js';
import { sql, eq } from 'drizzle-orm';
async function main() {
  try {
    const totalStockQuery = db.select({ total: sql<number>`sum(${batch.qty})` }).from(batch).leftJoin(branchStock, eq(batch.branchStockId, branchStock.id));
    const totalStockResult = await totalStockQuery;
    console.log(totalStockResult);
  } catch(e) { console.error(e); }
  process.exit(0);
}
main();
