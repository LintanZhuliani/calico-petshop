import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function run() {
  const user = await db.execute(sql`SELECT u.email, a.password FROM "user" u JOIN account a ON a.user_id = u.id`);
  console.log('Found users:', user.rows);
  process.exit(0);
}
run();
