import { transactionService } from './src/services/transaction.service.js';
async function main() {
  try {
    const txs = await transactionService.getAll({});
    console.log("Tx Count:", txs.length);
    console.log("First Tx:", txs[0]);
  } catch(e) {
    console.error("Error:", e);
  }
  process.exit(0);
}
main();
