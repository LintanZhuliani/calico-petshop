import "dotenv/config";
import { db } from "../db/index.js";
import { rekapKasir } from "../db/schema/rekap.js";
import { sql } from "drizzle-orm";

async function clearRekap() {
  console.log("Menghapus semua riwayat tutup kasir...");
  try {
    await db.execute(sql`TRUNCATE TABLE "rekap_kasir" CASCADE`);
    console.log("Berhasil menghapus riwayat tutup kasir.");
  } catch (error) {
    console.error("Gagal menghapus riwayat:", error);
  } finally {
    process.exit(0);
  }
}

clearRekap();
