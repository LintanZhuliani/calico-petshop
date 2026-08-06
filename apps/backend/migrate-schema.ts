import { db } from "./src/db/index.js";
import { sql } from "drizzle-orm";

async function run() {
  try {
    console.log("Adding columns to transaction table...");
    await db.execute(sql`ALTER TABLE "transaction" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'COMPLETED';`);
    await db.execute(sql`ALTER TABLE "transaction" ADD COLUMN IF NOT EXISTS "customer_name" text;`);
    await db.execute(sql`ALTER TABLE "transaction" ADD COLUMN IF NOT EXISTS "order_type" text;`);
    await db.execute(sql`ALTER TABLE "transaction" ADD COLUMN IF NOT EXISTS "pickup_date" timestamp;`);
    await db.execute(sql`ALTER TABLE "transaction" ADD COLUMN IF NOT EXISTS "additional_fee" integer NOT NULL DEFAULT 0;`);
    console.log("Done!");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
