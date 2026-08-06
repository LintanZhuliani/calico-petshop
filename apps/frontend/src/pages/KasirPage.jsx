import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { apiFetch } from '../lib/api';
import { useSession } from '../lib/useSession';
import { socket } from '../lib/socket';
import { formatRupiah, generateId } from '../utils/formatters';
import CheckoutModal from '../components/CheckoutModal';

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
      const s = search.toLowerCase().trim();
      const sNorm = s.replace(/^0+/, '');
      const searchWords = s.split(/\s+/).filter(Boolean);
      const matchSearch = searchWords.length === 0 || searchWords.every(word => 
        (p.name || '').toLowerCase().includes(word) ||
        (p.barcode || '').toLowerCase().includes(word) ||
        (p.barcode && word.replace(/^0+/, '') && p.barcode.replace(/^0+/, '').includes(word.replace(/^0+/, '')))
      );
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
    const sellable = (product.totalStock || 0) - (product.expiredStock || 0);
    if (sellable <= 0) { showToast('Stok habis atau sudah kadaluarsa!'); return; }
    // Use FEFO sell price (Opsi A: harga dari batch paling lama)
    const price = product.fefoSellPrice || product.price;
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        if (existing.qty >= sellable) { showToast('Stok tidak cukup!'); return prev; }
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1, price } : i);
      }
      return [...prev, { id: product.id, name: product.name, price, qty: 1 }];
    });
    showToast(`${product.name} ditambahkan`);
  };

  // Proses transaksi
  const handleConfirmCheckout = async (checkoutData) => {
    try {
      const txItems = cart.map(i => ({ productId: i.id, productName: i.name, qty: i.qty, price: i.price }));
      
      const payload = {
        items: txItems,
        branchId,
        ...checkoutData
      };

      const response = await apiFetch('/transactions', {
        method: 'POST',
        body: payload
      });

      setCart([]);
      setCheckoutOpen(false);
      setCartOpen(false);
      
      showToast('Transaksi berhasil!');
      
      // Auto redirect to history or pending depending on status
      setTimeout(() => {
        if (checkoutData.status === 'PENDING') {
          navigate('/pesanan', { state: { autoOpenLatest: true } });
        } else {
          navigate('/riwayat', { state: { autoOpenLatest: true } });
        }
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
    <div className={`bg-white min-h-screen flex flex-col font-body pb-0 md:pb-0 transition-all duration-300 ${
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
          <header className="bg-white sticky top-0 z-40 border-b border-slate-200 px-5 py-3 flex flex-col gap-3">
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
                  className={`shrink-0 text-sm font-medium capitalize px-4 py-1.5 rounded-lg border transition-all ${filterCat === c ? `${primaryLight} ${primaryText} border-current shadow-[0_2px_8px_rgba(0,0,0,0.04)]` : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                  {c === 'Semua' ? 'Semua' : c}
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
                  className={`bg-white rounded-2xl border shadow-sm transition-all active:scale-[0.99] flex flex-col justify-between ${isEmpty ? 'border-red-100 opacity-75' : isLow ? 'border-amber-100' : 'border-slate-200'}`}
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
                      {p.expiredStock > 0 && (
                        <div className="mt-1 inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          <span className="material-symbols-outlined !text-[12px]">warning</span>
                          {p.expiredStock} kadaluarsa (Tidak bisa dijual)
                        </div>
                      )}
                      <div className="flex items-end justify-between gap-2 mt-1">
                        <span className={`font-bold text-sm md:text-base ${primaryText}`}>
                          {formatRupiah(p.fefoSellPrice !== undefined ? p.fefoSellPrice : p.price)}
                        </span>
                        <span className="text-[10px] sm:text-xs text-slate-500 font-medium shrink-0">{total} unit</span>
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
              <div className="px-6 pt-3 pb-8 shrink-0 border-t border-slate-200 space-y-3">
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
      {checkoutOpen && <CheckoutModal isAdmin={isAdmin} cart={cart} onClose={() => setCheckoutOpen(false)} onConfirm={handleConfirmCheckout} />}

      <BottomNav />
    </div>
  );
}
