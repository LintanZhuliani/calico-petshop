import { neon } from '@neondatabase/serverless';
async function main() {
  try {
    const sql = neon('postgresql://neondb_owner:npg_i3HkOTnbtG8C@ep-sweet-cell-aorz6jla-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');
    const txs = await sql`SELECT sum(total) as revenue, count(*) as txcount FROM "transaction" WHERE date >= CURRENT_DATE AND date < CURRENT_DATE + 1`;
    console.log("Today:", txs);
    
    // Test chart data query
    const chartTxs = await sql`SELECT date, total FROM "transaction" WHERE date >= CURRENT_DATE - 6`;
    console.log("Last 7 days count:", chartTxs.length);
  } catch(e){ console.error(e); }
  process.exit(0);
}
main();
