import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';

export default function NotifikasiPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const role = location.state?.role || 'kasir';
  const branchId = location.state?.branchName || 'pusat';
  const isAdmin = role === 'admin';

  const primaryText = isAdmin ? 'text-orange-600' : 'text-red-600';
  const primaryBg = isAdmin ? 'bg-orange-600' : 'bg-red-600';

  const [lowStock, setLowStock] = useState(location.state?.lowStock || []);
  const [expiring, setExpiring] = useState(location.state?.expiring || []);
  const [loading, setLoading] = useState(!(location.state?.lowStock && location.state?.expiring));

  useEffect(() => {
    if (location.state?.lowStock && location.state?.expiring) {
      return; // Already have data from Dashboard
    }
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch products for low stock check
        const products = await apiFetch(`/products?branchId=${branchId}`);
        setLowStock(products.filter(p => (p.totalStock || 0) <= p.minStock));

        // Fetch expiring batches (within 60 days)
        const expiringBatches = await apiFetch(`/products/alerts/expiring?branchId=${branchId}&days=60`);
        setExpiring(expiringBatches || []);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [branchId, location.state]);

  // Separate Expiring into Expired and Expiring Soon
  const expiredItems = expiring.filter(item => item.daysLeft <= 0);
  const expiringSoonItems = expiring.filter(item => item.daysLeft > 0);

  // Separate Low Stock into Out of Stock and Critical Stock
  const outOfStockItems = lowStock.filter(item => (item.totalStock || 0) <= 0);
  const criticalStockItems = lowStock.filter(item => (item.totalStock || 0) > 0);

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

  return (
    <div className={`bg-slate-100 min-h-screen flex flex-col font-body pb-20 transition-all duration-300 ${
      sidebarOpen ? 'md:pl-64' : 'md:pl-16'
    }`}>
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 border-b border-slate-100 px-5 py-4 flex items-center justify-between relative">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-slate-50 border border-slate-100 active:scale-95 transition-all relative z-10"
        >
          <span className="material-symbols-outlined text-slate-500 !text-[22px]">arrow_back</span>
        </button>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <h1 className={`font-headline font-extrabold text-xl leading-tight ${primaryText}`}>
            Notifikasi
          </h1>
          <p className="text-xs text-slate-400">Peringatan Stok & Kadaluarsa</p>
        </div>
        <div className="w-10"></div> {/* Spacer to keep flex balance */}
      </header>

      <main className="px-5 py-6 w-full space-y-6">
        
        {/* Note / Legenda Informasi */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h2 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-500 !text-[20px]">info</span>
            Note
          </h2>
          <div className="flex flex-col gap-3 text-[11px] font-medium text-slate-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-900"></div>
              <span>Hitam = Sudah Kadaluarsa</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-600"></div>
              <span>Merah = Stok Barang Habis</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span>Oranye = Hampir Kadaluarsa</span>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <span className="material-symbols-outlined animate-spin !text-[40px] mb-4">autorenew</span>
            <p className="font-semibold text-sm">Memeriksa data stok...</p>
          </div>
        ) : lowStock.length === 0 && expiring.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined !text-[40px] text-emerald-500">check_circle</span>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Semua Aman! 🎉</h2>
            <p className="text-sm">Tidak ada peringatan stok menipis atau barang hampir kadaluarsa.</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* EXPIRED ALERTS (BLACK) */}
            {expiredItems.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-900 !text-[20px]">block</span>
                    Sudah Kadaluarsa
                  </h2>
                  <span className="px-2.5 py-0.5 bg-slate-900 text-white text-xs font-black rounded-full">
                    {expiredItems.length} item
                  </span>
                </div>
                
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                  {expiredItems.map(({ product, batch, sessionIndex }, i) => (
                    <div key={`expd-${i}`} className="p-4 flex gap-4 hover:bg-slate-50 transition-colors">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <span className="material-symbols-outlined !text-[24px]">dangerous</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 leading-tight mb-1">{product.name}</p>
                        <div className="flex flex-col gap-1 text-xs">
                          <span className="text-slate-500">
                            Kadaluarsa: <strong className="text-slate-900">{new Date(batch.expiredDate).toLocaleDateString('id-ID')}</strong>
                          </span>
                          <span className="text-slate-400">
                            Jumlah Tersisa: <strong className="text-slate-900">{batch.qty} unit</strong> <span className="italic">(Sesi {sessionIndex})</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* OUT OF STOCK ALERTS (RED) */}
            {outOfStockItems.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-600 !text-[20px]">remove_shopping_cart</span>
                    Stok Barang Habis
                  </h2>
                  <span className="px-2.5 py-0.5 bg-red-600 text-white text-xs font-black rounded-full">
                    {outOfStockItems.length} item
                  </span>
                </div>
                
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                  {outOfStockItems.map((p, i) => (
                    <div key={`oos-${i}`} className="p-4 flex gap-4 hover:bg-slate-50 transition-colors">
                      <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <span className="material-symbols-outlined !text-[24px]">warning</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 leading-tight mb-1">{p.name}</p>
                        <div className="flex flex-col gap-1 text-xs">
                          <span className="text-slate-500">
                            Stok saat ini: <strong className="text-red-600">0 unit</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* EXPIRING SOON ALERTS (ORANGE) */}
            {expiringSoonItems.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-orange-500 !text-[20px]">history_toggle_off</span>
                    Hampir Kadaluarsa
                  </h2>
                  <span className="px-2.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-black rounded-full">
                    {expiringSoonItems.length} item
                  </span>
                </div>
                
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                  {expiringSoonItems.map(({ product, batch, daysLeft, sessionIndex }, i) => (
                    <div key={`exp-${i}`} className="p-4 flex gap-4 hover:bg-slate-50 transition-colors">
                      <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-orange-500 !text-[24px]">event_busy</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 leading-tight mb-1">{product.name}</p>
                        <div className="flex flex-col gap-1 text-xs">
                          <span className="text-slate-500">
                            Kadaluarsa: <strong className="text-orange-600">{new Date(batch.expiredDate).toLocaleDateString('id-ID')}</strong>
                          </span>
                          <span className="text-orange-600 font-semibold">
                            Sisa {daysLeft} hari lagi
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Stok di batch ini: <span className="font-semibold text-slate-600">{batch.qty} unit</span> <span className="italic">(Sesi {sessionIndex})</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}



          </div>
        )}
      </main>
    </div>
  );
}
