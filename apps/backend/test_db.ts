import { db } from './src/db/index.js';
import { transaction } from './src/db/schema/index.js';
async function main() {
  const txs = await db.select().from(transaction);
  console.log(JSON.stringify(txs[0], null, 2));
  process.exit(0);
}
main();
