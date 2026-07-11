import { db } from './src/db/index';
import { transfer } from './src/db/schema';

async function main() {
  const allTransfers = await db.query.transfer.findMany();
  console.log("ALL TRANSFERS:", JSON.stringify(allTransfers, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
