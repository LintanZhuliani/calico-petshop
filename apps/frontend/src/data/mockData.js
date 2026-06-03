// ===================================================
// MOCK DATA — Calico's Pet Care Inventory System
// Semua data disimpan di localStorage saat runtime
// ===================================================

export const BRANCHES = [
  { id: 'pusat', name: "Calico's Pet Care (Pusat)" },
  { id: 'gempi', name: 'Gempi Pet Shop' },
  { id: 'baba', name: 'Baba Pet Corner' },
];

export const CATEGORIES = [
  'Makanan Kering', 'Makanan Basah', 'Camilan & Treat',
  'Vitamin & Suplemen', 'Aksesoris', 'Grooming', 'Obat-obatan', 'Pasir', 
  'Ongkos Kirim', 'Penginapan Kucing', 'Lainnya'
];

// Format batch: { batchId, qty, expiredDate, receivedDate }
// Produk disimpan per cabang
export const INITIAL_PRODUCTS = [
  {
    id: 'p001',
    name: 'Whiskas Adult Chicken 400g',
    category: 'Makanan Kering',
    price: 28000,
    barcode: '8888888001',
    imageEmoji: 'pets',
    minStock: 10,
    batches: [
      { batchId: 'b001-1', qty: 15, expiredDate: '2026-06-15', receivedDate: '2026-01-10' },
      { batchId: 'b001-2', qty: 20, expiredDate: '2026-12-20', receivedDate: '2026-03-05' },
    ],
  },
  {
    id: 'p002',
    name: 'Royal Canin Indoor 2kg',
    category: 'Makanan Kering',
    price: 145000,
    barcode: '8888888002',
    imageEmoji: 'workspace_premium',
    minStock: 5,
    batches: [
      { batchId: 'b002-1', qty: 8, expiredDate: '2027-03-10', receivedDate: '2026-02-20' },
    ],
  },
  {
    id: 'p003',
    name: 'Pedigree Puppy 1kg',
    category: 'Makanan Kering',
    price: 55000,
    barcode: '8888888003',
    imageEmoji: 'pets',
    minStock: 8,
    batches: [
      { batchId: 'b003-1', qty: 3, expiredDate: '2026-05-01', receivedDate: '2025-11-15' },
    ],
  },
  {
    id: 'p004',
    name: 'Temptations Tuna 85g',
    category: 'Camilan & Treat',
    price: 32000,
    barcode: '8888888004',
    imageEmoji: 'set_meal',
    minStock: 15,
    batches: [
      { batchId: 'b004-1', qty: 25, expiredDate: '2027-01-30', receivedDate: '2026-04-01' },
    ],
  },
  {
    id: 'p005',
    name: 'Drools Salmon Treats 100g',
    category: 'Camilan & Treat',
    price: 18000,
    barcode: '8888888005',
    imageEmoji: 'cruelty_free',
    minStock: 10,
    batches: [
      { batchId: 'b005-1', qty: 5, expiredDate: '2026-04-30', receivedDate: '2026-01-20' },
    ],
  },
  {
    id: 'p006',
    name: 'Vitakraft Vitamin C Tablet',
    category: 'Vitamin & Suplemen',
    price: 75000,
    barcode: '8888888006',
    imageEmoji: 'medication',
    minStock: 5,
    batches: [
      { batchId: 'b006-1', qty: 12, expiredDate: '2027-06-10', receivedDate: '2026-03-15' },
    ],
  },
  {
    id: 'p007',
    name: 'Tali Leash Kulit Premium',
    category: 'Aksesoris',
    price: 95000,
    barcode: '8888888007',
    imageEmoji: 'loyalty',
    minStock: 3,
    batches: [
      { batchId: 'b007-1', qty: 7, expiredDate: null, receivedDate: '2026-02-10' },
    ],
  },
  {
    id: 'p008',
    name: 'Furminator Short Hair',
    category: 'Grooming',
    price: 220000,
    barcode: '8888888008',
    imageEmoji: 'content_cut',
    minStock: 2,
    batches: [
      { batchId: 'b008-1', qty: 4, expiredDate: null, receivedDate: '2026-01-05' },
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
      { batchId: 'b013-1', qty: 999, expiredDate: null, receivedDate: '2026-01-01' },
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
      { batchId: 'b014-1', qty: 999, expiredDate: null, receivedDate: '2026-01-01' },
    ],
  }
];

// Helper untuk membuat tanggal hari ini
const today = new Date();
const todayDateStr = today.toISOString().split('T')[0];

export const INITIAL_TRANSACTIONS = [
  {
    id: 'tx_today_1',
    date: `${todayDateStr}T10:00:00`,
    branch: 'pusat',
    cashier: 'Siti Aisyah',
    paymentMethod: 'Tunai',
    items: [
      { productId: 'p001', productName: 'Whiskas Adult Chicken 400g', qty: 1, price: 28000, category: 'Makanan Kering' },
      { productId: 'p013', productName: 'Ongkos Kirim / Antar Jemput', qty: 1, price: 15000, category: 'Ongkos Kirim' }
    ],
    total: 43000,
    paid: 50000,
    change: 7000,
  },
  {
    id: 'tx_today_2',
    date: `${todayDateStr}T11:30:00`,
    branch: 'pusat',
    cashier: 'Siti Aisyah',
    paymentMethod: 'QRIS',
    items: [
      { productId: 'p008', productName: 'Furminator Short Hair', qty: 1, price: 220000, category: 'Grooming' },
    ],
    total: 220000,
    paid: 220000,
    change: 0,
  },
  {
    id: 'tx001',
    date: '2026-04-19T08:30:00',
    branch: 'pusat',
    cashier: 'Siti Aisyah',
    items: [
      { productId: 'p001', productName: 'Whiskas Adult Chicken 400g', qty: 2, price: 28000 },
      { productId: 'p004', productName: 'Temptations Tuna 85g', qty: 1, price: 32000 },
    ],
    total: 88000,
    paid: 100000,
    change: 12000,
  },
  {
    id: 'tx002',
    date: '2026-04-19T10:15:00',
    branch: 'pusat',
    cashier: 'Siti Aisyah',
    items: [
      { productId: 'p002', productName: 'Royal Canin Indoor 2kg', qty: 1, price: 145000 },
    ],
    total: 145000,
    paid: 150000,
    change: 5000,
  },
  {
    id: 'tx003',
    date: '2026-04-18T14:00:00',
    branch: 'gempi',
    cashier: 'Budi Santoso',
    items: [
      { productId: 'p003', productName: 'Pedigree Puppy 1kg', qty: 3, price: 55000 },
    ],
    total: 165000,
    paid: 200000,
    change: 35000,
  },
];

// Transfer/mutasi antar cabang
export const INITIAL_TRANSFERS = [
  {
    id: 'tr001',
    createdAt: '2026-04-19T07:00:00',
    fromBranch: 'pusat',
    toBranch: 'gempi',
    initiatedBy: 'Admin',
    status: 'transit', // 'transit' | 'completed' | 'discrepancy'
    note: 'Restock mingguan',
    items: [
      { productId: 'p001', productName: 'Whiskas Adult Chicken 400g', qtyRequested: 10, qtyReceived: null },
      { productId: 'p004', productName: 'Temptations Tuna 85g', qtyRequested: 5, qtyReceived: null },
    ],
    confirmedAt: null,
    confirmedBy: null,
  },
  {
    id: 'tr002',
    createdAt: '2026-04-18T09:00:00',
    fromBranch: 'pusat',
    toBranch: 'baba',
    initiatedBy: 'Admin',
    status: 'completed',
    note: '',
    items: [
      { productId: 'p002', productName: 'Royal Canin Indoor 2kg', qtyRequested: 3, qtyReceived: 3 },
      { productId: 'p006', productName: 'Vitakraft Vitamin C Tablet', qtyRequested: 5, qtyReceived: 5 },
    ],
    confirmedAt: '2026-04-18T14:30:00',
    confirmedBy: 'Kasir Baba',
  },
  {
    id: 'tr003',
    createdAt: '2026-04-17T11:00:00',
    fromBranch: 'gempi',
    toBranch: 'pusat',
    initiatedBy: 'Admin Gempi',
    status: 'discrepancy',
    note: 'Ada barang pecah saat pengiriman',
    items: [
      { productId: 'p007', productName: 'Tali Leash Kulit Premium', qtyRequested: 3, qtyReceived: 2 },
    ],
    confirmedAt: '2026-04-17T16:00:00',
    confirmedBy: 'Admin',
  },
];

// =============================================
// localStorage Helper Functions
// =============================================

export function getProducts() {
  const stored = localStorage.getItem('calico_products');
  return stored ? JSON.parse(stored) : INITIAL_PRODUCTS;
}

export function saveProducts(products) {
  localStorage.setItem('calico_products', JSON.stringify(products));
}

export function getTransactions() {
  const stored = localStorage.getItem('calico_transactions');
  return stored ? JSON.parse(stored) : INITIAL_TRANSACTIONS;
}

export function saveTransactions(tx) {
  localStorage.setItem('calico_transactions', JSON.stringify(tx));
}

export function getTransfers() {
  const stored = localStorage.getItem('calico_transfers');
  return stored ? JSON.parse(stored) : INITIAL_TRANSFERS;
}

export function saveTransfers(transfers) {
  localStorage.setItem('calico_transfers', JSON.stringify(transfers));
}

// Hitung total stok dari semua batch
export function getTotalStock(product) {
  return product.batches.reduce((sum, b) => sum + b.qty, 0);
}

// Reset semua data ke initial (untuk development/demo)
export function resetAllData() {
  localStorage.setItem('calico_products', JSON.stringify(INITIAL_PRODUCTS));
  localStorage.setItem('calico_transactions', JSON.stringify(INITIAL_TRANSACTIONS));
  localStorage.setItem('calico_transfers', JSON.stringify(INITIAL_TRANSFERS));
}
