import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { apiFetch } from '../lib/api';
import { formatRupiah } from '../utils/formatters';
import { printReceipt } from '../utils/printer';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function RiwayatPage() {
  const location = useLocation();
  const role = location.state?.role || 'admin';
  const isAdmin = role === 'admin';
  const branchId = location.state?.branchName || 'pusat';

  const primaryText = isAdmin ? 'text-[#D35400]' : 'text-[#C0392B]';
  const primaryBg = isAdmin ? 'bg-[#D35400]' : 'bg-[#C0392B]';

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [reportType, setReportType] = useState(isAdmin ? 'bulanan' : 'harian');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // States for Transaction Detail Modal
  const [selectedTx, setSelectedTx] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchTransactions = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (!isAdmin) params.set('branchId', branchId);
    apiFetch(`/transactions?${params}`)
      .then(data => {
        const txs = Array.isArray(data) ? data : [];
        // Sort descending by date
        txs.sort((a, b) => new Date(b.date) - new Date(a.date));
        setTransactions(txs);
        
        // Auto open receipt logic if navigated from checkout
        if (location.state?.autoOpenReceipt) {
          const newTx = txs.find(t => t.id === location.state.autoOpenReceipt);
          if (newTx) {
            setSelectedTx(newTx);
            setIsDetailOpen(true);
            // Clear the state so it doesn't reopen on refresh
            window.history.replaceState({ ...location.state, autoOpenReceipt: undefined }, document.title);
          }
        } else if (location.state?.autoOpenLatest && txs.length > 0) {
          setSelectedTx(txs[0]);
          setIsDetailOpen(true);
          window.history.replaceState({ ...location.state, autoOpenLatest: undefined }, document.title);
        }
      })
      .catch(err => console.error('Failed to load transactions:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTransactions();
  }, [isAdmin, branchId]);

  // Navigasi Tanggal / Bulan / Tahun
  const handlePrev = () => {
    const d = new Date(selectedDate);
    if (reportType === 'harian') d.setDate(d.getDate() - 1);
    else if (reportType === 'bulanan') d.setMonth(d.getMonth() - 1);
    else if (reportType === 'tahunan') d.setFullYear(d.getFullYear() - 1);
    setSelectedDate(d);
  };

  const handleNext = () => {
    const d = new Date(selectedDate);
    if (reportType === 'harian') d.setDate(d.getDate() + 1);
    else if (reportType === 'bulanan') d.setMonth(d.getMonth() + 1);
    else if (reportType === 'tahunan') d.setFullYear(d.getFullYear() + 1);
    setSelectedDate(d);
  };

  const dateLabel = useMemo(() => {
    if (reportType === 'harian') return selectedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    if (reportType === 'bulanan') return `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
    if (reportType === 'tahunan') return `${selectedDate.getFullYear()}`;
  }, [reportType, selectedDate]);

  // Filter Data
  const filteredData = useMemo(() => {
    return transactions.filter(tx => {
      const d = new Date(tx.date);
      if (reportType === 'harian') {
        return d.toDateString() === selectedDate.toDateString();
      } else if (reportType === 'bulanan') {
        return d.getFullYear() === selectedDate.getFullYear() && d.getMonth() === selectedDate.getMonth();
      } else if (reportType === 'tahunan') {
        return d.getFullYear() === selectedDate.getFullYear();
      }
      return true;
    });
  }, [transactions, selectedDate, reportType]);

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus transaksi ini? Stok akan dikembalikan otomatis.")) return;
    try {
      await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
      alert("Transaksi berhasil dihapus");
      setIsDetailOpen(false);
      setSelectedTx(null);
      fetchTransactions(); // Refresh data
    } catch (error) {
      alert(error.message || "Gagal menghapus transaksi");
    }
  };

  // Helper for receipt printing
  const handlePrintReceipt = (tx) => {
    // 32 chars width standard for 58mm
    const pad = (left, right) => {
      const space = 32 - left.length - right.length;
      return left + (space > 0 ? ' '.repeat(space) : ' ') + right;
    };
    const center = (text) => {
      if (text.length >= 32) return text;
      const padLeft = Math.floor((32 - text.length) / 2);
      return ' '.repeat(padLeft) + text;
    };

    let text = center("Calico's Pet Care") + '\n';
    text += center("Jl. Ps. Jengkol no 20, Babakan,") + '\n';
    text += center("Setu, Tangsel") + '\n';
    text += center("085702002027") + '\n';
    text += '-'.repeat(32) + '\n';
    
    text += pad("ID", tx.id) + '\n';
    const txDate = new Date(tx.date);
    const dateStr = `${String(txDate.getDate()).padStart(2, '0')}-${String(txDate.getMonth() + 1).padStart(2, '0')}-${txDate.getFullYear()} ${String(txDate.getHours()).padStart(2, '0')}:${String(txDate.getMinutes()).padStart(2, '0')}`;
    text += pad("Tanggal", dateStr) + '\n';
    text += pad("Kasir", tx.cashierName || 'Admin') + '\n';
    text += pad("Pembayaran", tx.paymentMethod || 'Tunai') + '\n';
    text += '-'.repeat(32) + '\n';
    
    (tx.items || []).forEach(item => {
      let pName = item.productName;
      if (pName.length > 32) pName = pName.substring(0, 32);
      text += pName + '\n';
      
      const leftLine = `${formatRupiah(item.price)} x ${item.qty}`;
      const rightLine = formatRupiah(item.qty * item.price);
      text += pad(leftLine, rightLine) + '\n';
    });
    
    text += '-'.repeat(32) + '\n';
    text += pad("Total", formatRupiah(tx.total)) + '\n';
    text += pad("Bayar", formatRupiah(tx.paid || tx.total)) + '\n';
    text += pad("Kembali", formatRupiah(tx.change || 0)) + '\n';
    text += '-'.repeat(32) + '\n';
    
    text += center("Gratis Antar & Jemput. Delivery,") + '\n';
    text += center("Grooming, Penginapan") + '\n\n';

    if (window.Android && typeof window.Android.printReceipt === 'function') {
      window.Android.printReceipt(text);
    } else {
      // Lempar ke RawBT (Android) atau window.print (PC)
      printReceipt(text);
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
    <div className={`bg-slate-100 min-h-screen flex flex-col pb-24 font-body transition-all duration-300 ${
      sidebarOpen ? 'md:pl-64' : 'md:pl-16'
    }`}>
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-5 pb-4 pt-4 sticky top-0 z-40 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => window.dispatchEvent(new Event('mobile-drawer-toggle'))}
              className="md:hidden p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center"
            >
              <span className="material-symbols-outlined !text-[24px]">menu</span>
            </button>
            <div>
              <h1 className={`font-headline font-extrabold text-xl ${primaryText}`}>Riwayat Transaksi</h1>
            <p className="text-sm text-slate-400">Daftar semua transaksi yang telah dilakukan</p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            {['harian', 'bulanan', 'tahunan'].map(type => (
              <button
                key={type}
                onClick={() => setReportType(type)}
                className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${reportType === type ? `${primaryBg} text-white shadow-md` : 'bg-slate-100 text-slate-500'}`}
              >
                {type}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="px-5 py-6 w-full space-y-4">
        {/* Navigasi Tanggal/Bulan/Tahun */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
          <button onClick={handlePrev} className="p-2 bg-slate-100 rounded-xl active:scale-90 transition-transform">
            <span className="material-symbols-outlined !text-[20px] text-slate-600">chevron_left</span>
          </button>
          <div className="text-center">
            <p className={`font-headline font-extrabold text-lg ${primaryText}`}>{dateLabel}</p>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">{reportType}</p>
          </div>
          <button onClick={handleNext} className="p-2 bg-slate-100 rounded-xl active:scale-90 transition-transform">
            <span className="material-symbols-outlined !text-[20px] text-slate-600">chevron_right</span>
          </button>
        </div>

        {/* Daftar Transaksi */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className={`w-10 h-10 border-4 border-slate-200 border-t-[#D35400] rounded-full animate-spin`}></div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-2">
            {filteredData.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-6">Belum ada transaksi di periode ini</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredData.map((tx) => {
                  const txDate = new Date(tx.date);
                  const isNonTunai = tx.paymentMethod !== 'Tunai';
                  return (
                    <div 
                      key={tx.id} 
                      onClick={() => { setSelectedTx(tx); setIsDetailOpen(true); }}
                      className="flex p-4 gap-4 hover:bg-slate-50 cursor-pointer transition-colors active:bg-slate-100"
                    >
                      {/* Kotak Tanggal */}
                      <div className={`w-16 h-16 ${primaryBg} rounded-xl flex flex-col items-center justify-center shrink-0 shadow-sm text-white`}>
                        <span className="text-xl font-extrabold leading-none">{txDate.getDate().toString().padStart(2, '0')}</span>
                        <span className="text-[10px] font-bold uppercase mt-0.5">{MONTH_NAMES[txDate.getMonth()].substring(0, 3)} {txDate.getFullYear()}</span>
                        <span className="text-[9px] font-semibold mt-1 opacity-90">{txDate.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      
                      {/* Detail Transaksi */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1 truncate">{tx.id.toUpperCase()}</p>
                        <p className="text-lg font-extrabold text-emerald-600 font-headline leading-none">{formatRupiah(tx.total)}</p>
                      </div>
                      
                      {/* Badge & Kasir */}
                      <div className="flex flex-col items-end justify-center gap-1.5 shrink-0">
                        <span className={`text-[9px] font-bold px-2 py-0.5 border rounded-sm ${isNonTunai ? 'text-emerald-600 border-emerald-600 bg-emerald-50' : 'text-red-600 border-red-600 bg-red-50'}`}>
                          {isNonTunai ? 'NON TUNAI' : 'TUNAI'}
                        </span>
                        <div className="text-right mt-1">
                          <p className="text-[9px] text-slate-400 font-medium leading-none">Dibuat oleh</p>
                          <p className="text-xs font-bold text-slate-600 leading-tight">{tx.cashierName || 'Admin'}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal Detail Transaksi */}
      {isDetailOpen && selectedTx && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50 overflow-hidden font-body animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header Modal */}
          <header className="bg-white border-b border-slate-100 px-4 py-4 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button onClick={() => setIsDetailOpen(false)} className={`p-2 -ml-2 rounded-xl active:bg-slate-100 ${primaryText} transition-colors shrink-0`}>
                <span className="material-symbols-outlined !text-[24px]">arrow_back_ios_new</span>
              </button>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] md:text-sm font-normal text-slate-500 leading-none mb-1">ID Transaksi:</span> 
                <span className="font-bold text-slate-800 text-xs md:text-lg uppercase tracking-wide truncate">{selectedTx.id.toUpperCase()}</span>
              </div>
            </div>
            <button onClick={() => navigator.clipboard.writeText(selectedTx.id)} className="text-slate-400 p-2 hover:text-slate-600 active:scale-90 transition-transform shrink-0 ml-2 bg-slate-50 rounded-xl">
              <span className="material-symbols-outlined !text-[20px]">content_copy</span>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Rincian Transaksi */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <h2 className="font-extrabold text-slate-800 text-lg mb-4">Rincian Transaksi</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Dibuat Oleh</span>
                  <span className="font-bold text-slate-800">{selectedTx.cashierName || 'Admin'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Pembayaran</span>
                  <span className="font-bold text-slate-800">{selectedTx.paymentMethod || 'Tunai'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Tanggal Transaksi</span>
                  <span className="font-bold text-slate-800">{new Date(selectedTx.date).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':')}</span>
                </div>
              </div>
            </div>

            {/* Pesanan */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <h2 className="font-extrabold text-slate-800 text-lg mb-4">Pesanan</h2>
              
              <div className="space-y-4 mb-4 mt-2">
                {(selectedTx.items || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-sm border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                    <div className="flex-1 pr-4 min-w-0">
                      <p className="font-semibold text-slate-800 leading-tight">{item.productName}</p>
                      <p className="text-xs text-slate-500 mt-1.5">{item.qty} x {formatRupiah(item.price)}</p>
                    </div>
                    <span className="font-extrabold text-slate-800 shrink-0">{formatRupiah(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Pesanan</span>
                  <span className="font-bold text-slate-800">{formatRupiah(selectedTx.total)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="font-extrabold text-slate-900 text-base">Total</span>
                  <span className="font-extrabold text-slate-900 text-base">{formatRupiah(selectedTx.total)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Bayar</span>
                  <span className="font-bold text-slate-700">{formatRupiah(selectedTx.paid || selectedTx.total)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Kembali</span>
                  <span className="font-bold text-slate-700">{formatRupiah(selectedTx.change || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="bg-white border-t border-slate-100 p-4 pb-8 flex items-center gap-3 shrink-0">
            <button 
              onClick={() => handlePrintReceipt(selectedTx)}
              className={`flex-1 ${primaryBg} hover:opacity-90 active:scale-[0.98] transition-all text-white font-bold py-3.5 rounded-2xl shadow-md text-center`}
            >
              Cetak Struk
            </button>
            
            {isAdmin && (
              <div className="relative group">
                <button 
                  className={`p-3.5 border-2 ${primaryText} border-current hover:bg-slate-50 rounded-2xl flex items-center justify-center active:scale-[0.98] transition-all`}
                  onClick={(e) => {
                    const menu = e.currentTarget.nextElementSibling;
                    menu.classList.toggle('hidden');
                  }}
                >
                  <span className="material-symbols-outlined !text-[20px]">more_vert</span>
                </button>
                {/* Popover Menu */}
                <div className="hidden absolute bottom-full right-0 mb-2 w-32 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                  <button 
                    onClick={() => handleDeleteTransaction(selectedTx.id)}
                    className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
