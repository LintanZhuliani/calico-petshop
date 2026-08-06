import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_i3HkOTnbtG8C@ep-sweet-cell-aorz6jla-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log("Adding missing columns to transaction table...");
  try {
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
    console.log("Customer table created.");

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transaction' AND column_name='customer_id') THEN
          ALTER TABLE "transaction" ADD COLUMN "customer_id" text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transaction' AND column_name='customer_name') THEN
          ALTER TABLE "transaction" ADD COLUMN "customer_name" text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transaction' AND column_name='order_type') THEN
          ALTER TABLE "transaction" ADD COLUMN "order_type" text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transaction' AND column_name='pickup_date') THEN
          ALTER TABLE "transaction" ADD COLUMN "pickup_date" timestamp;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transaction' AND column_name='additional_fee') THEN
          ALTER TABLE "transaction" ADD COLUMN "additional_fee" integer NOT NULL DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transaction' AND column_name='additional_fees_details') THEN
          ALTER TABLE "transaction" ADD COLUMN "additional_fees_details" text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transaction' AND column_name='due_date') THEN
          ALTER TABLE "transaction" ADD COLUMN "due_date" timestamp;
        END IF;
      END $$;
    `;
    console.log("Transaction table altered.");
    
    console.log("SUCCESS!");
  } catch (error) {
    console.error("Error modifying database:", error);
  }
  process.exit(0);
}

main();
