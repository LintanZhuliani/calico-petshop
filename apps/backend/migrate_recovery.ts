import { neon } from '@neondatabase/serverless';

const OLD_DB_URL = 'postgresql://neondb_owner:npg_i3HkOTnbtG8C@ep-sweet-credit-ao66o378-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const NEW_DB_URL = 'postgresql://neondb_owner:npg_i3HkOTnbtG8C@ep-sweet-cell-aorz6jla-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const oldSql = neon(OLD_DB_URL);
const newSql = neon(NEW_DB_URL);

async function main() {
  console.log('Fetching old transactions from August 1st branch...');
  try {
    const txs = await oldSql`SELECT * FROM "transaction"`;
    console.log(`Found ${txs.length} transactions in old database.`);

    const items = await oldSql`SELECT * FROM "transaction_item"`;
    console.log(`Found ${items.length} items in old database.`);

    if (txs.length === 0) {
      console.log("No old transactions to migrate.");
      process.exit(0);
    }

    let txInserted = 0;
    for (const tx of txs) {
      await newSql`
        INSERT INTO "transaction" (
          id, branch_id, cashier_id, cashier_name, total, paid, change, payment_method, date
        ) VALUES (
          ${tx.id}, ${tx.branch_id}, ${tx.cashier_id}, ${tx.cashier_name}, ${tx.total}, ${tx.paid}, ${tx.change}, ${tx.payment_method}, ${tx.date}
        ) ON CONFLICT DO NOTHING
      `;
      txInserted++;
    }
    console.log(`Inserted ${txInserted} transactions.`);

    let itemInserted = 0;
    for (const item of items) {
      await newSql`
        INSERT INTO "transaction_item" (
          id, transaction_id, product_id, product_name, qty, price, buy_price
        ) VALUES (
          ${item.id}, ${item.transaction_id}, ${item.product_id}, ${item.product_name}, ${item.qty}, ${item.price}, ${item.buy_price}
        ) ON CONFLICT DO NOTHING
      `;
      itemInserted++;
    }
    console.log(`Inserted ${itemInserted} transaction items.`);
    
    console.log("✅ DATA RECOVERY SUCCESSFUL!");
  } catch (error) {
    console.error("❌ Error during recovery:", error);
  }
  process.exit(0);
}

main();
