import { db } from './src/db/index';
import { transaction } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  await db.update(transaction)
    .set({ cashierName: 'Reflianimarsela' })
    .where(eq(transaction.id, 'tx_a953e90a-13b0-42dc-b88b-4ce7ba5fd7dd'));
  
  console.log("Updated specific transaction!");
}

main().catch(console.error).finally(() => process.exit(0));
