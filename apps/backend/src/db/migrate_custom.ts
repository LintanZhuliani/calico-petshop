import { db } from "./index.js";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Creating rekap_kasir table...");
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rekap_kasir (
        id text PRIMARY KEY,
        branch_id text NOT NULL REFERENCES branch(id),
        user_id text NOT NULL REFERENCES "user"(id),
        cashier_name text NOT NULL,
        start_time timestamp NOT NULL,
        end_time timestamp NOT NULL,
        modal_awal integer NOT NULL DEFAULT 0,
        total_cash integer NOT NULL DEFAULT 0,
        total_non_cash integer NOT NULL DEFAULT 0,
        total_revenue integer NOT NULL DEFAULT 0,
        total_transactions integer NOT NULL DEFAULT 0,
        uang_fisik integer NOT NULL DEFAULT 0,
        selisih integer NOT NULL DEFAULT 0,
        pengeluaran jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);
    console.log("Success!");
  } catch (err) {
    console.error("Migration failed:", err);
  }
  process.exit(0);
}

main();
