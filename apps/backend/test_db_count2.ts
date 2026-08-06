import { db } from './src/db/index.js';
import { transaction } from './src/db/schema/transaction.js';
import { sql } from 'drizzle-orm';
async function main() {
  try {
    const res = await db.select({ count: sql`count(*)` }).from(transaction);
    console.log("Transaction count:", res);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
main();
