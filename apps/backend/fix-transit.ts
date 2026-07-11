import { db } from './src/db/index';
import { transfer, transferItem } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const transitTransfers = await db.query.transfer.findMany({
    where: eq(transfer.status, 'transit')
  });

  console.log(`Found ${transitTransfers.length} transfers in transit.`);

  for (const t of transitTransfers) {
    console.log(`Deleting items for transfer: ${t.id}`);
    await db.delete(transferItem).where(eq(transferItem.transferId, t.id));
    console.log(`Deleting transfer: ${t.id}`);
    await db.delete(transfer).where(eq(transfer.id, t.id));
  }
  console.log("Cleanup done.");
}

main().catch(console.error).finally(() => process.exit(0));
