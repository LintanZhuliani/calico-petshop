import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("Adding buy_price and sell_price columns to batch table...");
  
  try {
    await sql`ALTER TABLE batch ADD COLUMN IF NOT EXISTS buy_price INTEGER`;
    console.log("✓ Added buy_price column");
    
    await sql`ALTER TABLE batch ADD COLUMN IF NOT EXISTS sell_price INTEGER`;
    console.log("✓ Added sell_price column");
    
    console.log("Migration complete!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
