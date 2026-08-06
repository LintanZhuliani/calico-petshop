import { transactionService } from './src/services/transaction.service.js';
async function main() {
  try {
    const txs = await transactionService.getAll({
      date: undefined,
      branchId: undefined,
      cashierId: undefined,
      status: undefined,
      includePending: false
    });
    console.log('TOTAL:', txs.length);
    console.log(JSON.stringify(txs[0]));
  } catch (err) {
    console.error('ERROR:', err);
  }
  process.exit(0);
}
main();
