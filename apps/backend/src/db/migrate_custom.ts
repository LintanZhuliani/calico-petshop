import { db } from "./index.js";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Running migration...");
  try {
    await db.execute(sql`ALTER TABLE transaction ADD COLUMN due_date timestamp;`);
    console.log("Success!");
  } catch (err) {
    console.error("Migration failed:", err);
  }
  process.exit(0);
}

main();
