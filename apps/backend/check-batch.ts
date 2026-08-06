import { db } from "./src/db/index.js";
import { batch } from "./src/db/schema/batch.js";
import { product } from "./src/db/schema/product.js";
import { branchStock } from "./src/db/schema/branch-stock.js";
import { eq } from "drizzle-orm";

async function check() {
  const data = await db.select({
    name: product.name,
    qty: batch.qty,
    createdAt: batch.createdAt,
    receivedDate: batch.receivedDate,
    expiredDate: batch.expiredDate
  })
  .from(batch)
  .leftJoin(branchStock, eq(batch.branchStockId, branchStock.id))
  .leftJoin(product, eq(branchStock.productId, product.id));
  
  const relevant = data.filter(d => 
    d.name?.includes("SNACK") || d.name?.includes("Life Cat") || d.name?.includes("LieBao")
  );
  console.log(relevant);
  process.exit(0);
}
check();
