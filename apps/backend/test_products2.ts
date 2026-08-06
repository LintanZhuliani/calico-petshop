import { db } from './src/db/index.js';
import { product } from './src/db/schema/index.js';
import { sql } from 'drizzle-orm';
async function main() {
  try {
    const res = await db.select({ count: sql`count(*)` }).from(product);
    console.log("Products:", res);
  } catch(e) { console.error(e); }
  process.exit(0);
}
main();
