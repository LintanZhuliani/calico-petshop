import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/useSession';
import BottomNav from '../components/BottomNav';
import { apiFetch } from '../lib/api';
import { socket } from '../lib/socket';
import { formatRupiah } from '../utils/formatters';

// ── Cloudinary image optimization ──
function getOptimizedImageUrl(url, width = 150, height = 150) {
  if (!url) return '';
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    return url.replace('/image/upload/', `/image/upload/w_${width},h_${height},c_fill,g_auto,q_auto,f_auto/`);
  }
  return url;
}

// ── Compress image (sama seperti mode admin) ──
function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    };
  });
}

// ── Stock Badge ──
function StockBadge({ total, min }) {
  if (total === 0) return <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Habis</span>;
  if (total <= min) return <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">Menipis</span>;
  return <span className="text-[10px] font-bold bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Tersedia</span>;
}

// ── Modal Edit Detail Produk ──
function EditDetailModal({ product, onClose, onSaved }) {
  const [name, setName] = useState(product.name);
  const [preview, setPreview] = useState(product.image || null);
  const [base64, setBase64] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    const compressed = await compressImage(file, 800, 0.7);
    setPreview(compressed);
    setBase64(compressed);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Nama produk tidak boleh kosong.'); return; }
    setIsSaving(true);
    setError('');
    try {
      const res = await apiFetch(`/products/${product.id}/image`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim() !== product.name ? name.trim() : null,
          image: base64 || null,
          imageEmoji: null,
        }),
      });
      onSaved(res);
      onClose();
    } catch (err) {
      setError('Gagal menyimpan. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = name.trim() !== product.name || base64;

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-end" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full rounded-t-3xl p-6 pb-10 space-y-5 animate-[slideUp_0.25s_ease]" style={{ maxHeight: '90dvh', overflowY: 'auto' }}>
        <div className="flex justify-between items-center">
          <h2 className="font-headline font-bold text-lg text-slate-900">Edit Detail Produk</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-100 active:scale-95">
            <span className="material-symbols-outlined text-slate-500">close</span>
          </button>
        </div>

        {/* Foto */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-2">Foto Produk</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
              {preview ? (
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-slate-400 !text-[32px]">add_a_photo</span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-xs text-slate-500">Foto akan dikompresi otomatis sebelum diunggah.</p>
              <label className="flex items-center gap-2 w-full px-4 py-2.5 bg-red-50 text-[#C0392B] border border-red-100 rounded-xl font-bold text-sm cursor-pointer active:scale-95 transition-all">
                <span className="material-symbols-outlined !text-[18px]">photo_library</span>
                Pilih dari Galeri
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
          </div>
        </div>

        {/* Nama */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-2">Nama Produk</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Masukkan nama produk..."
            className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-[#C0392B] rounded-2xl text-slate-800 font-medium outline-none transition-colors"
          />
        </div>

        {error && <p className="text-sm font-semibold text-red-500">{error}</p>}

        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="w-full py-4 bg-[#C0392B] hover:bg-[#a93226] text-white font-bold rounded-2xl active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined !text-[20px]">{isSaving ? 'hourglass_empty' : 'save'}</span>
          {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>
    </div>
  );
}

// ── Halaman Utama ──
export default function KelolaProdukKasirPage() {
  const { role, branchName: branchId } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (role === 'admin') navigate('/products', { replace: true });
  }, [role, navigate]);

  const [products, setProducts] = useState([]);
  const [apiCategories, setApiCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('Semua');
  const [isLoading, setIsLoading] = useState(true);
  const [editTarget, setEditTarget] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const fetchProducts = async () => {
    try {
      const params = branchId ? `?branchId=${branchId}` : '';
      const [data, cats] = await Promise.all([
        apiFetch(`/products${params}`),
        apiFetch('/categories'),
      ]);
      setProducts(data || []);
      setApiCategories(cats || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    const onUpdate = () => fetchProducts();
    socket.on('DATA_UPDATED', onUpdate);
    return () => socket.off('DATA_UPDATED', onUpdate);
  }, [branchId]);

  const uniqueCats = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
    return cats.sort();
  }, [products]);

  const filtered = useMemo(() => {
    const result = products.filter(p => {
      const s = search.toLowerCase().trim();
      const searchWords = s.split(/\s+/).filter(Boolean);
      const matchSearch = searchWords.length === 0 || searchWords.every(word =>
        (p.name || '').toLowerCase().includes(word) ||
        (p.barcode || '').toLowerCase().includes(word)
      );
      const matchCat = filterCat === 'Semua' || p.category === filterCat;
      return matchSearch && matchCat;
    });
    return result.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [products, search, filterCat]);

  return (
    <div className="bg-white min-h-screen flex flex-col font-body pb-24 md:pb-0">

      {/* ── Sticky Header (persis seperti mode admin) ── */}
      <header className="bg-white sticky top-0 z-40 border-b border-slate-200 px-5 pt-4 pb-3 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.dispatchEvent(new Event('mobile-drawer-toggle'))}
              className="md:hidden p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center"
            >
              <span className="material-symbols-outlined !text-[24px]">menu</span>
            </button>
            <h1 className="font-headline font-extrabold text-xl text-center w-full text-[#C0392B]">
              Kelola Produk
            </h1>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 !text-[20px]">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama produk atau barcode..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-transparent focus:border-red-300 rounded-xl text-sm text-slate-700 outline-none transition-all"
            />
          </div>
        </div>

        {/* Filter Kategori */}
        <div className="flex gap-2 overflow-x-auto py-2 -mx-1 px-1 scrollbar-hide items-center">
          <button
            onClick={() => setFilterCat('Semua')}
            className={`shrink-0 text-sm font-medium capitalize px-4 py-1.5 rounded-lg border transition-all ${filterCat === 'Semua' ? 'bg-red-50 text-[#C0392B] border-current shadow-[0_2px_8px_rgba(0,0,0,0.04)]' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
          >
            Semua
          </button>
          <div className="w-px bg-slate-200 h-6 shrink-0" />
          {uniqueCats.map(c => (
            <button key={c}
              onClick={() => setFilterCat(filterCat === c ? 'Semua' : c)}
              className={`shrink-0 text-sm font-medium capitalize px-4 py-1.5 rounded-lg border transition-all ${filterCat === c ? 'bg-red-50 text-[#C0392B] border-current shadow-[0_2px_8px_rgba(0,0,0,0.04)]' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </header>

      {/* ── Daftar Produk ── */}
      <main className="px-5 pt-4 pb-28 grid grid-cols-1 gap-3 w-full">
        {isLoading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-red-500 rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-500 mt-4">Memuat produk...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full flex flex-col items-center py-16 text-slate-400">
            <span className="material-symbols-outlined !text-[48px] mb-3">shopping_bag</span>
            <p className="font-bold text-slate-500">Tidak ada produk ditemukan</p>
          </div>
        ) : filtered.map(p => {
          const total = p.totalStock || 0;
          const isLow = total <= p.minStock && total > 0;
          const isEmpty = total === 0;
          return (
            <div
              key={p.id}
              className={`bg-white rounded-2xl border shadow-md flex flex-col justify-between ${isEmpty ? 'border-red-100 opacity-75' : isLow ? 'border-amber-100' : 'border-slate-200'}`}
            >
              <div className="flex items-center gap-3 p-4">
                {/* Foto */}
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-red-50 flex items-center justify-center shrink-0 overflow-hidden">
                  {p.image ? (
                    <img src={getOptimizedImageUrl(p.image)} className="w-full h-full object-cover" alt={p.name} />
                  ) : p.imageEmoji ? (
                    <span className="material-symbols-outlined !text-[28px] md:!text-[32px] text-red-500" style={{ fontVariationSettings: "'FILL' 1" }}>{p.imageEmoji}</span>
                  ) : (
                    <span className="material-symbols-outlined !text-[28px] md:!text-[32px] text-slate-400">shopping_bag</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900 text-sm md:text-base leading-tight truncate">{p.name}</p>
                    <StockBadge total={total} min={p.minStock} />
                  </div>
                  {p.expiredStock > 0 && (
                    <div className="mt-1 inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">
                      <span className="material-symbols-outlined !text-[12px]">warning</span>
                      {p.expiredStock} kadaluarsa
                    </div>
                  )}
                  <div className="flex items-end justify-between gap-2 mt-1">
                    <span className="font-bold text-sm md:text-base text-[#C0392B]">
                      {formatRupiah(p.fefoSellPrice !== undefined ? p.fefoSellPrice : p.price)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium shrink-0">{total} unit layak jual</span>
                  </div>
                </div>
              </div>

              {/* Tombol Edit — center, full width */}
              <div className="border-t border-slate-200">
                <button
                  onClick={() => setEditTarget(p)}
                  className="w-full py-2.5 flex items-center justify-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors rounded-b-2xl"
                >
                  <span className="material-symbols-outlined !text-[16px]">edit</span>
                  Edit
                </button>
              </div>
            </div>
          );
        })}
      </main>

      {/* ── Toast ── */}
      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-lg">
          {toastMsg}
        </div>
      )}

      {/* ── Modal Edit ── */}
      {editTarget && (
        <EditDetailModal
          product={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(updated) => {
            setProducts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
            setEditTarget(null);
            showToast('Produk berhasil diperbarui!');
          }}
        />
      )}

      <BottomNav />
    </div>
  );
}
