import { db } from './src/db/index.js';
import { transaction } from './src/db/schema/transaction.js';
async function main() {
  try {
    const res = await db.select({ date: transaction.date }).from(transaction).orderBy(transaction.date);
    console.log("First Date:", res[0]?.date);
    console.log("Last Date:", res[res.length - 1]?.date);
    console.log("Count:", res.length);
  } catch(e) { console.error(e); }
  process.exit(0);
}
main();
