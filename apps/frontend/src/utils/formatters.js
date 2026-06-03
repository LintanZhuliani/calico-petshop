// ===================================================
// FORMATTERS — Calico's Pet Care Utility Functions
// ===================================================

/**
 * Format angka ke format Rupiah Indonesia
 * @param {number} amount
 * @returns {string} e.g. "Rp 28.000"
 */
export function formatRupiah(amount) {
  if (amount === null || amount === undefined) return 'Rp 0';
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

/**
 * Format date string ke format Indonesia
 * @param {string} dateStr - ISO date string atau 'yyyy-mm-dd'
 * @returns {string} e.g. "15 Jun 2026"
 */
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Format datetime ke format Indonesia lengkap
 * @param {string} dateTimeStr
 * @returns {string} e.g. "19 Apr 2026, 08:30"
 */
export function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return '-';
  const date = new Date(dateTimeStr);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric'
  }) + ', ' + date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Hitung selisih hari antara hari ini dan tanggal expired
 * @param {string} expiredDate - 'yyyy-mm-dd'
 * @returns {number} hari tersisa (negatif = sudah expired)
 */
export function daysUntilExpiry(expiredDate) {
  if (!expiredDate) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiredDate);
  exp.setHours(0, 0, 0, 0);
  const diff = exp - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Generate ID unik dengan prefix
 * @param {string} prefix - e.g. 'p', 'tx', 'tr'
 * @returns {string}
 */
export function generateId(prefix = 'id') {
  return `${prefix}${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
