import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useSession } from '../lib/useSession';
import BottomNav from '../components/BottomNav';

export default function RiwayatNotifikasiPage() {
  const navigate = useNavigate();
  const { role, branchName: branchId } = useSession();
  const isAdmin = role === 'admin';

  const primaryText = isAdmin ? 'text-orange-600' : 'text-red-600';
  const primaryBg = isAdmin ? 'bg-orange-600' : 'bg-red-600';
  
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
  
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Fetch History Logs
  useEffect(() => {
    setLoadingHistory(true);
    apiFetch(`/notifications?branchId=${branchId}`)
      .then(data => setHistoryLogs(data || []))
      .catch(err => console.error("Failed to fetch history:", err))
      .finally(() => setLoadingHistory(false));
  }, [branchId]);

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
    <div className={`bg-white min-h-screen flex flex-col font-body pb-20 transition-all duration-300 ${
      sidebarOpen ? 'md:pl-64' : 'md:pl-16'
    }`}>
      <header className="bg-white border-b border-slate-100 px-5 pb-4 pt-4 sticky top-0 z-40 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.dispatchEvent(new Event('mobile-drawer-toggle'))}
            className="md:hidden p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center"
          >
            <span className="material-symbols-outlined !text-[24px]">menu</span>
          </button>
          <div>
            <h1 className={`font-headline font-extrabold text-xl leading-tight ${primaryText}`}>Riwayat Notifikasi</h1>
            <p className="text-sm text-slate-400">Log Peringatan Sistem</p>
          </div>
        </div>
      </header>

      <main className="px-5 py-6 w-full space-y-6">
        <div className="space-y-4">
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
      </main>

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
                  selectedNotif.log.type === 'expired' ? 'bg-slate-900 text-white' :
                  selectedNotif.log.type === 'oos' ? 'bg-red-600 text-white' :
                  selectedNotif.log.type?.includes('expiry') ? 'bg-orange-100 text-orange-600' :
                  'bg-yellow-100 text-yellow-600'
                }`}>
                  <span className="material-symbols-outlined !text-[32px]">
                    {selectedNotif.log.type === 'expired' ? 'block' :
                     selectedNotif.log.type === 'oos' ? 'remove_shopping_cart' :
                     selectedNotif.log.type?.includes('expiry') ? 'event_busy' :
                     'warning'}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-800 leading-tight mb-2">
                  {selectedNotif.log?.product?.name}
                </h3>

                <div className="w-full bg-slate-50 rounded-2xl p-4 text-left text-sm text-slate-600 space-y-3 mb-6">
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
                </div>

                <div className="flex flex-col gap-2 w-full">
                  <button
                    onClick={() => {
                      const productName = selectedNotif.log?.product?.name;
                      setSelectedNotif(null);
                      navigate('/products', { state: { search: productName } });
                    }}
                    className={`w-full py-3.5 rounded-2xl font-bold text-white shadow-lg shadow-opacity-50 active:scale-95 transition-all ${primaryBg} ${primaryBg.replace('bg-', 'shadow-')}`}
                  >
                    Kelola Produk Ini
                  </button>

                  <button
                    onClick={() => handleDeleteHistory(selectedNotif.log.id)}
                    className="w-full py-3.5 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all"
                  >
                    Hapus Riwayat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSelectMode && (
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

      <BottomNav />
    </div>
  );
}
