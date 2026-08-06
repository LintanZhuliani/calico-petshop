import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
  const result = await db.execute(sql`SELECT cashier_name, COUNT(*) as count FROM "transaction" WHERE branch_id='pusat' GROUP BY cashier_name`);
  console.log(result.rows);
  process.exit(0);
}
main();
