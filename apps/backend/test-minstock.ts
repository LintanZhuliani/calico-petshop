import { db } from "./src/db/index.js";
import { product } from "./src/db/schema/product.js";
import { eq } from "drizzle-orm";

async function test() {
  const prods = await db.select().from(product).limit(1);
  if(prods.length > 0) {
    const p = prods[0];
    console.log('Before:', p.minStock);
    await db.update(product).set({ minStock: 1 }).where(eq(product.id, p.id));
    const after = await db.select().from(product).where(eq(product.id, p.id));
    console.log('After:', after[0].minStock);
    // restore
    await db.update(product).set({ minStock: p.minStock }).where(eq(product.id, p.id));
  }
  process.exit(0);
}
test().catch(console.error);
