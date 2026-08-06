import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_CTUVj5RfZKP0@ep-sweet-credit-ao66o378-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');
async function main() {
  try {
    console.log("Adding missing columns to transaction table...");
    await sql`
      CREATE TABLE IF NOT EXISTS "customer" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "phone" text,
        "email" text,
        "address" text,
        "branch_id" text NOT NULL,
        "total_transactions" integer DEFAULT 0 NOT NULL,
        "total_spent" integer DEFAULT 0 NOT NULL,
        "last_transaction_date" timestamp,
        "notes" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `;
    console.log("SUCCESS");
  } catch (e) {
    console.error(e);
  }
}
main();
