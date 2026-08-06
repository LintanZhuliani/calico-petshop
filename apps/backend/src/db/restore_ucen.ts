import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }
  const sql = neon(process.env.DATABASE_URL);
  
  const branches = await sql`SELECT id FROM "branch" LIMIT 1`;
  const users = await sql`SELECT id, name FROM "user" LIMIT 1`;
  const products = await sql`SELECT id, name, price, buy_price FROM "product" WHERE name ILIKE '%Deodorant Pasir ByeBye%' LIMIT 1`;
  
  const branchId = branches[0]?.id;
  const cashierId = users[0]?.id;
  const cashierName = users[0]?.name;
  const productId = products[0]?.id;
  const productName = products[0]?.name;
  const productPrice = products[0]?.price;
  const productBuyPrice = products[0]?.buy_price;

  if (!branchId || !cashierId || !productId) {
    console.log('Missing data to create transaction');
    return;
  }

  const txId = 'cpf08081428577';
  
  console.log('Inserting transaction...');
  await sql`
    INSERT INTO "transaction" (
      id, branch_id, cashier_id, cashier_name, total, paid, change, payment_method, date, status, customer_name
    ) VALUES (
      ${txId}, ${branchId}, ${cashierId}, ${cashierName}, 85000, 85000, 0, 'Tunai', NOW(), 'COMPLETED', 'Ucen'
    )
  `;
  
  console.log('Inserting transaction item...');
  const itemId = 'item_' + Date.now();
  await sql`
    INSERT INTO "transaction_item" (
      id, transaction_id, product_id, product_name, qty, price, buy_price
    ) VALUES (
      ${itemId}, ${txId}, ${productId}, ${productName}, 1, 32000, ${productBuyPrice}
    )
  `;
  
  console.log('Transaction restored!');
}
main().catch(console.error);
