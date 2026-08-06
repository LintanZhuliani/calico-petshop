import { db } from "./index.js";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Running migration for Customer...");
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS customer (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    await db.execute(sql`
      ALTER TABLE transaction ADD COLUMN IF NOT EXISTS customer_id TEXT REFERENCES customer(id);
    `);
    
    console.log("Success!");
  } catch (err) {
    console.error("Migration failed:", err);
  }
  process.exit(0);
}

main();
