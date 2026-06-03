/**
 * seed-products.ts
 * Imports all products from Database_barang.csv into the database.
 * Run with: npx tsx src/db/seed-products.ts
 *
 * Strategy:
 *  - Map 'jenis' + 'merk' + 'varian' → product name
 *  - Map 'jenis' column → CATEGORIES used in the app
 *  - Products with jumlah > 0 get a stock batch at branch 'pusat'
 *  - Clears existing products (and their stock/batches) before seeding
 */

import { db } from "./index.js";
import { product, branchStock, batch, transaction, transactionItem } from "./schema/index.js";
import { generateId } from "../lib/utils.js";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BRANCH_ID = "pusat";

// Map CSV 'jenis' → app category
function mapCategory(jenis: string, subType?: string): string {
  const j = jenis?.toLowerCase().trim();
  const s = subType?.toLowerCase().trim();
  if (j === "pasir kucing") {
    if (s === "tofu") return "Pasir Kucing Tofu";
    return "Pasir Kucing";
  }
  if (j === "cargo") return "Kandang & Tas";
  if (j === "litter box") return "Aksesoris";
  return jenis || "Lainnya";
}

// Build a human-readable product name from CSV columns
function buildName(jenis: string, merk: string, varian: string, berat: string, satuan: string): string {
  const parts: string[] = [];
  if (merk && merk !== "NULL") parts.push(merk);
  if (jenis) parts.push(jenis);
  if (varian && varian !== "NULL") parts.push(varian);
  if (berat && berat !== "NULL" && satuan && satuan !== "NULL") parts.push(`${berat}${satuan}`);
  return parts.join(" ");
}

async function seedProducts() {
  const csvPath = path.join(__dirname, "Database_barang.csv");
  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  const headers = lines[0].split(",").map((h) => h.trim().replace(/\r/g, ""));

  const rows = lines.slice(1).map((line) => {
    // Handle quoted fields (e.g. barcodes with commas like "P1-MR-LMN-5,5")
    const fields: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === "," && !inQuote) { fields.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    fields.push(cur.trim().replace(/\r/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = fields[i] ?? ""; });
    return obj;
  }).filter((r) => r.nama_produk || r.merk); // skip empty rows

  console.log(`📋 Found ${rows.length} products in CSV\n`);

  // ── 1. Clear existing data (order matters for FK constraints) ──
  console.log("🗑️  Clearing existing data...");
  await db.delete(transactionItem);   // FK → product, transaction
  await db.delete(transaction);       // FK → (none blocking)
  await db.delete(batch);             // FK → branchStock
  await db.delete(branchStock);       // FK → product
  await db.delete(product);
  console.log("   ✅ Cleared\n");

  // ── 2. Insert products ──
  console.log("📦 Inserting products...");
  let inserted = 0;
  let stocked = 0;
  const usedBarcodes = new Set<string>();

  for (const row of rows) {
    let barcode = row.barcode?.replace(/\r/g, "").trim() || null;

    // Deduplicate: if barcode already used, generate a unique fallback
    if (barcode) {
      if (usedBarcodes.has(barcode)) {
        barcode = `${barcode}-${generateId("x").slice(0, 4)}`;
      }
      usedBarcodes.add(barcode);
    }
    const merk = row.merk?.trim();
    const jenis = row.jenis?.trim();
    const subType = row.jenis?.trim(); // used for pasir tofu vs bentonite via merk column

    // Build name: "Markotops Pasir Kucing Lavender 25L"
    const name = buildName(
      jenis,
      merk,
      row.varian?.trim(),
      row.berat?.trim(),
      row.satuan?.trim()
    );
    if (!name) continue;

    // Determine category
    // For pasir kucing, differentiate bentonite vs tofu via the 'jenis_sub' in merk column
    // Actually: CSV has 'jenis'="Pasir Kucing" and then separate column for bentonite/tofu type
    // Looking at CSV: col index 3 = jenis (e.g. "Pasir Kucing"), col index 4 = merk (e.g. "Bentonite")
    // The CSV has: nama_produk,jenis,merk,varian — wait let me re-read headers
    // Headers: id_produk,barcode,nama_produk,jenis,merk,varian,berat,satuan,harga_beli,harga_jual,status,Jumlah,expired_date
    // So: jenis=col3=e.g."Bentonite"/"Tofu"/"Plastik", merk=col4=e.g."Markotops"
    const jenisActual = row.jenis?.trim();   // "Bentonite", "Tofu", "Plastik", "Kain"
    const namaActual = row.nama_produk?.trim(); // "Pasir Kucing", "Cargo", "Litter Box"

    let category = mapCategory(namaActual, jenisActual);

    const buyPrice = parseFloat(row.harga_beli) || 0;
    const sellPrice = parseFloat(row.harga_jual) || 0;
    const qty = parseInt(row.Jumlah) || 0;
    const expiredDate = row.expired_date?.trim() === "NULL" || !row.expired_date?.trim() ? null : row.expired_date.trim();

    if (!sellPrice) continue; // skip if no price

    const productId = generateId("p");

    await db.insert(product).values({
      id: productId,
      name,
      category,
      buyPrice,
      price: sellPrice,
      barcode: barcode || null,
      minStock: 1,
      image: null,
      imageEmoji: "inventory_2",
    });

    inserted++;

    // Add stock batch if qty > 0
    if (qty > 0) {
      const bsId = generateId("bs");
      await db.insert(branchStock).values({
        id: bsId,
        productId,
        branchId: BRANCH_ID,
      });

      await db.insert(batch).values({
        id: generateId("b"),
        branchStockId: bsId,
        qty,
        expiredDate,
        receivedDate: new Date().toISOString().split("T")[0],
      });
      stocked++;
    }
  }

  console.log(`   ✅ ${inserted} products inserted`);
  console.log(`   📦 ${stocked} products have stock at branch '${BRANCH_ID}'`);
  console.log("\n✅ Product seed complete!");
}

seedProducts().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
