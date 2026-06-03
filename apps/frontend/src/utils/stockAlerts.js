// ===================================================
// STOCK ALERTS — Calico's Pet Care
// Logika untuk mendeteksi stok kritis & produk hampir expired
// ===================================================

import { getTotalStock } from '../data/mockData';
import { daysUntilExpiry } from './formatters';

/**
 * Ambil semua produk yang stoknya di bawah minStock
 * @param {Array} products
 * @returns {Array} produk dengan stok kritis
 */
export function getLowStockProducts(products) {
  return products.filter(p => getTotalStock(p) <= p.minStock);
}

/**
 * Ambil semua batch yang akan expired dalam N hari
 * @param {Array} products
 * @param {number} withinDays - default 30 hari
 * @returns {Array} { product, batch, daysLeft }
 */
export function getExpiringBatches(products, withinDays = 30) {
  const alerts = [];
  products.forEach(product => {
    product.batches.forEach(batch => {
      if (!batch.expiredDate) return;
      const days = daysUntilExpiry(batch.expiredDate);
      if (days <= withinDays) {
        alerts.push({ product, batch, daysLeft: days });
      }
    });
  });
  // Sort: paling dekat expired duluan
  return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
}

/**
 * Ambil batch yang sudah expired
 * @param {Array} products
 * @returns {Array} { product, batch }
 */
export function getExpiredBatches(products) {
  const expired = [];
  products.forEach(product => {
    product.batches.forEach(batch => {
      if (!batch.expiredDate) return;
      if (daysUntilExpiry(batch.expiredDate) < 0) {
        expired.push({ product, batch });
      }
    });
  });
  return expired;
}

/**
 * Ambil status warna untuk batch berdasarkan sisa hari expired
 * @param {string} expiredDate
 * @returns {'expired'|'danger'|'warning'|'ok'|'none'}
 */
export function getExpiryStatus(expiredDate) {
  if (!expiredDate) return 'none';
  const days = daysUntilExpiry(expiredDate);
  if (days < 0) return 'expired';
  if (days <= 7) return 'danger';
  if (days <= 30) return 'warning';
  return 'ok';
}

/**
 * Ambil class warna berdasarkan status expired
 */
export function getExpiryColorClass(status) {
  switch (status) {
    case 'expired': return { text: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' };
    case 'danger': return { text: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' };
    case 'warning': return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' };
    case 'ok': return { text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' };
    default: return { text: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-100' };
  }
}

/**
 * FEFO: Kurangi stok dari batch yang paling dekat expired duluan
 * @param {Array} batches - array batch produk
 * @param {number} qtyToDeduct - jumlah yang akan dikurangi
 * @returns {{ updatedBatches: Array, success: boolean }}
 */
export function deductStockFEFO(batches, qtyToDeduct) {
  // Urutkan: yang ada expired date dulu (FEFO), yang null belakangan
  const sorted = [...batches].sort((a, b) => {
    if (!a.expiredDate) return 1;
    if (!b.expiredDate) return -1;
    return new Date(a.expiredDate) - new Date(b.expiredDate);
  });

  let remaining = qtyToDeduct;
  const updated = sorted.map(batch => {
    if (remaining <= 0) return { ...batch };
    const deduct = Math.min(batch.qty, remaining);
    remaining -= deduct;
    return { ...batch, qty: batch.qty - deduct };
  });

  // Hapus batch yang sudah habis
  const updatedBatches = updated.filter(b => b.qty > 0);

  return {
    updatedBatches,
    success: remaining <= 0, // false jika stok tidak cukup
  };
}
