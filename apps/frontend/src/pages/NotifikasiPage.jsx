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
  
  const [activeTab, setActiveTab] = useState('aktif');
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);

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

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  const toggleSelection = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  const handleSelectAll = () => {
    if (selectedIds.length === historyLogs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(historyLogs.map(l => l.id));
    }
  };
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Hapus ${selectedIds.length} riwayat notifikasi secara permanen?`)) return;
    setIsDeletingBulk(true);
    try {
      await apiFetch(`/notifications/bulk-delete`, {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds })
      });
      setHistoryLogs(prev => prev.filter(l => !selectedIds.includes(l.id)));
      setIsSelectMode(false);
      setSelectedIds([]);
    } catch (err) {
      alert("Gagal menghapus riwayat: " + err.message);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleDeleteHistory = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus riwayat ini?")) return;
    try {
      await apiFetch(`/notifications/${id}`, { method: 'DELETE' });
      setHistoryLogs(prev => prev.filter(log => log.id !== id));
      setSelectedNotif(null);
    } catch (error) {
      console.error("Failed to delete notification", error);
      alert("Gagal menghapus riwayat notifikasi");
    }
  };

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
                      onClick={() => setSelectedNotif({ type: 'expiringSoon', product, batch, daysLeft, sessionIndex })}
                      className="p-4 flex gap-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-orange-500 !text-[24px]">event_busy</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 leading-tight mb-1">{product.name}</p>
                        <div className="flex flex-col gap-1 text-xs mt-1">
                          <span className="text-slate-600 font-bold flex items-center gap-1 bg-orange-100 w-max px-2 py-1 rounded-md">
                            <span className="material-symbols-outlined !text-[14px]">timer</span>
                            Sisa waktu: {daysLeft} Hari Lagi
                          </span>
                          <span className="text-slate-400 flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined !text-[12px]">calendar_today</span>
                            Tgl Kadaluarsa: {new Date(batch.expiredDate).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Stok di batch ini: <span className="font-semibold text-slate-600">{batch.qty} unit</span> <span className="italic">(Batch {new Date(batch.createdAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})})</span></p>
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
                      onClick={() => setSelectedNotif({ type: 'outOfStock', product: p })}
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
                      onClick={() => setSelectedNotif({ type: 'expired', product, batch, sessionIndex })}
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
                            Jumlah Tersisa: <strong className="text-slate-900">{batch.qty} unit</strong> <span className="italic">(Batch {new Date(batch.createdAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})})</span>
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
            
            {/* Header Riwayat (Tombol Pilih) */}
            <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-sm font-bold text-slate-700 pl-2">Riwayat Notifikasi</span>
              <button
                onClick={() => {
                  setIsSelectMode(!isSelectMode);
                  if (isSelectMode) setSelectedIds([]);
                }}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${isSelectMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {isSelectMode ? 'Batal' : 'Pilih'}
              </button>
            </div>

            {loadingHistory ? (
              <div className="flex justify-center py-20"><span className="material-symbols-outlined animate-spin text-slate-400 !text-[40px]">autorenew</span></div>
            ) : historyLogs.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <span className="material-symbols-outlined !text-[48px] mb-4 text-slate-300">history</span>
                <p>Belum ada riwayat peringatan tersimpan.</p>
              </div>
            ) : (
              [...historyLogs].sort((a, b) => {
                const getWeight = (type) => {
                  if (type?.includes('expiry')) return 1;
                  if (type === 'oos') return 2;
                  if (type === 'expired') return 3;
                  return 4;
                };
                const weightDiff = getWeight(a.type) - getWeight(b.type);
                if (weightDiff !== 0) return weightDiff;
                return new Date(b.createdAt) - new Date(a.createdAt);
              }).map((log) => (
                <div 
                  key={log.id} 
                  onClick={() => {
                    if (isSelectMode) {
                      toggleSelection(log.id);
                    } else if (log.product) {
                      setSelectedNotif({ type: 'history', log });
                    }
                  }}
                  className={`bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4 cursor-pointer transition-all ${isSelectMode && selectedIds.includes(log.id) ? 'ring-2 ring-orange-400 bg-orange-50' : 'hover:bg-slate-50'}`}
                >
                  {isSelectMode && (
                    <div className="flex items-center justify-center shrink-0 pr-1">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedIds.includes(log.id) ? 'bg-orange-500 border-orange-500' : 'border-slate-300'}`}>
                        {selectedIds.includes(log.id) && <span className="material-symbols-outlined text-white !text-[14px]">check</span>}
                      </div>
                    </div>
                  )}
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

      {/* MODAL NOTIFIKASI */}
      {selectedNotif && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-0" onClick={() => setSelectedNotif(null)}>
          <div 
            className="bg-white w-full sm:w-[400px] rounded-[32px] overflow-hidden shadow-2xl transform transition-all translate-y-0"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 relative">
              <button 
                onClick={() => setSelectedNotif(null)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined !text-[20px]">close</span>
              </button>

              <div className="flex flex-col items-center text-center mt-2">
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 shadow-sm ${
                  selectedNotif.type === 'expired' || (selectedNotif.type === 'history' && selectedNotif.log.type === 'expired') ? 'bg-slate-900 text-white' :
                  selectedNotif.type === 'outOfStock' || (selectedNotif.type === 'history' && selectedNotif.log.type === 'oos') ? 'bg-red-600 text-white' :
                  selectedNotif.type === 'expiringSoon' || (selectedNotif.type === 'history' && selectedNotif.log.type?.includes('expiry')) ? 'bg-orange-100 text-orange-600' :
                  'bg-yellow-100 text-yellow-600'
                }`}>
                  <span className="material-symbols-outlined !text-[32px]">
                    {selectedNotif.type === 'expired' || (selectedNotif.type === 'history' && selectedNotif.log.type === 'expired') ? 'block' :
                     selectedNotif.type === 'outOfStock' || (selectedNotif.type === 'history' && selectedNotif.log.type === 'oos') ? 'remove_shopping_cart' :
                     selectedNotif.type === 'expiringSoon' || (selectedNotif.type === 'history' && selectedNotif.log.type?.includes('expiry')) ? 'event_busy' :
                     'warning'}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-800 leading-tight mb-2">
                  {selectedNotif.product?.name || selectedNotif.log?.product?.name}
                </h3>

                <div className="w-full bg-slate-50 rounded-2xl p-4 text-left text-sm text-slate-600 space-y-3 mb-6">
                  {(selectedNotif.type === 'expiringSoon' || selectedNotif.type === 'expired') && (
                    <>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-slate-500">Status</span>
                        <strong className={selectedNotif.type === 'expired' ? 'text-slate-900' : 'text-orange-600'}>
                          {selectedNotif.type === 'expired' ? 'Sudah Kadaluarsa' : `Sisa ${selectedNotif.daysLeft} Hari Lagi`}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-slate-500">Tgl Kadaluarsa</span>
                        <strong className="text-slate-700">{new Date(selectedNotif.batch.expiredDate).toLocaleDateString('id-ID')}</strong>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-slate-500">Stok Batch Ini</span>
                        <strong className="text-slate-700">{selectedNotif.batch.qty} unit</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Info Batch</span>
                        <strong className="text-slate-700">Batch {new Date(selectedNotif.batch.createdAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}</strong>
                      </div>
                    </>
                  )}

                  {(selectedNotif.type === 'outOfStock' || selectedNotif.type === 'criticalStock') && (
                    <>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-slate-500">Status</span>
                        <strong className={selectedNotif.type === 'outOfStock' ? 'text-red-600' : 'text-yellow-600'}>
                          {selectedNotif.type === 'outOfStock' ? 'Stok Habis' : 'Stok Menipis'}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-slate-500">Stok Saat Ini</span>
                        <strong className="text-slate-700">{selectedNotif.product.totalStock || 0} unit</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Batas Minimum</span>
                        <strong className="text-slate-700">{selectedNotif.product.minStock} unit</strong>
                      </div>
                    </>
                  )}

                  {selectedNotif.type === 'history' && (
                    <>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-slate-500">Pesan</span>
                        <strong className="text-slate-700 text-right max-w-[60%]">{selectedNotif.log.message}</strong>
                      </div>
                      {selectedNotif.log.batch && (
                        <>
                          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <span className="text-slate-500">Sisa Stok</span>
                            <strong className="text-slate-700">{selectedNotif.log.batch.qty} unit</strong>
                          </div>
                          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <span className="text-slate-500">Info Batch</span>
                            <strong className="text-slate-700">Batch {new Date(selectedNotif.log.batch.createdAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}</strong>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Waktu Kejadian</span>
                        <strong className="text-slate-700 text-right">{new Date(selectedNotif.log.createdAt).toLocaleString('id-ID')}</strong>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-col gap-2 w-full">
                  <button
                    onClick={() => {
                      const productName = selectedNotif.product?.name || selectedNotif.log?.product?.name;
                      setSelectedNotif(null);
                      navigate('/products', { state: { search: productName } });
                    }}
                    className={`w-full py-3.5 rounded-2xl font-bold text-white shadow-lg shadow-opacity-50 active:scale-95 transition-all ${primaryBg} ${primaryBg.replace('bg-', 'shadow-')}`}
                  >
                    Kelola Produk Ini
                  </button>

                  {selectedNotif.type === 'history' && (
                    <button
                      onClick={() => handleDeleteHistory(selectedNotif.log.id)}
                      className="w-full py-3.5 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all"
                    >
                      Hapus Riwayat
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Floating Bulk Action Bar */}
      {activeTab === 'riwayat' && isSelectMode && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 px-5 py-4 flex items-center justify-between shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] transition-all">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700">{selectedIds.length} Terpilih</span>
            <button onClick={handleSelectAll} className="text-xs font-bold text-orange-600 px-2 py-1 bg-orange-50 rounded-lg active:scale-95 transition-all">
              {selectedIds.length === historyLogs.length && historyLogs.length > 0 ? 'Batal Semua' : 'Pilih Semua'}
            </button>
          </div>
          <button
            disabled={selectedIds.length === 0 || isDeletingBulk}
            onClick={handleBulkDelete}
            className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined !text-[18px]">delete</span>
            {isDeletingBulk ? 'Menghapus...' : 'Hapus'}
          </button>
        </div>
      )}
    </div>
  );
}
