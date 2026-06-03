// ===================================================
// SEED SCRIPT — Populate initial data
// Run: npm run db:seed
// ===================================================

import "dotenv/config";
import { db } from "./index.js";
import { branch } from "./schema/branch.js";
import { product } from "./schema/product.js";
import { branchStock } from "./schema/branch-stock.js";
import { batch } from "./schema/batch.js";
import { generateId } from "../lib/utils.js";

// Data from frontend mockData.js
const BRANCHES = [
  { id: "pusat", name: "Calico's Pet Care (Pusat)" },
  { id: "gempi", name: "Gempi Pet Shop" },
  { id: "baba", name: "Baba Pet Corner" },
];

const PRODUCTS = [
  {
    id: "p001",
    name: "Whiskas Adult Chicken 400g",
    category: "Makanan Kering",
    price: 28000,
    barcode: "8888888001",
    imageEmoji: "pets",
    minStock: 10,
    batches: [
      { qty: 15, expiredDate: "2026-06-15", receivedDate: "2026-01-10" },
      { qty: 20, expiredDate: "2026-12-20", receivedDate: "2026-03-05" },
    ],
  },
  {
    id: "p002",
    name: "Royal Canin Indoor 2kg",
    category: "Makanan Kering",
    price: 145000,
    barcode: "8888888002",
    imageEmoji: "workspace_premium",
    minStock: 5,
    batches: [
      { qty: 8, expiredDate: "2027-03-10", receivedDate: "2026-02-20" },
    ],
  },
  {
    id: "p003",
    name: "Pedigree Puppy 1kg",
    category: "Makanan Kering",
    price: 55000,
    barcode: "8888888003",
    imageEmoji: "pets",
    minStock: 8,
    batches: [
      { qty: 3, expiredDate: "2026-05-01", receivedDate: "2025-11-15" },
    ],
  },
  {
    id: "p004",
    name: "Temptations Tuna 85g",
    category: "Camilan & Treat",
    price: 32000,
    barcode: "8888888004",
    imageEmoji: "set_meal",
    minStock: 15,
    batches: [
      { qty: 25, expiredDate: "2027-01-30", receivedDate: "2026-04-01" },
    ],
  },
  {
    id: "p005",
    name: "Drools Salmon Treats 100g",
    category: "Camilan & Treat",
    price: 18000,
    barcode: "8888888005",
    imageEmoji: "cruelty_free",
    minStock: 10,
    batches: [
      { qty: 5, expiredDate: "2026-04-30", receivedDate: "2026-01-20" },
    ],
  },
  {
    id: "p006",
    name: "Vitakraft Vitamin C Tablet",
    category: "Vitamin & Suplemen",
    price: 75000,
    barcode: "8888888006",
    imageEmoji: "medication",
    minStock: 5,
    batches: [
      { qty: 12, expiredDate: "2027-06-10", receivedDate: "2026-03-15" },
    ],
  },
  {
    id: "p007",
    name: "Tali Leash Kulit Premium",
    category: "Aksesoris",
    price: 95000,
    barcode: "8888888007",
    imageEmoji: "loyalty",
    minStock: 3,
    batches: [
      { qty: 7, expiredDate: null, receivedDate: "2026-02-10" },
    ],
  },
  {
    id: "p008",
    name: "Furminator Short Hair",
    category: "Grooming",
    price: 220000,
    barcode: "8888888008",
    imageEmoji: "content_cut",
    minStock: 2,
    batches: [
      { qty: 4, expiredDate: null, receivedDate: "2026-01-05" },
    ],
  },
  {
    id: 'p013',
    name: 'Ongkos Kirim / Antar Jemput',
    category: 'Ongkos Kirim',
    price: 15000,
    barcode: 'SVC002',
    imageEmoji: 'local_shipping',
    minStock: 0,
    batches: [
      { qty: 999, expiredDate: null, receivedDate: '2026-01-01' },
    ],
  },
  {
    id: 'p014',
    name: 'Penginapan Kucing (Per Malam)',
    category: 'Penginapan Kucing',
    price: 50000,
    barcode: 'SVC003',
    imageEmoji: 'bed',
    minStock: 0,
    batches: [
      { qty: 999, expiredDate: null, receivedDate: '2026-01-01' },
    ],
  },
];

async function seed() {
  console.log("🌱 Seeding database...\n");

  // 1. Seed branches
  console.log("📍 Seeding branches...");
  for (const b of BRANCHES) {
    await db
      .insert(branch)
      .values({ id: b.id, name: b.name })
      .onConflictDoNothing();
  }
  console.log(`   ✅ ${BRANCHES.length} branches seeded`);

  // 2. Seed products (global catalog)
  console.log("📦 Seeding products...");
  for (const p of PRODUCTS) {
    await db
      .insert(product)
      .values({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        barcode: p.barcode,
        imageEmoji: p.imageEmoji,
        minStock: p.minStock,
      })
      .onConflictDoNothing();
  }
  console.log(`   ✅ ${PRODUCTS.length} products seeded`);

  // 3. Seed stock at 'pusat' branch (all products get stock at headquarters)
  console.log("🏪 Seeding stock at 'pusat' branch...");
  for (const p of PRODUCTS) {
    // Create branch_stock for pusat
    const bsId = `bs_${p.id}_pusat`;
    await db
      .insert(branchStock)
      .values({
        id: bsId,
        productId: p.id,
        branchId: "pusat",
      })
      .onConflictDoNothing();

    // Create batches
    for (const b of p.batches) {
      await db
        .insert(batch)
        .values({
          id: generateId("b"),
          branchStockId: bsId,
          qty: b.qty,
          expiredDate: b.expiredDate,
          receivedDate: b.receivedDate,
        })
        .onConflictDoNothing();
    }
  }
  console.log("   ✅ Stock seeded at pusat");

  console.log("\n✅ Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
