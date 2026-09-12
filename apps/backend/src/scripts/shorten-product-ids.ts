import "dotenv/config";
import { db } from "../db/index.js";
import { product } from "../db/schema/product.js";
import { branchStock } from "../db/schema/branch-stock.js";
import { transactionItem } from "../db/schema/transaction.js";
import { transferItem } from "../db/schema/transfer.js";
import { notificationLog } from "../db/schema/notification-log.js";
import { productRequest } from "../db/schema/request.js";
import { eq, sql } from "drizzle-orm";

async function run() {
  console.log("Starting Product ID migration...");

  try {
    // Drop legacy table if exists to prevent FK errors
    await db.execute(sql`DROP TABLE IF EXISTS "product_requests" CASCADE`);

    await db.transaction(async (tx) => {
      // 1. Get all products
      const products = await tx.select().from(product).orderBy(product.createdAt);
      console.log(`Found ${products.length} products to migrate.`);

      let count = 1;
      
      for (const p of products) {
        // Skip if already in short format
        if (p.id.startsWith("PRD-")) {
          console.log(`Skipping ${p.id} (already short)`);
          continue;
        }

        const newId = `PRD-${String(count).padStart(3, '0')}`;
        console.log(`Migrating ${p.id} -> ${newId}`);

        // 1.5 Temporarily remove barcode from old product to avoid unique constraint
        await tx.update(product).set({ barcode: null }).where(eq(product.id, p.id));

        // 2. Insert duplicate product with new ID
        await tx.insert(product).values({
          id: newId,
          name: p.name,
          category: p.category,
          buyPrice: p.buyPrice,
          price: p.price,
          barcode: p.barcode,
          image: p.image,
          imageEmoji: p.imageEmoji,
          minStock: p.minStock,
          isArchived: p.isArchived,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        });

        // 3. Update references
        await tx.update(branchStock).set({ productId: newId }).where(eq(branchStock.productId, p.id));
        await tx.update(transactionItem).set({ productId: newId }).where(eq(transactionItem.productId, p.id));
        await tx.update(transferItem).set({ productId: newId }).where(eq(transferItem.productId, p.id));
        await tx.update(notificationLog).set({ productId: newId }).where(eq(notificationLog.productId, p.id));

        // 4. Update JSONB references in productRequest
        const requests = await tx.select().from(productRequest);
        for (const req of requests) {
          let updated = false;
          const newItems = req.items.map((item: any) => {
            if (item.productId === p.id) {
              updated = true;
              return { ...item, productId: newId };
            }
            return item;
          });

          if (updated) {
            await tx.update(productRequest)
              .set({ items: newItems })
              .where(eq(productRequest.id, req.id));
          }
        }

        // 5. Delete old product
        await tx.delete(product).where(eq(product.id, p.id));
        
        count++;
      }
      
      console.log("Migration successful!");
    });
  } catch (error) {
    console.error("Migration failed, rolled back.", error);
  } finally {
    process.exit(0);
  }
}

run();
