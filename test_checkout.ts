import { config } from 'dotenv';
config({ path: './apps/backend/.env' });
import { transactionService } from './apps/backend/src/services/transaction.service.js';
import { db } from './apps/backend/src/db/index.js';
import { product } from './apps/backend/src/db/schema/index.js';

async function run() {
  try {
    const prods = await db.select().from(product).limit(1);
    if (!prods.length) return;
    const p = prods[0];
    console.log('Product:', p.name);
    await transactionService.checkout({
      branchId: 'pusat',
      cashierId: 'test',
      cashierName: 'test',
      items: [{ productId: p.id, productName: p.name, qty: 1, price: p.price }],
      paid: p.price,
      change: 0,
      paymentMethod: 'Tunai'
    });
    console.log('SUCCESS');
  } catch(e) {
    console.error('ERROR:', e);
  }
  process.exit(0);
}
run();
