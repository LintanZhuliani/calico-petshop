import { db } from './src/db/index.js';
import { user, account } from './src/db/schema/index.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function run() {
  const hashedPassword = await bcrypt.hash('calicoadmin', 10);
  const u = await db.select().from(user).where(eq(user.email, 'furrkid5data@gmail.com'));
  if(!u[0]) {
    console.log('User not found');
    process.exit(1);
  }
  await db.update(account).set({ password: hashedPassword }).where(eq(account.userId, u[0].id));
  console.log('Password reset to: calicoadmin');
  process.exit(0);
}

run();
