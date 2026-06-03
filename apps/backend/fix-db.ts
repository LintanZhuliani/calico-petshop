import { db } from "./src/db/index.js";
import { sql } from "drizzle-orm";

async function fixDB() {
  try {
    console.log("Checking and fixing product table...");
    try {
      await db.execute(sql`ALTER TABLE product ADD COLUMN updated_at timestamp DEFAULT now() NOT NULL;`);
      console.log("Added updated_at to product.");
    } catch (e) {
      console.log("product.updated_at already exists or error:", e.message);
    }
    
    try {
      await db.execute(sql`ALTER TABLE product ADD COLUMN buy_price integer DEFAULT 0 NOT NULL;`);
      console.log("Added buy_price to product.");
    } catch (e) {
      console.log("product.buy_price already exists or error:", e.message);
    }

    console.log("Checking and fixing transaction_item table...");
    try {
      await db.execute(sql`ALTER TABLE transaction_item ADD COLUMN buy_price integer DEFAULT 0 NOT NULL;`);
      console.log("Added buy_price to transaction_item.");
    } catch (e) {
      console.log("transaction_item.buy_price already exists or error:", e.message);
    }

    console.log("Checking and fixing transaction table...");
    try {
      await db.execute(sql`ALTER TABLE transaction ADD COLUMN total_profit integer DEFAULT 0 NOT NULL;`);
      console.log("Added total_profit to transaction.");
    } catch (e) {
      console.log("transaction.total_profit already exists or error:", e.message);
    }

    console.log("Done.");
    process.exit(0);
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
}

fixDB();
