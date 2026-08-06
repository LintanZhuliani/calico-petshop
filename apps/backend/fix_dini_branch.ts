import { db } from './src/db/index.js';
import { user } from './src/db/schema/index.js';
import { eq } from 'drizzle-orm';
async function main() {
  try {
    await db.update(user)
      .set({ branchId: 'gempi' })
      .where(eq(user.email, 'dinipebriani832@gmail.com'));
    console.log("SUCCESS: Dinipebriani branchId updated to gempi");
  } catch(e) { console.error(e); }
  process.exit(0);
}
main();
