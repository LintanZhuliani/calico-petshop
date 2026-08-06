import { db } from "./src/db/index.js";
import { transactionService } from "./src/services/transaction.service.js";
import { user } from "./src/db/schema/auth.js";
import { branch } from "./src/db/schema/branch.js";
import { product } from "./src/db/schema/product.js";
import { eq, ilike } from "drizzle-orm";

async function test() {
  try {
    // Get gempi branch
    const br = await db.select().from(branch).where(ilike(branch.name, "%gempi%")).limit(1);
    const branchId = br[0].id;

    // Get any admin/kasir user for that branch
    const usr = await db.select().from(user).where(eq(user.branchId, branchId)).limit(1);
    const cashierId = usr[0].id;
    const cashierName = usr[0].name || "Kasir Test";

    // Find "Animal&co Tuna 800gr" and "Bolt Ungu Tuna 800gr"
    const p1 = await db.select().from(product).where(ilike(product.name, "%Animal%Tuna%800gr%")).limit(1);
    const p2 = await db.select().from(product).where(ilike(product.name, "%Bolt%Ungu%Tuna%800gr%")).limit(1);

    console.log(`Checking out: ${p1[0].name} & ${p2[0].name}`);

    const result = await transactionService.checkout({
      branchId,
      cashierId,
      cashierName,
      items: [
        {
          productId: p1[0].id,
          productName: p1[0].name,
          qty: 3,
          price: 23000,
          buyPrice: p1[0].buyPrice || 0
        },
        {
          productId: p2[0].id,
          productName: p2[0].name,
          qty: 3,
          price: 22000,
          buyPrice: p2[0].buyPrice || 0
        }
      ],
      paid: 135000,
      change: 0,
      paymentMethod: "QRIS"
    });

    console.log("Success:", result);
  } catch (err: any) {
    console.error("FAILED!");
    console.error(err);
  } finally {
    process.exit(0);
  }
}
test();
