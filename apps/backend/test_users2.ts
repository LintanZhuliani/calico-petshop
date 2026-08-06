import { db } from './src/db/index.js';
import { user } from './src/db/schema/index.js';
async function main() {
  try {
    const res = await db.select().from(user);
    console.log("Users:", res);
  } catch(e) { console.error(e); }
  process.exit(0);
}
main();
