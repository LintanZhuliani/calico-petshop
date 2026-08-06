import { db } from './src/db/index.js';
import { transaction } from './src/db/schema/transaction.js';
async function main() {
  try {
    const res = await db.selectDistinct({ branchId: transaction.branchId }).from(transaction);
    console.log("Branches in TX:", res);
  } catch(e) { console.error(e); }
  process.exit(0);
}
main();
