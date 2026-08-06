import { neon } from '@neondatabase/serverless';

const oldSql = neon('postgresql://neondb_owner:npg_i3HkOTnbtG8C@ep-crimson-unit-aocr2f0n-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const txs = await oldSql`SELECT date, id FROM "transaction" ORDER BY date ASC LIMIT 10`;
  console.log(txs);
  process.exit(0);
}

main();
