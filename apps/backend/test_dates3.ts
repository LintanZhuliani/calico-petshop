import { neon } from '@neondatabase/serverless';
async function main() {
  try {
    const sql = neon('postgresql://neondb_owner:npg_i3HkOTnbtG8C@ep-sweet-cell-aorz6jla-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');
    const txs = await sql`SELECT branch_id, date, count(*) FROM "transaction" GROUP BY branch_id, date ORDER BY date DESC LIMIT 5`;
    console.log(txs);
  } catch(e) { console.error(e); }
  process.exit(0);
}
main();
