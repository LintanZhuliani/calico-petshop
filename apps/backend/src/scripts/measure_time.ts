import { productService } from "../services/product.service.js";

async function main() {
  console.log("Measuring productService.getAll time...");
  const start = Date.now();
  const data = await productService.getAll({ branchId: "pusat" });
  const duration = Date.now() - start;
  console.log(`getAll returned ${data.length} products in ${duration}ms.`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
