import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
  const result = await db.execute(sql`
    SELECT
      relname,
      pg_catalog.pg_get_userbyid(relowner) AS owner,
      pg_catalog.obj_description(oid, 'pg_class') AS description
    FROM pg_catalog.pg_class
    WHERE relname = 'transaction'
  `);
  console.log(result.rows);
  
  // also get the earliest transaction
  const early = await db.execute(sql`SELECT MIN(date) FROM "transaction"`);
  console.log("Earliest TX:", early.rows);

  process.exit(0);
}
main();
