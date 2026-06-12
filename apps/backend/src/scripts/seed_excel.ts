import "dotenv/config";
import fs from "fs";
import path from "path";
import { productService } from "../services/product.service.js";

// Mapping Helper
const generateName = (item: any) => {
  const parts = [];
  if (item['5'] && item['5'] !== 'NULL') parts.push(item['5']); // merk
  if (item['4'] && item['4'] !== 'NULL') parts.push(item['4']); // jenis
  if (item['6'] && item['6'] !== 'NULL') parts.push(item['6']); // varian
  
  let size = "";
  if (item['7'] && item['7'] !== 'NULL') size += item['7']; // berat
  if (item['8'] && item['8'] !== 'NULL') size += item['8']; // satuan
  if (size) parts.push(size);

  const prefix = (item['3'] && item['3'] !== 'NULL') ? item['3'] : 'Produk';
  
  const finalParts = [prefix, ...parts];
  // Deduplicate words simply
  const unique = Array.from(new Set(finalParts.join(" ").split(" ")));
  return unique.join(" ").trim();
};

const mapCategory = (nameStr: string, jenis: string) => {
  const s = `${nameStr} ${jenis}`.toLowerCase();
  if (s.includes("pasir")) return "Pasir Kucing";
  if (s.includes("makanan") && s.includes("basah")) return "Makanan Basah";
  if (s.includes("makanan") || s.includes("bolt") || s.includes("whiskas") || s.includes("kibble")) return "Makanan Kering";
  if (s.includes("snack") || s.includes("camilan") || s.includes("creamy") || s.includes("treat")) return "Camilan & Treat";
  if (s.includes("susu")) return "Susu & Minuman";
  if (s.includes("vitamin") || s.includes("minyak ikan") || s.includes("suplemen")) return "Vitamin & Suplemen";
  if (s.includes("obat")) return "Obat-obatan";
  if (s.includes("shampo") || s.includes("parfum") || s.includes("grooming")) return "Shampo & Grooming";
  if (s.includes("kalung") || s.includes("harness") || s.includes("mainan") || s.includes("aksesoris")) return "Aksesoris";
  if (s.includes("kandang") || s.includes("tas") || s.includes("pet cargo")) return "Kandang & Tas";
  return "Makanan Kering"; // default
};

async function seed() {
  console.log("Reading data...");
  const rawData = fs.readFileSync(path.join(process.cwd(), "../frontend/products_data.json"), "utf8");
  const items = JSON.parse(rawData);

  console.log(`Processing ${items.length} products...`);
  
  let successCount = 0;
  let errorCount = 0;

  for (const item of items) {
    try {
      const barcode = String(item['2']).trim();
      if (!barcode || barcode === 'NULL' || barcode === 'undefined') continue;

      const baseName = item['3'] || '';
      const jenis = item['4'] || '';
      const fullName = generateName(item);
      const category = mapCategory(fullName, jenis);
      const price = Number(item['9']) || 0;
      
      const stockCalico = Number(item['10']) || 0;
      const stockBaba = Number(item['11']) || 0;
      const stockGempi = Number(item['12']) || 0;

      // 1. Create product
      const product = await productService.create({
        name: fullName,
        category,
        buyPrice: Math.round(price * 0.7), // Estimate buy price
        price,
        barcode,
        minStock: 5,
        imageEmoji: "inventory_2",
      });

      const expiredDate = (item['14'] && item['14'] !== 'NULL') ? item['14'] : null;

      // 2. Add Stock Branches
      if (stockCalico > 0) {
        await productService.addStock({ productId: product.id, branchId: "pusat", qty: stockCalico, expiredDate });
      }
      if (stockBaba > 0) {
        await productService.addStock({ productId: product.id, branchId: "baba", qty: stockBaba, expiredDate });
      }
      if (stockGempi > 0) {
        await productService.addStock({ productId: product.id, branchId: "gempi", qty: stockGempi, expiredDate });
      }

      successCount++;
      if (successCount % 50 === 0) console.log(`Inserted ${successCount} products...`);
    } catch (err: any) {
      if (!err.message.includes("barcode")) {
         console.error(`Failed at item:`, item['2'], err.message);
      }
      errorCount++;
    }
  }

  console.log(`✅ Seeding Complete! Success: ${successCount}, Errors: ${errorCount}`);
  process.exit(0);
}

seed();
