import { db } from './src/db/index.js';
import { transaction } from './src/db/schema/transaction.js';
import { sql, and, gte, lt } from 'drizzle-orm';
async function main() {
  try {
    const res = await db.select().from(transaction).where(and(gte(transaction.date, new Date('2026-08-02')), lt(transaction.date, new Date('2026-08-06'))));
    console.log("Between Aug 2 and Aug 5:", res.length);
  } catch(e) { console.error(e); }
  process.exit(0);
}
main();
