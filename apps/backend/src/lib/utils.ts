// ===================================================
// SHARED UTILITIES
// ===================================================

import { randomUUID } from "crypto";

/**
 * Generate a unique ID with an optional prefix.
 * Uses UUID v4 for uniqueness.
 */
export function generateId(prefix: string = ""): string {
  const uuid = randomUUID();
  return prefix ? `${prefix}_${uuid}` : uuid;
}

/**
 * Generate a short transaction ID (e.g., CPF07261114214)
 */
export function generateTxId(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 10);
  return `CPF${mm}${dd}${hh}${min}${ss}${rand}`;
}

/**
 * Get today's date as 'YYYY-MM-DD' in local timezone.
 */
export function todayDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/**
 * Calculate days until expiry from today.
 * Returns Infinity if no expiry date.
 * Negative means already expired.
 */
export function daysUntilExpiry(expiredDate: string | null): number {
  if (!expiredDate) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiredDate);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
