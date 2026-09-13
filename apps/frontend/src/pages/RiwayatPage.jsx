import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { apiFetch } from '../lib/api';
import { useSession } from '../lib/useSession';
import { formatRupiah } from '../utils/formatters';
import { printReceipt } from '../utils/printer';
import { exportToExcel } from '../utils/export';
import TransactionReceiptModal from '../components/TransactionReceiptModal';
import DailyCashierDetailModal from '../components/DailyCashierDetailModal';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const BRANCHES = [
  { id: 'semua', name: 'Semua Cabang' },
  { id: 'pusat', name: "Calico's Pet Care (Pusat)" },
  { id: 'gempi', name: 'Gempi Pet Shop' },
  { id: 'baba', name: 'Baba Pet Corner' },
];

export default function RiwayatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, branchName: branchId } = useSession();
  const isAdmin = role === 'admin';

  const primaryText = isAdmin ? 'text-[#D35400]' : 'text-[#C0392B]';
  const primaryBg = isAdmin ? 'bg-[#D35400]' : 'bg-[#C0392B]';
  const primaryLight = isAdmin ? 'bg-[#D35400]/10' : 'bg-[#C0392B]/10';

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  // Branch filter for admin (client-side filter after fetching all)
  const [filterBranch, setFilterBranch] = useState('semua');

  const [reportType, setReportType] = useState(isAdmin ? 'bulanan' : 'harian');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // States for Transaction Detail Modal
  const [selectedTx, setSelectedTx] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState({});

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (isAdmin) {
      params.set('branchId', 'all');
    } else {
      params.set('branchId', branchId || 'pusat');
    }
    
    apiFetch(`/transactions?${params}`)
      .then(txData => {
        let txs = Array.isArray(txData) ? txData : [];
        
        if (!isAdmin) {
          const { userName } = JSON.parse(localStorage.getItem('calico_session')) || {};
          if (userName) {
             txs = txs.filter(tx => tx.cashierName === userName);
          }
        }
        
        txs.sort((a, b) => new Date(b.date) - new Date(a.date));
        setTransactions(txs);
        
        // Auto open receipt logic if navigated from checkout
        if (location.state?.autoOpenReceipt) {
          const newTx = txs.find(t => t.id === location.state.autoOpenReceipt);
          if (newTx) {
            setSelectedTx(newTx);
            setIsDetailOpen(true);
            window.history.replaceState({ ...location.state, autoOpenReceipt: undefined }, document.title);
          }
        } else if (location.state?.autoOpenLatest && txs.length > 0) {
          setSelectedTx(txs[0]);
          setIsDetailOpen(true);
          window.history.replaceState({ ...location.state, autoOpenLatest: undefined }, document.title);
        }
      })
      .catch(err => console.error('Failed to load data:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
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
      let matchDate = false;
      if (reportType === 'harian') {
        matchDate = d.toDateString() === selectedDate.toDateString();
      } else if (reportType === 'bulanan') {
        matchDate = d.getFullYear() === selectedDate.getFullYear() && d.getMonth() === selectedDate.getMonth();
      } else if (reportType === 'tahunan') {
        matchDate = d.getFullYear() === selectedDate.getFullYear();
      } else {
        matchDate = true;
      }
      const matchBranch = !isAdmin || filterBranch === 'semua' || tx.branchId === filterBranch;
      return matchDate && matchBranch;
    });
  }, [transactions, selectedDate, reportType, filterBranch, isAdmin]);

  const groupedTransactions = useMemo(() => {
    if (reportType !== 'bulanan') return {};
    const groups = {};
    filteredData.forEach(tx => {
      const d = new Date(tx.date);
      const dateKey = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      if (!groups[dateKey]) groups[dateKey] = {};
      
      const cashier = tx.cashierName || 'Admin';
      if (!groups[dateKey][cashier]) {
        groups[dateKey][cashier] = {
           dateKey,
           cashierName: cashier,
           totalCash: 0,
           transactions: [],
           latestTime: tx.date
        };
      }
      groups[dateKey][cashier].totalCash += tx.total;
      groups[dateKey][cashier].transactions.push(tx);
      if (new Date(tx.date) > new Date(groups[dateKey][cashier].latestTime)) {
        groups[dateKey][cashier].latestTime = tx.date;
      }
    });
    return groups;
  }, [filteredData, reportType]);

  const groupedTransactionsYearly = useMemo(() => {
    if (reportType !== 'tahunan') return {};
    const groups = {};
    filteredData.forEach(tx => {
      const d = new Date(tx.date);
      const monthKey = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
      if (!groups[monthKey]) groups[monthKey] = { totalCash: 0, cashiers: {} };
      
      groups[monthKey].totalCash += tx.total;

      const cashier = tx.cashierName || 'Admin';
      if (!groups[monthKey].cashiers[cashier]) {
        groups[monthKey].cashiers[cashier] = { totalCash: 0, days: {} };
      }
      groups[monthKey].cashiers[cashier].totalCash += tx.total;

      const dateKey = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      if (!groups[monthKey].cashiers[cashier].days[dateKey]) {
        groups[monthKey].cashiers[cashier].days[dateKey] = { totalCash: 0, products: {} };
      }
      groups[monthKey].cashiers[cashier].days[dateKey].totalCash += tx.total;

      const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : (tx.items || []);
      items.forEach(item => {
        const prodId = item.productId || item.name; // fallback to name if no id
        if (!groups[monthKey].cashiers[cashier].days[dateKey].products[prodId]) {
          groups[monthKey].cashiers[cashier].days[dateKey].products[prodId] = {
            name: item.name,
            totalQty: 0,
            totalCash: 0,
            transactions: []
          };
        }
        const prodGroup = groups[monthKey].cashiers[cashier].days[dateKey].products[prodId];
        prodGroup.totalQty += item.qty;
        prodGroup.totalCash += (item.price * item.qty);
        
        if (!prodGroup.transactions.find(t => t.id === tx.id)) {
           prodGroup.transactions.push(tx);
        }
      });
    });
    return groups;
  }, [filteredData, reportType]);

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
    if (tx.customerName) text += pad("Pelanggan", tx.customerName) + '\n';
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
    <div className={`bg-white min-h-screen flex flex-col pb-24 font-body transition-all duration-300 ${
      sidebarOpen ? 'md:pl-64' : 'md:pl-16'
    }`}>
      {/* Header */}
      <header className="bg-white pt-4 sticky top-0 z-40 flex flex-col">
        <div className="flex items-center gap-3 px-5 mb-3">
          <button 
            onClick={() => window.dispatchEvent(new Event('mobile-drawer-toggle'))}
            className="md:hidden p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center shrink-0"
          >
            <span className="material-symbols-outlined !text-[24px]">menu</span>
          </button>
          <div className="flex-1 text-center">
            <h1 className={`font-headline font-extrabold text-xl ${primaryText}`}>Riwayat Transaksi</h1>
          </div>
          {/* Spacer to balance hamburger so title stays centered */}
          <div className="md:hidden w-10 shrink-0"></div>
        </div>

        <div className="flex w-full border-b-2 border-slate-200 px-5 mt-auto">
          {['harian', 'bulanan', 'tahunan'].map(type => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`flex-1 text-center py-2.5 text-sm font-bold capitalize transition-all duration-200 rounded-t-xl border-2 -mb-[2px] ${
                reportType === type 
                  ? `bg-white border-slate-200 border-b-white z-10 ${primaryText}` 
                  : `border-transparent text-slate-500 hover:bg-slate-50`
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        
        {isAdmin && (
          <div className="flex items-center gap-2 px-5 py-2 border-b border-slate-100">
            {/* Branch filter dropdown for admin */}
            <span className="material-symbols-outlined !text-[16px] text-slate-400">storefront</span>
            <select
              id="riwayat-branch-filter"
              value={filterBranch}
              onChange={e => setFilterBranch(e.target.value)}
              className="text-sm font-semibold text-slate-600 bg-transparent border-none outline-none cursor-pointer"
            >
              {BRANCHES.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </header>

      <main className="px-5 py-6 w-full space-y-4">
        {/* Navigasi Tanggal/Bulan/Tahun */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
          <button onClick={handlePrev} className="p-2 bg-slate-100 rounded-xl active:scale-90 transition-transform">
            <span className="material-symbols-outlined !text-[20px] text-slate-600">chevron_left</span>
          </button>
          <div className="text-center">
            <p className={`font-headline font-extrabold text-lg ${primaryText}`}>{dateLabel}</p>
          </div>
          <button onClick={handleNext} className="p-2 bg-slate-100 rounded-xl active:scale-90 transition-transform">
            <span className="material-symbols-outlined !text-[20px] text-slate-600">chevron_right</span>
          </button>
        </div>

        <button 
          onClick={() => exportToExcel(filteredData, dateLabel)}
          className="w-full bg-green-50 text-green-700 border border-green-200 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all text-sm"
        >
          <span className="material-symbols-outlined !text-[20px]">download</span>
          Unduh Laporan (Excel)
        </button>

        {/* ── Ringkasan (Kasir only) ── */}
        {!isAdmin && (() => {
          const totalPenghasilan = filteredData.reduce((s, tx) => s + (tx.total || 0), 0);
          let totalTunai = 0;
          let totalNonTunai = 0;
          filteredData.forEach(tx => {
            const method = tx.paymentMethod || 'Tunai';
            if (method === 'Tunai') {
              totalTunai += (tx.total || 0);
            } else if (method.startsWith('Campuran')) {
              const nonTunaiMatch = method.match(/Rp\s*([\d\.]+)\s*\+/);
              const ntAmt = nonTunaiMatch ? parseInt(nonTunaiMatch[1].replace(/\./g, '')) : 0;
              totalNonTunai += ntAmt;
              totalTunai += Math.max(0, (tx.total || 0) - ntAmt);
            } else {
              totalNonTunai += (tx.total || 0);
            }
          });
          return (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col items-center text-center">
                <span className="material-symbols-outlined text-slate-400 !text-[22px] mb-1">payments</span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Penghasilan</p>
                <p className={`font-extrabold text-sm leading-tight ${primaryText}`}>{formatRupiah(totalPenghasilan)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col items-center text-center">
                <span className="material-symbols-outlined text-slate-400 !text-[22px] mb-1">money</span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tunai</p>
                <p className="font-extrabold text-sm leading-tight text-green-600">{formatRupiah(totalTunai)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col items-center text-center">
                <span className="material-symbols-outlined text-slate-400 !text-[22px] mb-1">credit_card</span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Transfer</p>
                <p className="font-extrabold text-sm leading-tight text-blue-600">{formatRupiah(totalNonTunai)}</p>
              </div>
            </div>
          );
        })()}

        {/* Daftar Transaksi atau Tutup Kasir */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className={`w-10 h-10 border-4 border-slate-200 border-t-[#D35400] rounded-full animate-spin`}></div>
          </div>
        ) : reportType === 'bulanan' ? (
          <div className="mt-2 space-y-6">
            {Object.keys(groupedTransactions).length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-6 bg-white rounded-2xl border border-slate-200 shadow-sm">Belum ada transaksi di bulan ini</p>
            ) : (
              Object.keys(groupedTransactions).map(dateKey => (
                <div key={dateKey}>
                  <h3 className="font-bold text-slate-600 mb-3 ml-2 text-sm">{dateKey}</h3>
                  <div className="space-y-3">
                    {Object.values(groupedTransactions[dateKey]).map(group => (
                      <button 
                        key={group.cashierName}
                        onClick={() => setSelectedGroup(group)}
                        className="w-full text-left bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between hover:shadow-md transition-shadow active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center border-2 border-white shadow-sm">
                            <span className="material-symbols-outlined text-orange-600 !text-[24px]">person</span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{group.cashierName}</p>
                            <p className="text-xs text-slate-500">Staff Kasir</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-xs text-slate-500 mb-0.5">{new Date(group.latestTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                            <p className="font-bold text-emerald-600">+{formatRupiah(group.totalCash)}</p>
                          </div>
                          <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : reportType === 'tahunan' ? (
          <div className="mt-2 space-y-4">
            {Object.keys(groupedTransactionsYearly).length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-6 bg-white rounded-2xl border border-slate-200 shadow-sm">Belum ada transaksi di tahun ini</p>
            ) : (
              Object.keys(groupedTransactionsYearly).map(monthKey => {
                const monthData = groupedTransactionsYearly[monthKey];
                const isMonthExpanded = expandedNodes[monthKey];
                return (
                  <div key={monthKey} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <button 
                      onClick={() => setExpandedNodes(prev => ({...prev, [monthKey]: !prev[monthKey]}))}
                      className="w-full p-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-bold text-slate-700">{monthKey}</span>
                        <span className="text-xs text-slate-500 font-medium">{Object.keys(monthData.cashiers).length} Karyawan Aktif</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-emerald-600">+{formatRupiah(monthData.totalCash)}</span>
                        <span className={`material-symbols-outlined text-slate-400 transition-transform ${isMonthExpanded ? 'rotate-90' : ''}`}>chevron_right</span>
                      </div>
                    </button>
                    
                    {isMonthExpanded && (
                      <div className="p-4 pt-2 space-y-4 bg-white border-t border-slate-100">
                        {Object.keys(monthData.cashiers).map(cashierKey => {
                          const cashierData = monthData.cashiers[cashierKey];
                          const cashierNodeId = `${monthKey}-${cashierKey}`;
                          const isCashierExpanded = expandedNodes[cashierNodeId];
                          return (
                            <div key={cashierKey} className="border border-slate-200 rounded-xl overflow-hidden">
                              <button 
                                onClick={() => setExpandedNodes(prev => ({...prev, [cashierNodeId]: !prev[cashierNodeId]}))}
                                className="w-full p-3 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-orange-600 !text-[18px]">person</span>
                                  </div>
                                  <div className="flex flex-col items-start">
                                    <span className="font-bold text-slate-700 text-sm">{cashierKey}</span>
                                    <span className="text-[11px] text-slate-500">{Object.keys(cashierData.days).length} Hari Aktif</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-emerald-600 text-sm">+{formatRupiah(cashierData.totalCash)}</span>
                                  <span className={`material-symbols-outlined text-slate-400 text-sm transition-transform ${isCashierExpanded ? 'rotate-90' : ''}`}>chevron_right</span>
                                </div>
                              </button>

                              {isCashierExpanded && (
                                <div className="p-3 bg-slate-50/50 space-y-3 border-t border-slate-100">
                                  {Object.keys(cashierData.days).map(dateKey => {
                                    const dayData = cashierData.days[dateKey];
                                    const dayNodeId = `${cashierNodeId}-${dateKey}`;
                                    const isDayExpanded = expandedNodes[dayNodeId];
                                    return (
                                      <div key={dateKey} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                        <button 
                                          onClick={() => setExpandedNodes(prev => ({...prev, [dayNodeId]: !prev[dayNodeId]}))}
                                          className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                        >
                                          <span className="font-bold text-slate-600 text-xs">{dateKey}</span>
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-emerald-600 text-xs">+{formatRupiah(dayData.totalCash)}</span>
                                            <span className={`material-symbols-outlined text-slate-400 text-[16px] transition-transform ${isDayExpanded ? 'rotate-90' : ''}`}>chevron_right</span>
                                          </div>
                                        </button>

                                        {isDayExpanded && (
                                          <div className="p-3 bg-slate-50 space-y-2 border-t border-slate-100">
                                            {Object.keys(dayData.products).map(prodId => {
                                              const prodData = dayData.products[prodId];
                                              const prodNodeId = `${dayNodeId}-${prodId}`;
                                              const isProdExpanded = expandedNodes[prodNodeId];
                                              return (
                                                <div key={prodId} className="bg-white border border-slate-200 rounded-md overflow-hidden">
                                                  <button 
                                                    onClick={() => setExpandedNodes(prev => ({...prev, [prodNodeId]: !prev[prodNodeId]}))}
                                                    className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                                  >
                                                    <div className="flex flex-col items-start">
                                                      <span className="font-semibold text-slate-700 text-[11px] text-left">{prodData.name}</span>
                                                      <span className="text-[10px] text-slate-500">{prodData.totalQty} pcs terjual</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                      <span className="font-bold text-emerald-600 text-[11px]">+{formatRupiah(prodData.totalCash)}</span>
                                                      <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${isProdExpanded ? 'rotate-90' : ''}`}>chevron_right</span>
                                                    </div>
                                                  </button>

                                                  {isProdExpanded && (
                                                    <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 space-y-1.5">
                                                      {prodData.transactions.map(tx => (
                                                        <button 
                                                          key={tx.id}
                                                          onClick={() => { setSelectedTx(tx); setIsDetailOpen(true); }}
                                                          className="w-full p-2 bg-white border border-slate-200 rounded text-left flex items-center justify-between hover:border-orange-300 transition-colors"
                                                        >
                                                          <div className="flex flex-col">
                                                            <span className="font-mono text-[10px] font-bold text-slate-600">{tx.id.split('-').pop()}</span>
                                                            <span className="text-[9px] text-slate-400">{new Date(tx.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                                          </div>
                                                          <span className="material-symbols-outlined text-[14px] text-orange-500">receipt_long</span>
                                                        </button>
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-2">
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
        <TransactionReceiptModal 
          transaction={selectedTx}
          onClose={() => setIsDetailOpen(false)}
          onDelete={handleDeleteTransaction}
        />
      )}

      {/* Modal Detail Rekap Harian per Kasir */}
      {selectedGroup && (
        <DailyCashierDetailModal 
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
          onDeleteTx={handleDeleteTransaction}
        />
      )}

      <BottomNav />
    </div>
  );
}
