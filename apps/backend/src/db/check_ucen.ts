import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const tx = await sql`SELECT * FROM "transaction" WHERE id = 'cpf08081428577'`;
  console.log('Tx:', tx);
}
main().catch(console.error);
