import { db } from './src/db/index.js';
import { branch } from './src/db/schema/branch.js';
async function main() {
  try {
    const res = await db.select().from(branch);
    console.log("Branches:", res);
  } catch(e) { console.error(e); }
  process.exit(0);
}
main();
