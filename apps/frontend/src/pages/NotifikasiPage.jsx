import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useSession } from '../lib/useSession';

export default function NotifikasiPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, branchName: branchId } = useSession();
  const isAdmin = role === 'admin';

  const primaryText = isAdmin ? 'text-orange-600' : 'text-red-600';
  const primaryBg = isAdmin ? 'bg-orange-600' : 'bg-red-600';

  const [lowStock, setLowStock] = useState(location.state?.lowStock || []);
  const [expiring, setExpiring] = useState(location.state?.expiring || []);
  const [loading, setLoading] = useState(!(location.state?.lowStock && location.state?.expiring));
  const [selectedItem, setSelectedItem] = useState(null);
  
  const [activeTab, setActiveTab] = useState('aktif');
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

        // Fetch expiring batches (within 30 days)
        const expiringBatches = await apiFetch(`/products/alerts/expiring?branchId=${branchId}&days=30`);
        setExpiring(expiringBatches || []);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [branchId, location.state]);

  // Fetch History Logs
  useEffect(() => {
    if (activeTab === 'riwayat') {
      setLoadingHistory(true);
      apiFetch(`/notifications?branchId=${branchId}`)
        .then(data => setHistoryLogs(data || []))
        .catch(err => console.error("Failed to fetch history:", err))
        .finally(() => setLoadingHistory(false));
    }
  }, [activeTab, branchId]);

  const [notifPrefs] = useState(() => {
    const saved = localStorage.getItem('calico_notif_prefs');
    return saved ? JSON.parse(saved) : { stok: true, expired: true, shift: true };
  });

  // Separate Expiring into Expired and Expiring Soon
  const validExpiring = notifPrefs.expired ? expiring : [];
  const expiredItems = validExpiring.filter(item => item.daysLeft <= 0);
  const expiringSoonItems = validExpiring.filter(item => item.daysLeft > 0);

  // Separate Low Stock into Out of Stock and Critical Stock
  const validLowStock = notifPrefs.stok ? lowStock : [];
  const outOfStockItems = validLowStock.filter(item => (item.totalStock || 0) <= 0);
  const criticalStockItems = validLowStock.filter(item => (item.totalStock || 0) > 0);

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-body pb-20 transition-all duration-300">
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

      {/* TABS */}
      <div className="px-5 mt-4">
        <div className="flex p-1 bg-slate-200/60 rounded-xl">
          <button 
            onClick={() => setActiveTab('aktif')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'aktif' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Peringatan Aktif
          </button>
          <button 
            onClick={() => setActiveTab('riwayat')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'riwayat' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Buku Riwayat
          </button>
        </div>
      </div>

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

        {/* TAB: AKTIF */}
        {activeTab === 'aktif' && (
          <>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <span className="material-symbols-outlined animate-spin !text-[40px] mb-4">autorenew</span>
                <p className="font-semibold text-sm">Memeriksa data stok...</p>
              </div>
            ) : validLowStock.length === 0 && validExpiring.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined !text-[40px] text-emerald-500">check_circle</span>
                </div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">Semua Aman! 🎉</h2>
                <p className="text-sm">Tidak ada peringatan stok menipis atau barang hampir kadaluarsa yang aktif.</p>
              </div>
            ) : (
              <div className="space-y-6">
            
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
                    <div 
                      key={`exp-${i}`} 
                      onClick={() => setSelectedItem({ type: 'expiring', product, batch, daysLeft, sessionIndex })}
                      className="p-4 flex gap-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
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
                        <p className="text-[11px] text-slate-400 mt-1">Stok di batch ini: <span className="font-semibold text-slate-600">{batch.qty} unit</span> {sessionIndex !== 'N/A' && <span className="italic">(Sesi {sessionIndex})</span>}</p>
                      </div>
                      <div className="flex items-center text-slate-400">
                        <span className="material-symbols-outlined">chevron_right</span>
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
                    <div 
                      key={`oos-${i}`} 
                      onClick={() => setSelectedItem({ type: 'oos', product: p })}
                      className="p-4 flex gap-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
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
                      <div className="flex items-center text-slate-400">
                        <span className="material-symbols-outlined">chevron_right</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

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
                    <div 
                      key={`expd-${i}`} 
                      onClick={() => setSelectedItem({ type: 'expired', product, batch, sessionIndex })}
                      className="p-4 flex gap-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
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
                            Jumlah Tersisa: <strong className="text-slate-900">{batch.qty} unit</strong> {sessionIndex !== 'N/A' && <span className="italic">(Sesi {sessionIndex})</span>}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center text-slate-400">
                        <span className="material-symbols-outlined">chevron_right</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
        </>
        )}

        {/* TAB: RIWAYAT */}
        {activeTab === 'riwayat' && (
          <div className="space-y-4">
            {loadingHistory ? (
              <div className="flex justify-center py-20"><span className="material-symbols-outlined animate-spin text-slate-400 !text-[40px]">autorenew</span></div>
            ) : historyLogs.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <span className="material-symbols-outlined !text-[48px] mb-4 text-slate-300">history</span>
                <p>Belum ada riwayat peringatan tersimpan.</p>
              </div>
            ) : (
              historyLogs.map((log) => (
                <div 
                  key={log.id} 
                  onClick={() => setSelectedItem({ type: log.type === 'expired' ? 'expired' : log.type.includes('expiry') ? 'expiring' : 'oos', product: log.product, batch: log.batch, sessionIndex: 'N/A' })}
                  className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                    log.type === 'expired' ? 'bg-slate-900 text-white' :
                    log.type === 'oos' ? 'bg-red-600 text-white' :
                    'bg-orange-50 text-orange-500'
                  }`}>
                    <span className="material-symbols-outlined !text-[24px]">
                      {log.type === 'expired' ? 'dangerous' : log.type === 'oos' ? 'warning' : 'history_toggle_off'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 leading-tight mb-1">{log.product?.name || 'Produk Dihapus'}</p>
                    <p className="text-xs text-slate-500 font-medium mb-1">{log.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined !text-[12px]">schedule</span>
                      {new Date(log.createdAt).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="flex items-center text-slate-400">
                    <span className="material-symbols-outlined">chevron_right</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
          <div className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-headline font-bold text-lg text-slate-800">Detail Produk</h3>
              <button onClick={() => setSelectedItem(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
                <span className="material-symbols-outlined !text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex gap-4 items-center mb-6">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                  {selectedItem.product.image ? (
                    <img src={selectedItem.product.image} alt={selectedItem.product.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{selectedItem.product.imageEmoji || '📦'}</span>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-lg leading-tight">{selectedItem.product.name}</h4>
                  <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg mt-2 uppercase tracking-wide">
                    {selectedItem.product.category}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-slate-100">
                  <span className="text-slate-500 text-sm">Status Peringatan</span>
                  {selectedItem.type === 'expired' && <span className="text-slate-900 font-bold bg-slate-200 px-3 py-1 rounded-full text-xs">SUDAH KADALUARSA</span>}
                  {selectedItem.type === 'oos' && <span className="text-red-600 font-bold bg-red-50 px-3 py-1 rounded-full text-xs">STOK HABIS</span>}
                  {selectedItem.type === 'expiring' && <span className="text-orange-600 font-bold bg-orange-50 px-3 py-1 rounded-full text-xs">HAMPIR KADALUARSA</span>}
                </div>

                <div className="flex justify-between py-3 border-b border-slate-100">
                  <span className="text-slate-500 text-sm">Barcode</span>
                  <span className="text-slate-800 font-mono font-medium">{selectedItem.product.barcode || '-'}</span>
                </div>

                <div className="flex justify-between py-3 border-b border-slate-100">
                  <span className="text-slate-500 text-sm">Harga Jual</span>
                  <span className="text-slate-800 font-bold">Rp {selectedItem.product.price.toLocaleString('id-ID')}</span>
                </div>

                {selectedItem.type === 'oos' && (
                  <div className="flex justify-between py-3 border-b border-slate-100">
                    <span className="text-slate-500 text-sm">Total Stok Tersisa</span>
                    <span className="text-red-600 font-bold text-lg">0 Unit</span>
                  </div>
                )}

                {selectedItem.batch && (
                  <>
                    <div className="flex justify-between py-3 border-b border-slate-100">
                      <span className="text-slate-500 text-sm">Tanggal Kadaluarsa (Batch)</span>
                      <span className="text-slate-800 font-bold">{new Date(selectedItem.batch.expiredDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-slate-100">
                      <span className="text-slate-500 text-sm">Sisa Stok (Batch Ini)</span>
                      <span className="text-slate-800 font-bold">{selectedItem.batch.qty} Unit</span>
                    </div>
                    <div className="flex justify-between py-3">
                      <span className="text-slate-500 text-sm">Informasi Penempatan</span>
                      <span className="text-slate-800 font-medium">
                        {selectedItem.sessionIndex === 'N/A' ? 'Rak Penyimpanan' : `Rak Penyimpanan / Sesi ${selectedItem.sessionIndex}`}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
