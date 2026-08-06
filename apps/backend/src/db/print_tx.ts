import { db } from "./index.js";
import { transaction } from "./schema/index.js";

async function main() {
  const txs = await db.query.transaction.findMany();
  console.log("TRANSACTIONS:");
  txs.forEach(t => console.log(`${t.id} | ${t.customerName} | ${t.status} | ${t.paymentMethod} | ${new Date(t.date).toISOString()}`));
  process.exit(0);
}
main();
