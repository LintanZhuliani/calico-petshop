import { sql } from "drizzle-orm";
import { db } from "./index.js";
import { product } from "./schema/index.js";
import { generateId } from "../lib/utils.js";

async function main() {
  console.log("Creating category table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS category (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  console.log("Extracting unique categories from products...");
  const products = await db.select({ category: product.category }).from(product);
  const uniqueCats = Array.from(new Set(products.map((p) => p.category?.trim()).filter(Boolean)));
  
  if (!uniqueCats.includes("Lainnya")) {
    uniqueCats.push("Lainnya");
  }

  console.log(`Found ${uniqueCats.length} unique categories. Seeding...`);

  for (const catName of uniqueCats) {
    try {
      await db.execute(sql`
        INSERT INTO category (id, name) VALUES (${generateId("cat")}, ${catName})
        ON CONFLICT (name) DO NOTHING;
      `);
    } catch (e) {
      console.log(`Failed to insert category: ${catName}`, e);
    }
  }

  console.log("Done!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
