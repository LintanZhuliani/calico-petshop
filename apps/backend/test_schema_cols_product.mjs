import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_CTUVj5RfZKP0@ep-sweet-credit-ao66o378-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');
async function main() {
  try {
    let res = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'product'`;
    console.log("product:", res.map(r => r.column_name));
    res = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'transaction_item'`;
    console.log("transaction_item:", res.map(r => r.column_name));
  } catch (e) {
    console.error(e);
  }
}
main();
