import { neon } from '@neondatabase/serverless';

const oldSql = neon('postgresql://neondb_owner:npg_i3HkOTnbtG8C@ep-sweet-credit-ao66o378-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  try {
    const txs = await oldSql`SELECT id, date, total, branch_id FROM "transaction" ORDER BY date ASC`;
    console.log(`Found ${txs.length} transactions.`);
    if (txs.length > 0) {
      console.log('Earliest:', txs[0]);
      console.log('Latest:', txs[txs.length - 1]);
    }
    
    // Check items too
    const items = await oldSql`SELECT COUNT(*) as count FROM "transaction_item"`;
    console.log(`Found ${items[0].count} transaction items.`);
  } catch (err) {
    console.error("Error fetching data:", err);
  }
  process.exit(0);
}

main();
