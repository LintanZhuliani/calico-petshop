import { db } from './src/db/index.js';
import * as schema from './src/db/schema/index.js';
import { eq } from 'drizzle-orm';

async function checkUser() {
  try {
    const user = await db.query.user.findFirst({
      where: eq(schema.user.email, 'lintanzhuliani840@gmail.com')
    });
    console.log("USER FOUND:", user ? "YES" : "NO", user);
    process.exit(0);
  } catch (err) {
    console.error("DB ERROR", err);
    process.exit(1);
  }
}
checkUser();
