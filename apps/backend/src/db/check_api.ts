import { transactionService } from '../services/transaction.service';

async function main() {
  const txs1 = await transactionService.getAll({ status: 'COMPLETED', branchId: 'undefined', date: '2026-08-06' });
  console.log('Txs count with undefined:', txs1.length);
  
  const txs2 = await transactionService.getAll({ status: 'COMPLETED', branchId: 'pusat', date: '2026-08-06' });
  console.log('Txs count with pusat:', txs2.length);
}
main().catch(console.error);
