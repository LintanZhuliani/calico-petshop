import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/useSession';
import BottomNav from '../components/BottomNav';
import { apiFetch } from '../lib/api';
import { socket } from '../lib/socket';

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

// ── Modal Edit Detail Produk (Kasir) ──
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

  const nameChanged = name.trim() !== product.name;
  const hasChanges = nameChanged || base64;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 flex items-end"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full rounded-t-3xl p-6 pb-10 space-y-5 animate-[slideUp_0.25s_ease]" style={{ maxHeight: '90dvh', overflowY: 'auto' }}>
        <div className="flex justify-between items-center">
          <h2 className="font-headline font-bold text-lg text-slate-900">Edit Detail Produk</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-100 active:scale-95">
            <span className="material-symbols-outlined text-slate-500">close</span>
          </button>
        </div>

        {/* Foto Produk */}
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
              <p className="text-xs text-slate-500">Foto akan dikompresi otomatis untuk menjaga performa sistem.</p>
              <label className="flex items-center gap-2 w-full px-4 py-2.5 bg-red-50 text-[#C0392B] border border-red-100 rounded-xl font-bold text-sm cursor-pointer active:scale-95 transition-all">
                <span className="material-symbols-outlined !text-[18px]">photo_library</span>
                Pilih dari Galeri
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
              {preview && (
                <button
                  onClick={() => { setPreview(null); setBase64(null); }}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
                >
                  <span className="material-symbols-outlined !text-[14px]">delete</span> Hapus foto
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Nama Produk */}
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

  // Kasir only — redirect admin
  useEffect(() => {
    if (role === 'admin') navigate('/products', { replace: true });
  }, [role, navigate]);

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
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
      const data = await apiFetch(`/products${params}`);
      setProducts(data || []);
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

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return products;
    return products.filter(p =>
      p.name.toLowerCase().includes(s) ||
      (p.barcode && p.barcode.toLowerCase().includes(s))
    );
  }, [products, search]);

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-body pb-24 md:pb-0">

      {/* ── Header Mobile ── */}
      <div className="md:hidden bg-[#C0392B] text-white px-5 pt-14 pb-6 rounded-b-[32px] shadow-sm">
        <h1 className="font-headline font-bold text-2xl tracking-tight">Kelola Produk</h1>
        <p className="text-white/80 text-sm mt-0.5">Edit nama & foto produk</p>
      </div>

      {/* ── Header Desktop ── */}
      <div className="hidden md:block px-8 pt-10 pb-2">
        <h1 className="font-headline font-bold text-3xl text-slate-800">Kelola Produk</h1>
        <p className="text-slate-500 mt-1">Edit nama & foto produk</p>
      </div>

      {/* ── Search ── */}
      <div className="px-5 pt-4 pb-2 max-w-2xl w-full mx-auto">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 !text-[20px]">search</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau barcode produk..."
            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-transparent focus:border-[#C0392B] rounded-2xl text-sm text-slate-700 outline-none transition-colors shadow-sm"
          />
        </div>
      </div>

      {/* ── Daftar Produk ── */}
      <main className="flex-1 px-5 pt-2 pb-4 max-w-2xl w-full mx-auto space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-red-500 rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-500 mt-4">Memuat produk...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-400">
            <span className="material-symbols-outlined !text-[48px] mb-3">inventory_2</span>
            <p className="font-bold text-slate-500">Tidak ada produk ditemukan</p>
          </div>
        ) : filtered.map(p => (
          <div
            key={p.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 p-4"
          >
            {/* Foto */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-xl bg-red-50 flex items-center justify-center overflow-hidden">
                {p.image ? (
                  <img src={getOptimizedImageUrl(p.image)} className="w-full h-full object-cover" alt={p.name} />
                ) : p.imageEmoji ? (
                  <span className="material-symbols-outlined !text-[28px] text-red-500" style={{ fontVariationSettings: "'FILL' 1" }}>{p.imageEmoji}</span>
                ) : (
                  <span className="material-symbols-outlined !text-[28px] text-slate-400">shopping_bag</span>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-sm leading-tight truncate">{p.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{p.category}</p>
              {p.barcode && <p className="text-[10px] text-slate-400 font-mono">{p.barcode}</p>}
            </div>

            {/* Tombol Edit */}
            <button
              onClick={() => setEditTarget(p)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-red-50 text-[#C0392B] rounded-xl text-xs font-bold active:scale-95 transition-all hover:bg-red-100"
            >
              <span className="material-symbols-outlined !text-[16px]">edit</span>
              Edit
            </button>
          </div>
        ))}
      </main>

      {/* ── Toast ── */}
      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-lg animate-[fadeIn_0.2s_ease]">
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
