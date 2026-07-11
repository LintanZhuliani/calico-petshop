import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { apiFetch } from '../lib/api';
import { useSession } from '../lib/useSession';
import { socket } from '../lib/socket';
import { formatRupiah, generateId } from '../utils/formatters';

// Cloudinary image optimization utility (resizes to 150x150, auto formats & compresses)
function getOptimizedImageUrl(url, width = 150, height = 150) {
  if (!url) return '';
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    return url.replace('/image/upload/', `/image/upload/w_${width},h_${height},c_fill,g_auto,q_auto,f_auto/`);
  }
  return url;
}

// ── Komponen Badge Status Stok ──
function StockBadge({ total, min }) {
  if (total === 0) return <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Habis</span>;
  if (total <= min) return <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">Menipis</span>;
  return <span className="text-[10px] font-bold bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Tersedia</span>;
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

  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
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
    
    // In case onConfirm fails and modal stays open
    setTimeout(() => setIsProcessing(false), 2000);
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

          {/* Toggle Metode Pembayaran */}
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
export default function KasirPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, branchName: branchId } = useSession();
  const isAdmin = role === 'admin';

  // Always use Kasir's theme color (Red) for Checkout to maintain POS consistency, 
  // but we can adjust if you prefer Admin colors
  const primaryText = isAdmin ? 'text-[#D35400]' : 'text-[#C0392B]';
  const primaryBg = isAdmin ? 'bg-[#D35400]' : 'bg-[#C0392B]';
  const primaryLight = isAdmin ? 'bg-orange-50' : 'bg-red-50';

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

  // Cart (kasir/checkout)
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('calico_kasir_cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  useEffect(() => {
    localStorage.setItem('calico_kasir_cart', JSON.stringify(cart));
  }, [cart]);

  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    if (location.state?.cartOpen) {
      setCartOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };



  const fetchProducts = async () => {
    try {
      setIsLoading(products.length === 0);
      const data = await apiFetch(`/products?branchId=${branchId}`);
      setProducts(data);
      try {
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

  // Filter logic
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

  // Tambah ke keranjang
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

  // Proses transaksi
  const handleConfirmCheckout = async (paid, change, paymentMethod = 'Tunai') => {
    try {
      const txItems = cart.map(i => ({ productId: i.id, productName: i.name, qty: i.qty, price: i.price }));
      
      const response = await apiFetch('/transactions', {
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
      
      showToast('Transaksi berhasil!');
      
      // Auto redirect to history to show receipt
      setTimeout(() => {
        navigate('/riwayat', { 
          state: { 
            autoOpenLatest: true 
          } 
        });
      }, 500);
      
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
  const uniqueCats = ['Semua', ...new Set(products.map(p => p.category).filter(c => c && c.toLowerCase() !== 'semua'))];

  return (
    <div className={`bg-slate-100 min-h-screen flex flex-col font-body pb-0 md:pb-0 transition-all duration-300 ${
      sidebarOpen ? 'md:pl-64' : 'md:pl-16'
    }`}>
      {/* ── Toast ── */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl animate-[fadeIn_0.2s_ease]">
          {toastMsg}
        </div>
      )}

      <div className="flex flex-col flex-1 w-full min-h-screen">
        <div className="flex-1 flex flex-col shrink-0 w-full">
          {/* ── Header ── */}
          <header className="bg-white sticky top-0 z-40 border-b border-slate-100 px-5 py-3 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => window.dispatchEvent(new Event('mobile-drawer-toggle'))}
                  className="md:hidden p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center"
                >
                  <span className="material-symbols-outlined !text-[24px]">menu</span>
                </button>
                <h1 className={`font-headline font-extrabold text-xl ${primaryText}`}>
                  Checkout
                </h1>
              </div>
              
              <div className="flex items-center gap-2">
                {cartCount > 0 && (
                  <button onClick={() => setCartOpen(true)}
                    className={`relative flex items-center gap-1.5 ${primaryBg} text-white text-sm font-bold px-3 py-2 rounded-xl active:scale-95 transition-all`}>
                    <span className="material-symbols-outlined !text-[18px]">shopping_cart</span>
                    Keranjang
                    <span className={`absolute -top-2 -right-2 bg-white ${primaryText} text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[${isAdmin ? '#D35400' : '#C0392B'}]`}>
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
              {uniqueCats.map(c => (
                <button key={c} onClick={() => setFilterCat(c)}
                  className={`shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${filterCat === c ? `${primaryBg} text-white` : 'bg-slate-100 text-slate-500'}`}>
                  {c === 'Semua' ? 'SEMUA KATEGORI' : c}
                </button>
              ))}
            </div>
          </header>

          {/* ── Product Grid (1 column layout) ── */}
          <main className="px-5 py-4 grid grid-cols-1 gap-3 w-full">
            {isLoading ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20">
                <div className={`w-10 h-10 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin`}></div>
                <p className="text-sm font-bold text-slate-500 mt-4">Memuat produk...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="col-span-full flex flex-col items-center py-16 text-slate-400">
                <span className="material-symbols-outlined !text-[48px] mb-3">shopping_bag</span>
                <p className="font-bold text-slate-500">Tidak ada produk ditemukan</p>
                <p className="text-sm">Coba ubah filter pencarian</p>
              </div>
            ) : filtered.map(p => {
              const total = p.totalStock || 0;
              const isLow = total <= p.minStock && total > 0;
              const isEmpty = total === 0;
              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-2xl border shadow-sm transition-all active:scale-[0.99] flex flex-col justify-between ${isEmpty ? 'border-red-100 opacity-75' : isLow ? 'border-amber-100' : 'border-slate-100'}`}
                  onClick={() => handleAddToCart(p)}
                >
                  <div className="flex items-center gap-3 p-4">
                    <div className={`w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${primaryLight}`}>
                      {p.image ? (
                        <img src={getOptimizedImageUrl(p.image)} className="w-full h-full object-cover" alt={p.name} />
                      ) : p.imageEmoji ? (
                        <span className={`material-symbols-outlined !text-[28px] md:!text-[32px] ${primaryText}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                          {p.imageEmoji}
                        </span>
                      ) : (
                        <span className="material-symbols-outlined !text-[28px] md:!text-[32px] text-slate-400">shopping_bag</span>
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
                  {/* Tap indicator visible for all in Checkout Mode */}
                  <div className="border-t border-slate-50 py-2 px-4 flex items-center justify-between mt-auto">
                    <p className="text-[10px] text-slate-400">Tap untuk tambah ke keranjang</p>
                    <span className="material-symbols-outlined text-slate-300 !text-[16px]">add_shopping_cart</span>
                  </div>
                </div>
              );
            })}
          </main>
        </div>
      </div>

      {/* ── Cart Bottom Sheet ── */}
      {cartOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setCartOpen(false); }}>
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
                        className={`w-8 h-8 rounded-lg ${primaryBg} flex items-center justify-center font-bold text-white active:scale-95`}
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
                  <span className={`${primaryText} text-lg`}>{formatRupiah(cartTotal)}</span>
                </div>
                <button
                  onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}
                  className={`w-full py-4 ${primaryBg} text-white font-bold rounded-2xl active:scale-95 transition-all text-base`}
                >
                  Lanjut Bayar →
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── Floating Cart Button ── */}
      {cartCount > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className={`fixed bottom-20 right-5 z-40 ${primaryBg} text-white px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 font-bold active:scale-95 transition-all`}>
          <span className="material-symbols-outlined !text-[20px]">shopping_cart</span>
          {cartCount} item · {formatRupiah(cartTotal)}
        </button>
      )}

      {/* ── Checkout Modal ── */}
      {checkoutOpen && <CheckoutModal cart={cart} onClose={() => setCheckoutOpen(false)} onConfirm={handleConfirmCheckout} />}

      <BottomNav />
    </div>
  );
}
