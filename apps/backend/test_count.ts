import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
  const result = await db.execute(sql`SELECT DATE(date) as dt, COUNT(*) as count, branch_id FROM "transaction" GROUP BY DATE(date), branch_id ORDER BY dt DESC`);
  console.log(result.rows);
  process.exit(0);
}
main();
