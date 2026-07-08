import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { apiFetch } from '../lib/api';
import { socket } from '../lib/socket';
import { formatRupiah, formatDate, generateId, daysUntilExpiry } from '../utils/formatters';
import { getExpiryStatus, getExpiryColorClass } from '../utils/stockAlerts';

// Cloudinary image optimization utility (resizes to 150x150, auto formats & compresses)
function getOptimizedImageUrl(url, width = 150, height = 150) {
  if (!url) return '';
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    return url.replace('/image/upload/', `/image/upload/w_${width},h_${height},c_fill,g_auto,q_auto,f_auto/`);
  }
  return url;
}

const CATEGORIES = [
  "Makanan Kering", "Makanan Basah", "Camilan & Treat", "Susu & Minuman",
  "Vitamin & Suplemen", "Obat-obatan", "Pasir Kucing", "Shampo & Grooming",
  "Aksesoris", "Mainan", "Kandang & Tas", "Grooming", "Ongkos Kirim", "Penginapan Kucing"
];

// ── Komponen Badge Status Stok ──
function StockBadge({ total, min }) {
  if (total === 0) return <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Habis</span>;
  if (total <= min) return <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">Menipis</span>;
  return <span className="text-[10px] font-bold bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Tersedia</span>;
}

// ── Modal Tambah Produk (Admin) ──
function AddProductModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', category: CATEGORIES[0], buyPrice: '', price: '', barcode: '', minStock: 5, image: '', qty: '', expiredDate: '' });
  const [customCat, setCustomCat] = useState('');
  const [showCustomCat, setShowCustomCat] = useState(false);
  const handle = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCategoryChange = (val) => {
    if (val === '__custom__') {
      setShowCustomCat(true);
      setCustomCat('');
    } else {
      setShowCustomCat(false);
      handle('category', val);
    }
  };

  const handleCustomCatConfirm = () => {
    if (customCat.trim()) {
      handle('category', customCat.trim());
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => handle('image', reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!form.name || !form.price) return;
    const finalCategory = showCustomCat ? customCat.trim() : form.category;
    if (!finalCategory) return;
    onSave({
      id: generateId('p'),
      name: form.name,
      category: finalCategory,
      buyPrice: Number(form.buyPrice),
      price: Number(form.price),
      barcode: form.barcode || generateId('BAR'),
      image: form.image,
      minStock: Number(form.minStock),
      batches: form.qty
        ? [{ batchId: generateId('b'), qty: Number(form.qty), expiredDate: form.expiredDate || null, receivedDate: new Date().toISOString().split('T')[0] }]
        : [],
    });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full rounded-t-3xl p-6 pb-10 space-y-4 animate-[slideUp_0.25s_ease]" style={{ maxHeight: '90dvh', overflowY: 'auto' }}>
        <div className="flex justify-between items-center">
          <h2 className="font-headline font-bold text-xl text-slate-900">Tambah Produk</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-100 active:scale-95"><span className="material-symbols-outlined text-slate-500">close</span></button>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Gambar Produk</label>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center border-2 border-dashed ${form.image ? 'border-orange-400 p-0 overflow-hidden bg-slate-50' : 'border-slate-200 bg-slate-50'}`}>
              {form.image ? (
                <img src={getOptimizedImageUrl(form.image)} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-slate-400">add_a_photo</span>
              )}
            </div>
            <label className="flex-1 px-4 py-3 bg-orange-50 text-orange-600 border border-orange-100 rounded-xl font-bold text-sm text-center active:scale-95 transition-all cursor-pointer">
              Upload / Kamera
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
            </label>
          </div>
        </div>
        <InputField label="Nama Produk*" value={form.name} onChange={v => handle('name', v)} placeholder="Whiskas Adult 400g" />
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Kategori</label>
          <select value={showCustomCat ? '__custom__' : form.category} onChange={e => handleCategoryChange(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-orange-400 rounded-2xl text-slate-800 font-medium outline-none">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            <option value="__custom__">+ Tambah Kategori Baru</option>
          </select>
          {showCustomCat && (
            <div className="flex gap-2 mt-2">
              <input
                type="text" value={customCat}
                onChange={e => { setCustomCat(e.target.value); }}
                onBlur={handleCustomCatConfirm}
                placeholder="Ketik nama kategori baru..."
                className="flex-1 px-4 py-3 bg-orange-50 border-2 border-orange-200 focus:border-orange-400 rounded-2xl text-slate-800 font-medium outline-none transition-all placeholder:text-orange-300"
                autoFocus
              />
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Harga Beli (Rp)" type="number" value={form.buyPrice} onChange={v => handle('buyPrice', v)} placeholder="20000" />
          <InputField label="Harga Jual (Rp)*" type="number" value={form.price} onChange={v => handle('price', v)} placeholder="28000" />
        </div>
        <InputField label="Barcode" value={form.barcode} onChange={v => handle('barcode', v)} placeholder="8888888001" />
        <InputField label="Stok Minimum (Alert)" type="number" value={form.minStock} onChange={v => handle('minStock', v)} placeholder="10" />
        <div className="border-t border-slate-100 pt-3">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-3">Stok Awal (Opsional)</p>
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Jumlah" type="number" value={form.qty} onChange={v => handle('qty', v)} placeholder="0" />
            <InputField label="Tgl Expired" type="date" value={form.expiredDate} onChange={v => handle('expiredDate', v)} />
          </div>
        </div>
        <button onClick={handleSave} className="w-full py-4 bg-[#D35400] hover:bg-[#b84800] text-white font-bold rounded-2xl active:scale-95 transition-all">
          Simpan Produk
        </button>
      </div>
    </div>
  );
}

// ── Modal Tambah Stok (Admin) ──
function AddStockModal({ product, onClose, onSave }) {
  const [qty, setQty] = useState('');
  const [expiredDate, setExpiredDate] = useState('');
  const handleSave = () => {
    if (!qty || Number(qty) <= 0) return;
    onSave({ batchId: generateId('b'), qty: Number(qty), expiredDate: expiredDate || null, receivedDate: new Date().toISOString().split('T')[0] });
  };
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full rounded-t-3xl p-6 pb-10 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-headline font-bold text-xl text-slate-900">Tambah Stok</h2>
            <p className="text-sm text-slate-500">{product.name} — Sesi Pengisian Ke-{(product.batches?.length || 0) + 1}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-100"><span className="material-symbols-outlined text-slate-500">close</span></button>
        </div>
        <div className="bg-slate-50 rounded-2xl p-4 flex justify-between items-center">
          <span className="text-sm text-slate-500">Stok Saat Ini</span>
          <span className="font-bold text-slate-900">{product.totalStock || 0} unit</span>
        </div>
        <InputField label="Jumlah Masuk*" type="number" value={qty} onChange={setQty} placeholder="0" />
        <InputField label="Tanggal Expired (kosongkan jika tidak ada)" type="date" value={expiredDate} onChange={setExpiredDate} />
        <button onClick={handleSave} className="w-full py-4 bg-[#D35400] hover:bg-[#b84800] text-white font-bold rounded-2xl active:scale-95 transition-all">
          + Tambah Stok
        </button>
      </div>
    </div>
  );
}

// ── Modal Edit Produk (Admin) ──
function EditProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState({
    name: product.name || '',
    category: product.category || CATEGORIES[0],
    buyPrice: product.buyPrice || '',
    price: product.price || '',
    barcode: product.barcode || '',
    minStock: product.minStock || 5,
    image: product.image || '',
    stock: product.totalStock || 0,
  });
  const [customCat, setCustomCat] = useState('');
  const [showCustomCat, setShowCustomCat] = useState(false);
  const handle = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCategoryChange = (val) => {
    if (val === '__custom__') {
      setShowCustomCat(true);
      setCustomCat('');
    } else {
      setShowCustomCat(false);
      handle('category', val);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => handle('image', reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    const finalCategory = showCustomCat ? customCat.trim() : form.category;
    if (!finalCategory) return;

    // 1) Save changes (handleEditComplete handles stock override first, then product update)
    await onSave(
      product.id, 
      {
        name: form.name,
        category: finalCategory,
        buyPrice: Number(form.buyPrice) || 0,
        price: Number(form.price),
        barcode: form.barcode,
        minStock: Number(form.minStock),
        image: form.image || null,
      },
      product.totalStock || 0,
      Number(form.stock) || 0
    );
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full rounded-t-3xl p-6 pb-10 space-y-4" style={{ maxHeight: '90dvh', overflowY: 'auto' }}>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-headline font-bold text-xl text-slate-900">Edit Produk</h2>
            <p className="text-sm text-slate-400">{product.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-100 active:scale-95"><span className="material-symbols-outlined text-slate-500">close</span></button>
        </div>

        {/* Image Upload */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Gambar Produk</label>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center border-2 border-dashed overflow-hidden ${
              form.image ? 'border-orange-400 bg-slate-50' : 'border-slate-200 bg-slate-50'
            }`}>
              {form.image ? (
                <img src={getOptimizedImageUrl(form.image)} alt="Preview" className="w-full h-full object-cover" />
              ) : product.imageEmoji ? (
                <span className="material-symbols-outlined text-slate-400 !text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>{product.imageEmoji}</span>
              ) : (
                <span className="material-symbols-outlined text-slate-300 !text-[28px]">add_a_photo</span>
              )}
            </div>
            <label className="flex-1 px-4 py-3 bg-orange-50 text-orange-600 border border-orange-100 rounded-xl font-bold text-sm text-center active:scale-95 transition-all cursor-pointer">
              {form.image ? 'Ganti Gambar' : 'Upload / Kamera'}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
            </label>
            {form.image && (
              <button onClick={() => handle('image', '')} className="p-2 bg-red-50 rounded-xl">
                <span className="material-symbols-outlined text-red-400 !text-[20px]">delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Name (editable) */}
        <InputField label="Nama Produk*" value={form.name} onChange={v => handle('name', v)} placeholder="Nama produk" />

        {/* Category with custom option */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Kategori</label>
          <select value={showCustomCat ? '__custom__' : form.category} onChange={e => handleCategoryChange(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-orange-400 rounded-2xl text-slate-800 font-medium outline-none">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            {/* If current category isn't in CATEGORIES, show it too */}
            {!CATEGORIES.includes(form.category) && !showCustomCat && (
              <option key={form.category}>{form.category}</option>
            )}
            <option value="__custom__">+ Tambah Kategori Baru</option>
          </select>
          {showCustomCat && (
            <input
              type="text" value={customCat}
              onChange={e => setCustomCat(e.target.value)}
              placeholder="Ketik nama kategori baru..."
              className="w-full mt-2 px-4 py-3 bg-orange-50 border-2 border-orange-200 focus:border-orange-400 rounded-2xl text-slate-800 font-medium outline-none transition-all placeholder:text-orange-300"
              autoFocus
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InputField label="Harga Beli (Rp)" type="number" value={form.buyPrice} onChange={v => handle('buyPrice', v)} placeholder="20000" />
          <InputField label="Harga Jual (Rp)*" type="number" value={form.price} onChange={v => handle('price', v)} placeholder="28000" />
        </div>

        {form.buyPrice && form.price && Number(form.price) > 0 && (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-3 flex justify-between items-center">
            <span className="text-sm font-semibold text-green-700">Estimasi Margin</span>
            <span className="font-bold text-green-700">
              {Math.round(((Number(form.price) - Number(form.buyPrice)) / Number(form.price)) * 100)}%
              &nbsp;·&nbsp;
              {formatRupiah(Number(form.price) - Number(form.buyPrice))}
            </span>
          </div>
        )}

        <InputField label="Barcode" value={form.barcode} onChange={v => handle('barcode', v)} placeholder="8888888001" />
        
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Stok Minimum (Alert)" type="number" value={form.minStock} onChange={v => handle('minStock', v)} placeholder="10" />
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Timpa Total Stok Cabang</label>
            <input
              type="number"
              value={form.stock}
              onChange={e => handle('stock', e.target.value)}
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 focus:border-[#D35400] rounded-2xl text-slate-900 font-bold outline-none transition-all"
            />
          </div>
        </div>

        {/* List of Batches / Sessions */}
        {product.batches && product.batches.length > 0 && (
          <div className="space-y-2 mt-4">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Riwayat Sesi Stok (FEFO)</label>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {product.batches.map((b, i) => {
                const isExpired = b.expiredDate && new Date(b.expiredDate).getTime() < Date.now();
                return (
                  <div key={b.id} className={`flex items-center justify-between p-3 rounded-xl border ${isExpired ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">Sesi {i + 1}</span>
                      <span className="text-[10px] opacity-80">Tgl Masuk: {new Date(b.createdAt).toLocaleDateString('id-ID')}</span>
                    </div>
                    <div className="flex flex-col items-end text-right">
                      <span className="font-bold">{b.qty} unit</span>
                      {b.expiredDate ? (
                        <span className={`text-[10px] font-semibold ${isExpired ? 'line-through opacity-80' : 'text-orange-500'}`}>
                          Exp: {new Date(b.expiredDate).toLocaleDateString('id-ID')}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Tanpa Exp</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button onClick={handleSave} className="w-full py-4 bg-[#D35400] hover:bg-[#b84800] text-white font-bold rounded-2xl active:scale-95 transition-all">
          Simpan Perubahan
        </button>
      </div>
    </div>
  );
}

// ── Modal Checkout (Kasir) ──
function CheckoutModal({ cart, onClose, onConfirm }) {
  const [paid, setPaid] = useState('');
  const [payMethod, setPayMethod] = useState('tunai');       // 'tunai' | 'nontunai' | 'campuran'
  const [nonTunaiType, setNonTunaiType] = useState('qris'); // 'qris' | 'transfer' | 'edc'

  // Campuran (split payment)
  const [splitNonTunai, setSplitNonTunai] = useState('');
  const [splitCash, setSplitCash] = useState('');
  const [splitNonTunaiType, setSplitNonTunaiType] = useState('qris');

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  // Fungsi pembersih: hapus titik ribuan agar "40.000" terbaca sebagai 40000
  const parseAmount = (str) => Number(String(str).replace(/\./g, '').replace(/,/g, ''));

  const change = parseAmount(paid) - total;
  const QUICK_PAYS = [
    total,
    Math.ceil(total / 10000) * 10000 + 10000,
    Math.ceil(total / 50000) * 50000,
    Math.ceil(total / 100000) * 100000,
  ];

  const NON_TUNAI_OPTS = [
    { key: 'qris',     label: 'QRIS',     icon: 'qr_code_2' },
    { key: 'transfer', label: 'Transfer', icon: 'account_balance' },
    { key: 'edc',      label: 'EDC',      icon: 'credit_card' },
  ];

  // Campuran: hitung sisa yang harus dibayar cash
  const splitNonTunaiAmt = parseAmount(splitNonTunai);
  const splitCashAmt = parseAmount(splitCash);
  const sisaCash = total - splitNonTunaiAmt; // sisa yang harus dibayar tunai
  const splitChange = splitCashAmt - sisaCash; // kembalian dari uang tunai

  // Validasi
  const canConfirmTunai = payMethod === 'tunai' && paid !== '' && change >= 0;
  const canConfirmNonTunai = payMethod === 'nontunai';
  const canConfirmCampuran = payMethod === 'campuran' 
    && splitNonTunaiAmt > 0 
    && splitNonTunaiAmt < total 
    && splitCashAmt >= sisaCash
    && sisaCash > 0;

  const handleConfirm = () => {
    if (payMethod === 'tunai') {
      onConfirm(parseAmount(paid), change, 'Tunai');
    } else if (payMethod === 'nontunai') {
      const labels = { qris: 'QRIS', transfer: 'Transfer Bank', edc: 'EDC / Debit' };
      onConfirm(total, 0, labels[nonTunaiType]);
    } else {
      // Campuran
      const ntLabel = { qris: 'QRIS', transfer: 'Transfer', edc: 'EDC' }[splitNonTunaiType];
      const methodLabel = `Campuran (${ntLabel} ${formatRupiah(splitNonTunaiAmt)} + Tunai ${formatRupiah(splitCashAmt)})`;
      onConfirm(splitNonTunaiAmt + splitCashAmt, Math.max(0, splitChange), methodLabel);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full rounded-t-3xl flex flex-col" style={{ maxHeight: '92dvh' }}>

        {/* Header */}
        <div className="flex justify-between items-center px-6 pt-6 pb-4 shrink-0">
          <h2 className="font-headline font-bold text-xl text-slate-900">Konfirmasi Pembayaran</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-100 active:scale-95">
            <span className="material-symbols-outlined text-slate-500">close</span>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-4">

          {/* Ringkasan item */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-slate-700">{item.name} ×{item.qty}</span>
                <span className="font-semibold text-slate-900">{formatRupiah(item.price * item.qty)}</span>
              </div>
            ))}
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900">
              <span>Total</span>
              <span className="text-[#C0392B] text-base">{formatRupiah(total)}</span>
            </div>
          </div>

          {/* Toggle Metode Pembayaran (3 opsi) */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Metode Pembayaran</p>
            <div className="bg-slate-100 p-1 rounded-2xl flex gap-1">
              {[
                { key: 'tunai', icon: 'payments', label: 'Tunai' },
                { key: 'nontunai', icon: 'credit_card', label: 'Non-Tunai' },
                { key: 'campuran', icon: 'join', label: 'Campuran' },
              ].map(m => (
                <button
                  key={m.key}
                  onClick={() => setPayMethod(m.key)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1
                    ${payMethod === m.key ? 'bg-white text-[#C0392B] shadow-sm' : 'text-slate-400'}`}
                >
                  <span className="material-symbols-outlined !text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tunai ── */}
          {payMethod === 'tunai' && (
            <div className="space-y-3">
              <InputField label="Uang Dibayar" type="number" value={paid} onChange={setPaid} placeholder={String(total)} />
              <div className="flex gap-2 flex-wrap">
                {[...new Set(QUICK_PAYS)].map(p => (
                  <button key={p} onClick={() => setPaid(String(p))}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 active:scale-95 transition-all">
                    {formatRupiah(p)}
                  </button>
                ))}
              </div>
              {paid && (
                <div className={`rounded-2xl p-4 text-center ${change >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{change >= 0 ? 'Kembalian' : 'Kurang'}</p>
                  <p className={`text-2xl font-extrabold font-headline ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatRupiah(Math.abs(change))}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Non-Tunai ── */}
          {payMethod === 'nontunai' && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pilih Tipe Non-Tunai</p>
              <div className="grid grid-cols-3 gap-2.5">
                {NON_TUNAI_OPTS.map(opt => (
                  <button key={opt.key} onClick={() => setNonTunaiType(opt.key)}
                    className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 font-bold text-sm transition-all active:scale-95
                      ${nonTunaiType === opt.key ? 'border-[#C0392B] bg-red-50 text-[#C0392B]' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}>
                    <span className="material-symbols-outlined !text-[28px]" style={{ fontVariationSettings: nonTunaiType === opt.key ? "'FILL' 1" : "'FILL' 0" }}>{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400 !text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                <p className="text-xs text-blue-700 font-medium">
                  Pembayaran via <strong>{{ qris: 'QRIS', transfer: 'Transfer Bank', edc: 'EDC / Debit' }[nonTunaiType]}</strong> sebesar <strong>{formatRupiah(total)}</strong> tidak memerlukan kembalian.
                </p>
              </div>
            </div>
          )}

          {/* ── Campuran (Split Payment) ── */}
          {payMethod === 'campuran' && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-start gap-2">
                <span className="material-symbols-outlined text-amber-500 !text-[20px] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                <p className="text-xs text-amber-800 font-medium">
                  Pelanggan membayar sebagian dengan <strong>saldo digital / kartu</strong>, dan sisanya dengan <strong>uang tunai</strong>.
                </p>
              </div>

              {/* Pilih tipe non-tunai untuk split */}
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipe Saldo / Kartu</p>
              <div className="grid grid-cols-3 gap-2">
                {NON_TUNAI_OPTS.map(opt => (
                  <button key={opt.key} onClick={() => setSplitNonTunaiType(opt.key)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 font-bold text-xs transition-all active:scale-95
                      ${splitNonTunaiType === opt.key ? 'border-[#C0392B] bg-red-50 text-[#C0392B]' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                    <span className="material-symbols-outlined !text-[22px]" style={{ fontVariationSettings: splitNonTunaiType === opt.key ? "'FILL' 1" : "'FILL' 0" }}>{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Input jumlah non-tunai */}
              <InputField 
                label={`Jumlah Bayar via ${({ qris: 'QRIS', transfer: 'Transfer', edc: 'EDC' })[splitNonTunaiType]}`}
                type="number" value={splitNonTunai} onChange={setSplitNonTunai} 
                placeholder="Contoh: 20000" 
              />

              {/* Otomatis hitung sisa */}
              {splitNonTunaiAmt > 0 && splitNonTunaiAmt < total && (
                <>
                  <div className="bg-slate-50 rounded-2xl p-3 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Sisa Bayar Tunai</span>
                    <span className="font-extrabold text-slate-900 font-headline">{formatRupiah(sisaCash)}</span>
                  </div>

                  <InputField label="Uang Tunai Pelanggan" type="number" value={splitCash} onChange={setSplitCash} placeholder={String(sisaCash)} />

                  {splitCashAmt > 0 && (
                    <div className={`rounded-2xl p-4 text-center ${splitChange >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{splitChange >= 0 ? 'Kembalian Tunai' : 'Masih Kurang'}</p>
                      <p className={`text-2xl font-extrabold font-headline ${splitChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatRupiah(Math.abs(splitChange))}
                      </p>
                    </div>
                  )}
                </>
              )}

              {splitNonTunaiAmt >= total && splitNonTunaiAmt > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
                  <p className="text-xs text-amber-700 font-bold">Jumlah saldo sudah melebihi total. Gunakan metode Non-Tunai saja.</p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer: tombol konfirmasi */}
        <div className="px-6 pt-3 pb-8 shrink-0 border-t border-slate-100">
          <button
            onClick={handleConfirm}
            disabled={
              payMethod === 'tunai' ? !canConfirmTunai :
              payMethod === 'campuran' ? !canConfirmCampuran :
              false
            }
            className="w-full py-4 bg-[#C0392B] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-2xl active:scale-95 transition-all text-base flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined !text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            {payMethod === 'tunai' ? 'Selesaikan Transaksi' :
             payMethod === 'nontunai' ? `Bayar via ${{ qris: 'QRIS', transfer: 'Transfer', edc: 'EDC' }[nonTunaiType]}` :
             'Konfirmasi Pembayaran Campuran'}
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Input Field Helper ──
function InputField({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-orange-400 rounded-2xl text-slate-800 font-medium outline-none transition-all placeholder:text-slate-300"
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function ProductsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const role = location.state?.role || 'kasir';
  const isAdmin = role === 'admin';

  const primaryText = isAdmin ? 'text-[#D35400]' : 'text-[#C0392B]';
  const primaryBg = isAdmin ? 'bg-[#D35400]' : 'bg-[#C0392B]';
  const primaryLight = isAdmin ? 'bg-orange-50' : 'bg-red-50';
  const primaryBorder = isAdmin ? 'focus:border-[#D35400]' : 'focus:border-[#C0392B]';

  const [products, setProducts] = useState(() => {
    try {
      const cached = localStorage.getItem('calico_products_cache');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [addStockTarget, setAddStockTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  // Cart (kasir)
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const branchId = location.state?.branchName || 'pusat';

  const fetchProducts = async () => {
    try {
      setIsLoading(products.length === 0);
      const data = await apiFetch(`/products?branchId=${branchId}`);
      setProducts(data);
      try {
        // Strip base64 images to prevent QuotaExceededError and keep stringify fast
        const lightData = data.map(p => ({ ...p, image: p.image?.startsWith('data:') ? null : p.image }));
        localStorage.setItem('calico_products_cache', JSON.stringify(lightData));
      } catch (e) {
        console.warn("Could not cache products:", e);
      }
    } catch (err) {
      showToast('Gagal memuat produk: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    
    // Real-time synchronization
    const onDataUpdated = () => fetchProducts();
    socket.on('DATA_UPDATED', onDataUpdated);
    
    return () => {
      socket.off('DATA_UPDATED', onDataUpdated);
    };
  }, [branchId]);

  // Filter logic (Optimized with useMemo to prevent lag)
  const filtered = useMemo(() => {
    return products.filter(p => {
      const s = search.toLowerCase();
      const matchSearch = (p.name || '').toLowerCase().includes(s) ||
        (p.barcode || '').toLowerCase().includes(s);
      const matchCat = filterCat === 'Semua' || p.category === filterCat;
      const total = p.totalStock || 0;
      const matchStatus = filterStatus === 'Semua'
        ? true
        : filterStatus === 'Kritis' ? total <= p.minStock
          : filterStatus === 'Habis' ? total === 0
            : true;
      return matchSearch && matchCat && matchStatus;
    });
  }, [products, search, filterCat, filterStatus]);

  // Admin: Simpan produk baru
  const handleSaveProduct = async (newProd) => {
    try {
      // Create product
      const created = await apiFetch('/products', { method: 'POST', body: newProd });
      
      // If there's initial stock, add it
      if (newProd.batches && newProd.batches.length > 0) {
        const batch = newProd.batches[0];
        await apiFetch(`/products/${created.id}/stock`, {
          method: 'POST',
          body: {
            branchId: branchId,
            qty: batch.qty,
            expiredDate: batch.expiredDate
          }
        });
      }
      
      showToast('Produk berhasil ditambahkan!');
      fetchProducts();
      setAddProductOpen(false);
    } catch (err) {
      showToast('Gagal: ' + err.message);
    }
  };

  // Admin: Tambah batch stok
  const handleAddStock = async (batch) => {
    try {
      await apiFetch(`/products/${addStockTarget.id}/stock`, {
        method: 'POST',
        body: {
          branchId: branchId,
          qty: batch.qty,
          expiredDate: batch.expiredDate
        }
      });
      showToast('Stok berhasil ditambahkan!');
      fetchProducts();
      setAddStockTarget(null);
    } catch (err) {
      showToast('Gagal: ' + err.message);
    }
  };

  // Admin: Edit produk (global info — name, image, category, prices)
  const handleEditProduct = async (id, updates) => {
    try {
      await apiFetch(`/products/${id}`, { method: 'PUT', body: updates });
    } catch (err) {
      showToast('Gagal update produk: ' + err.message);
      throw err;
    }
  };

  // Admin: Override total stock (branch-specific correction)
  const handleOverrideStock = async (productId, oldTotal, newTotal) => {
    try {
      const diff = newTotal - oldTotal;
      if (diff === 0) return;
      
      if (diff > 0) {
        // Add stock
        await apiFetch(`/products/${productId}/stock`, {
          method: 'POST',
          body: { branchId, qty: diff }
        });
      } else {
        // Deduct stock (FEFO)
        await apiFetch(`/products/${productId}/stock/deduct`, {
          method: 'POST',
          body: { branchId, qty: Math.abs(diff) }
        });
      }
    } catch (err) {
      showToast('Gagal update stok: ' + err.message);
      throw err;
    }
  };

  // Wrapper called from EditProductModal after all saves complete
  const handleEditComplete = async (id, updates, oldStock, newStock) => {
    try {
      if (oldStock !== newStock) {
        await handleOverrideStock(id, oldStock, newStock);
      }
      await handleEditProduct(id, updates);
      showToast('Produk berhasil diperbarui!');
      fetchProducts();
      setEditTarget(null);
    } catch (err) {
      // errors already toasted
    }
  };

  // Admin: Hapus produk
  const handleDelete = async (id) => {
    if (!window.confirm('Yakin hapus produk ini?')) return;
    try {
      await apiFetch(`/products/${id}`, { method: 'DELETE' });
      showToast('Produk dihapus.');
      fetchProducts();
    } catch (err) {
      showToast('Gagal: ' + err.message);
    }
  };

  // Kasir: Tambah ke keranjang
  const handleAddToCart = (product) => {
    const total = product.totalStock || 0;
    if (total === 0) { showToast('Stok habis!'); return; }
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        if (existing.qty >= total) { showToast('Stok tidak cukup!'); return prev; }
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1 }];
    });
    showToast(`${product.name} ditambahkan`);
  };

  // Kasir: Proses transaksi
  const handleConfirmCheckout = async (paid, change, paymentMethod = 'Tunai') => {
    try {
      const txItems = cart.map(i => ({ productId: i.id, productName: i.name, qty: i.qty, price: i.price }));
      
      await apiFetch('/transactions', {
        method: 'POST',
        body: {
          items: txItems,
          paid,
          change,
          paymentMethod,
          branchId
        }
      });

      setCart([]);
      setCheckoutOpen(false);
      setCartOpen(false);
      
      const toastDetail = paymentMethod === 'Tunai'
        ? 'Kembalian: ' + formatRupiah(change)
        : 'via ' + paymentMethod;
      showToast('Transaksi berhasil! ' + toastDetail);
      
      fetchProducts(); // Refresh stock
    } catch (err) {
      showToast('Transaksi gagal: ' + err.message);
    }
  };

  // Track sidebar toggle state dynamically
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('calico_sidebar_open');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    const handleSidebarToggle = () => {
      const saved = localStorage.getItem('calico_sidebar_open');
      setSidebarOpen(saved !== null ? JSON.parse(saved) : true);
    };
    window.addEventListener('sidebar-toggle', handleSidebarToggle);
    return () => window.removeEventListener('sidebar-toggle', handleSidebarToggle);
  }, []);

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const uniqueCats = ['Semua', ...new Set(products.map(p => p.category))];

  return (
    <div className={`bg-slate-100 min-h-screen flex flex-col font-body pb-20 md:pb-0 transition-all duration-300 ${
      sidebarOpen ? 'md:pl-64' : 'md:pl-16'
    }`}>
      {/* ── Toast ── */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl animate-[fadeIn_0.2s_ease]">
          {toastMsg}
        </div>
      )}

      {/* Main layout wrapper: splitscreen on desktop has been removed to allow full width as requested */}
      <div className="flex flex-col flex-1 w-full min-h-screen">
        
        {/* Full-width container: Search, Filters, Product Grid */}
        <div className="flex-1 flex flex-col shrink-0 w-full">
          {/* ── Header ── */}
          <header className="bg-white sticky top-0 z-40 border-b border-slate-100 px-5 pt-4 pb-3 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h1 className={`font-headline font-extrabold text-xl ${primaryText}`}>
                  {isAdmin ? 'Produk (Admin)' : 'Kasir POS'}
                </h1>
              </div>
              
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button onClick={() => setAddProductOpen(true)}
                    className={`flex items-center gap-1.5 ${primaryBg} text-white text-sm font-bold px-3 py-2 rounded-xl active:scale-95 transition-all`}>
                    <span className="material-symbols-outlined !text-[18px]">add</span>
                    Tambah
                  </button>
                )}
                {/* Cart Button visible on both mobile and desktop (since POS Cart aside is removed) */}
                {!isAdmin && cartCount > 0 && (
                  <button onClick={() => setCartOpen(true)}
                    className="relative flex items-center gap-1.5 bg-[#C0392B] text-white text-sm font-bold px-3 py-2 rounded-xl active:scale-95 transition-all">
                    <span className="material-symbols-outlined !text-[18px]">shopping_cart</span>
                    Keranjang
                    <span className="absolute -top-2 -right-2 bg-white text-[#C0392B] text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#C0392B]">
                      {cartCount}
                    </span>
                  </button>
                )}
              </div>
            </div>
            {/* Search */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 !text-[20px]">search</span>
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Cari nama produk atau barcode..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-transparent focus:border-orange-300 rounded-xl text-sm text-slate-700 outline-none transition-all"
                />
              </div>
              <button 
                onClick={() => navigate('/scan', { state: location.state })}
                className={`p-2.5 rounded-xl ${primaryLight} ${primaryText} hover:opacity-80 transition-all flex items-center justify-center shrink-0 border border-transparent shadow-sm`}
              >
                <span className="material-symbols-outlined !text-[22px]">qr_code_scanner</span>
              </button>
            </div>
            {/* Filter Chips */}
            <div className="flex gap-2 overflow-x-auto py-2 -mx-1 px-1 scrollbar-hide">
              {['Semua', 'Kritis', 'Habis'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg transition-all ${filterStatus === s ? `${primaryBg} text-white` : 'bg-slate-100 text-slate-500'}`}>
                  {s}
                </button>
              ))}
              <div className="w-px bg-slate-200 my-1" />
              {uniqueCats.map(c => (
                <button key={c} onClick={() => setFilterCat(c)}
                  className={`shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${filterCat === c ? `${primaryBg} text-white` : 'bg-slate-100 text-slate-500'}`}>
                  {c}
                </button>
              ))}
            </div>
          </header>

          {/* ── Product Grid (1 column per line layout as requested) ── */}
          <main className="px-4 py-4 grid grid-cols-1 gap-3 w-full max-w-xl md:max-w-5xl mx-auto">
            {isLoading ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20">
                <div className={`w-10 h-10 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin`}></div>
                <p className="text-sm font-bold text-slate-500 mt-4">Memuat produk...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="col-span-full flex flex-col items-center py-16 text-slate-400">
                <span className="material-symbols-outlined !text-[48px] mb-3">inventory_2</span>
                <p className="font-bold text-slate-500">Tidak ada produk ditemukan</p>
                <p className="text-sm">Coba ubah filter atau tambah produk baru</p>
              </div>
            ) : filtered.map(p => {
              const total = p.totalStock || 0;
              const isLow = total <= p.minStock && total > 0;
              const isEmpty = total === 0;
              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-2xl border shadow-sm transition-all active:scale-[0.99] flex flex-col justify-between ${isEmpty ? 'border-red-100 opacity-75' : isLow ? 'border-amber-100' : 'border-slate-100'}`}
                  onClick={() => !isAdmin && handleAddToCart(p)}
                >
                  <div className="flex items-center gap-3 p-4">
                    <div className={`w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${isAdmin ? 'bg-orange-50' : 'bg-red-50'}`}>
                      {p.image ? (
                        <img src={getOptimizedImageUrl(p.image)} className="w-full h-full object-cover" alt={p.name} />
                      ) : p.imageEmoji ? (
                        <span className={`material-symbols-outlined !text-[28px] md:!text-[32px] ${isAdmin ? 'text-orange-500' : 'text-red-500'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                          {p.imageEmoji}
                        </span>
                      ) : (
                        <span className="material-symbols-outlined !text-[28px] md:!text-[32px] text-slate-400">inventory_2</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900 text-sm md:text-base leading-tight truncate">{p.name}</p>
                        <StockBadge total={total} min={p.minStock} />
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{p.category}</p>
                      {p.expiredStock > 0 && (
                        <div className="mt-1 inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          <span className="material-symbols-outlined !text-[12px]">warning</span>
                          {p.expiredStock} kadaluarsa (Tidak bisa dijual)
                        </div>
                      )}
                      <div className="flex items-baseline justify-between mt-1.5 gap-2">
                        <span className={`font-bold text-sm md:text-base ${primaryText}`}>{formatRupiah(p.price)}</span>
                        <span className="text-xs text-slate-500 font-medium shrink-0">{total} unit layak jual</span>
                      </div>
                    </div>
                  </div>
                  {/* Admin Actions */}
                  {isAdmin && (
                    <div className="border-t border-slate-100 flex">
                      <button onClick={(e) => { e.stopPropagation(); setEditTarget(p); }}
                        className="flex-1 py-2.5 flex items-center justify-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors rounded-bl-2xl">
                        <span className="material-symbols-outlined !text-[16px]">edit</span> Edit
                      </button>
                      <div className="w-px bg-slate-100" />
                      <button onClick={(e) => { e.stopPropagation(); setAddStockTarget(p); }}
                        className="flex-1 py-2.5 flex items-center justify-center gap-1 text-xs font-bold text-orange-500 hover:text-orange-700 hover:bg-orange-50 transition-colors">
                        <span className="material-symbols-outlined !text-[16px]">add_circle</span> Stok
                      </button>
                      <div className="w-px bg-slate-100" />
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                        className="flex-1 py-2.5 flex items-center justify-center gap-1 text-xs font-bold text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors rounded-br-2xl">
                        <span className="material-symbols-outlined !text-[16px]">delete</span> Hapus
                      </button>
                    </div>
                  )}
                  {/* Kasir: tap indicator */}
                  {!isAdmin && (
                    <div className="border-t border-slate-50 py-2 px-4 flex items-center justify-between mt-auto">
                      <p className="text-[10px] text-slate-400">Tap untuk tambah ke keranjang</p>
                      <span className="material-symbols-outlined text-slate-300 !text-[16px]">add_shopping_cart</span>
                    </div>
                  )}
                </div>
              );
            })}
          </main>
        </div>
      </div>

      {/* ── Kasir: Cart Bottom Sheet (Visible on both mobile & desktop) ── */}
      {!isAdmin && cartOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setCartOpen(false); }}>
          {/* Sheet ── flex column agar footer tidak ikut scroll */}
          <div className="bg-white w-full max-w-md rounded-3xl flex flex-col" style={{ maxHeight: '80dvh' }}>

            {/* ── Header ── */}
            <div className="flex justify-between items-center px-6 pt-6 pb-4 shrink-0">
              <h2 className="font-headline font-bold text-xl text-slate-900">🛒 Keranjang</h2>
              <button onClick={() => setCartOpen(false)} className="p-2 rounded-xl bg-slate-100 active:scale-95">
                <span className="material-symbols-outlined text-slate-500">close</span>
              </button>
            </div>

            {/* ── Scrollable list ── */}
            <div className="flex-1 overflow-y-auto px-6 pb-2">
              {cart.length === 0 && (
                <p className="text-center text-slate-400 py-8">Keranjang kosong</p>
              )}
              <div className="space-y-2">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                    <div>
                      <p className="font-semibold text-sm text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-500">{formatRupiah(item.price)} / unit</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCart(prev => prev.map(i => i.id === item.id ? { ...i, qty: Math.max(1, i.qty - 1) } : i))}
                        className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center font-bold text-slate-700 active:scale-95"
                      >-</button>
                      <span className="w-6 text-center font-bold text-slate-900">{item.qty}</span>
                      <button
                        onClick={() => setCart(prev => prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i))}
                        className="w-8 h-8 rounded-lg bg-[#C0392B] flex items-center justify-center font-bold text-white active:scale-95"
                      >+</button>
                      <button
                        onClick={() => setCart(prev => prev.filter(i => i.id !== item.id))}
                        className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center active:scale-95"
                      >
                        <span className="material-symbols-outlined text-red-500 !text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Footer ── */}
            {cart.length > 0 && (
              <div className="px-6 pt-3 pb-8 shrink-0 border-t border-slate-100 space-y-3">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Total</span>
                  <span className="text-[#C0392B] text-lg">{formatRupiah(cartTotal)}</span>
                </div>
                <button
                  onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}
                  className="w-full py-4 bg-[#C0392B] text-white font-bold rounded-2xl active:scale-95 transition-all text-base"
                >
                  Lanjut Bayar →
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── Kasir: Floating Cart Button (Visible on both mobile & desktop) ── */}
      {!isAdmin && cartCount > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-20 right-5 z-40 bg-[#C0392B] text-white px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 font-bold active:scale-95 transition-all">
          <span className="material-symbols-outlined !text-[20px]">shopping_cart</span>
          {cartCount} item · {formatRupiah(cartTotal)}
        </button>
      )}

      {/* ── Modals ── */}
      {addProductOpen && <AddProductModal onClose={() => setAddProductOpen(false)} onSave={handleSaveProduct} />}
      {addStockTarget && <AddStockModal product={addStockTarget} onClose={() => setAddStockTarget(null)} onSave={handleAddStock} />}
      {editTarget && <EditProductModal product={editTarget} onClose={() => setEditTarget(null)} onSave={handleEditComplete} />}
      {checkoutOpen && <CheckoutModal cart={cart} onClose={() => setCheckoutOpen(false)} onConfirm={handleConfirmCheckout} />}

      <BottomNav />
    </div>
  );
}

