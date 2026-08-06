import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }
  console.log('Connecting to database...');
  const sql = neon(process.env.DATABASE_URL);
  
  console.log('Deleting all transactions...');
  await sql`DELETE FROM "transaction_item"`;
  console.log('Deleted all transaction_items.');
  
  await sql`DELETE FROM "transaction"`;
  console.log('Deleted all transactions.');
}
main().catch(console.error);
