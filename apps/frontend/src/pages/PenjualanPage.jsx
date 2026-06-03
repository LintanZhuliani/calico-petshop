import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { apiFetch } from '../lib/api';
import { formatRupiah } from '../utils/formatters';

const BRANCHES = [
  { id: 'pusat', name: "Calico's Pet Care (Pusat)" },
  { id: 'gempi', name: 'Gempi Pet Shop' },
  { id: 'baba', name: 'Baba Pet Corner' },
];

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function PenjualanPage() {
  const location = useLocation();
  const role = location.state?.role || 'admin';
  const isAdmin = role === 'admin';
  const branchId = location.state?.branchName || 'pusat';

  const primaryText = isAdmin ? 'text-orange-600' : 'text-red-600';
  const primaryBg = isAdmin ? 'bg-orange-600' : 'bg-red-600';
  const primaryLight = isAdmin ? 'bg-orange-50' : 'bg-red-50';

  const [reportType, setReportType] = useState('bulanan'); // 'harian', 'bulanan', 'tahunan'
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [filterBranch, setFilterBranch] = useState(isAdmin ? 'semua' : branchId);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (!isAdmin) params.set('branchId', branchId);
    apiFetch(`/transactions?${params}`)
      .then(data => setTransactions(Array.isArray(data) ? data : []))
      .catch(err => console.error('Failed to load transactions:', err))
      .finally(() => setLoading(false));
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
      }
      const matchBranch = filterBranch === 'semua' || tx.branchId === filterBranch;
      return matchDate && matchBranch;
    });
  }, [transactions, selectedDate, reportType, filterBranch]);

  // Ringkasan
  const totalPendapatan = filteredData.reduce((s, tx) => s + tx.total, 0);
  const totalTransaksi = filteredData.length;
  const totalItem = filteredData.reduce((s, tx) => s + (tx.items?.reduce((si, it) => si + it.qty, 0) || 0), 0);

  // Data Chart
  const chartData = useMemo(() => {
    const map = {};
    let length = 0;
    let labelFormat = (i) => i;
    
    if (reportType === 'harian') {
      length = 24; // 0 to 23 hours
      labelFormat = (i) => `${i}:00`;
      filteredData.forEach(tx => {
        const hour = new Date(tx.date).getHours();
        map[hour] = (map[hour] || 0) + tx.total;
      });
    } else if (reportType === 'bulanan') {
      length = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
      labelFormat = (i) => i + 1;
      filteredData.forEach(tx => {
        const day = new Date(tx.date).getDate() - 1; // 0-indexed
        map[day] = (map[day] || 0) + tx.total;
      });
    } else if (reportType === 'tahunan') {
      length = 12;
      labelFormat = (i) => ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][i];
      filteredData.forEach(tx => {
        const month = new Date(tx.date).getMonth();
        map[month] = (map[month] || 0) + tx.total;
      });
    }

    const data = Array.from({ length }, (_, i) => ({
      label: labelFormat(i),
      val: map[i] || 0
    }));
    const maxVal = Math.max(...data.map(d => d.val), 1);
    return { data, maxVal };
  }, [filteredData, reportType, selectedDate]);

  // Produk terlaris
  const topProducts = useMemo(() => {
    const map = {};
    filteredData.forEach(tx => {
      tx.items?.forEach(item => {
        if (!map[item.productName]) map[item.productName] = { name: item.productName, qty: 0, revenue: 0 };
        map[item.productName].qty += item.qty;
        map[item.productName].revenue += item.qty * item.price;
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [filteredData]);

  // Penjualan per cabang
  const branchSales = useMemo(() => {
    const map = {};
    BRANCHES.forEach(b => { map[b.id] = { name: b.name, total: 0, count: 0 }; });
    filteredData.forEach(tx => {
      if (map[tx.branchId]) {
        map[tx.branchId].total += tx.total;
        map[tx.branchId].count += 1;
      }
    });
    return Object.values(map);
  }, [filteredData]);

  const handleDownloadCSV = () => {
    if (filteredData.length === 0) {
      alert('Tidak ada data transaksi untuk diunduh.');
      return;
    }

    const cabangLabel = filterBranch === 'semua' ? 'Semua_Cabang' : (BRANCHES.find(b => b.id === filterBranch)?.name || filterBranch);
    const header = ['No', 'Tanggal', 'Waktu', 'Kasir', 'Cabang', 'Produk', 'Jumlah', 'Harga Satuan', 'Subtotal', 'Total Struk', 'Metode Bayar'];
    
    const rows = [];
    filteredData.forEach((tx, txIdx) => {
      const txDate = new Date(tx.date);
      const tgl = txDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const waktu = txDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const branchLabel = BRANCHES.find(b => b.id === tx.branchId)?.name || tx.branchId;

      tx.items?.forEach((item, itemIdx) => {
        rows.push([
          itemIdx === 0 ? txIdx + 1 : '',
          itemIdx === 0 ? tgl : '',
          itemIdx === 0 ? waktu : '',
          itemIdx === 0 ? tx.cashierName || tx.cashier : '',
          itemIdx === 0 ? branchLabel : '',
          item.productName,
          item.qty,
          item.price,
          item.qty * item.price,
          itemIdx === 0 ? tx.total : '',
          itemIdx === 0 ? (tx.paymentMethod || 'Tunai') : ''
        ]);
      });
    });

    rows.push([]);
    rows.push(['', '', '', '', '', '', '', '', 'TOTAL PENDAPATAN', totalPendapatan, '']);
    rows.push(['', '', '', '', '', '', '', '', 'TOTAL TRANSAKSI', totalTransaksi, '']);
    rows.push(['', '', '', '', '', '', '', '', 'TOTAL ITEM TERJUAL', totalItem, '']);

    const csvContent = [header, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_Penjualan_${reportType}_${dateLabel.replace(/ /g, '_')}_${cabangLabel.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#F8F9FA] min-h-screen flex flex-col pb-20 font-body">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-5 pb-4 pt-4 sticky top-0 z-40">
        <h1 className={`font-headline font-extrabold text-xl mb-3 ${primaryText}`}></h1>
        
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
      </header>

      <main className="px-4 py-4 space-y-4 max-w-xl mx-auto w-full">

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

        {/* Ringkasan Angka */}
        <div className="grid grid-cols-3 gap-3">
          <div className={`${primaryLight} rounded-2xl p-3 text-center`}>
            <p className={`font-extrabold font-headline text-lg ${primaryText}`}>{formatRupiah(totalPendapatan)}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mt-1">Pendapatan</p>
          </div>
          <div className="bg-blue-50 rounded-2xl p-3 text-center flex flex-col justify-center">
            <p className="font-extrabold font-headline text-lg text-blue-600">{totalTransaksi}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mt-1">Transaksi</p>
          </div>
          <div className="bg-emerald-50 rounded-2xl p-3 text-center flex flex-col justify-center">
            <p className="font-extrabold font-headline text-lg text-emerald-600">{totalItem}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mt-1">Item Terjual</p>
          </div>
        </div>

        {/* Tombol Unduh */}
        <button
          onClick={handleDownloadCSV}
          className={`w-full py-3.5 ${primaryBg} text-white font-bold rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm shadow-md`}
        >
          <span className="material-symbols-outlined !text-[20px]">download</span>
          Unduh Laporan CSV
        </button>

        {/* Grafik Penjualan */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <span className={`material-symbols-outlined !text-[18px] ${primaryText}`}>monitoring</span>
            Tren Penjualan {reportType.charAt(0).toUpperCase() + reportType.slice(1)}
          </p>
          {totalTransaksi === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <span className="material-symbols-outlined !text-[40px] opacity-40">receipt_long</span>
              <p className="text-sm mt-2">Belum ada transaksi di periode ini</p>
            </div>
          ) : (
            <div className="flex items-end gap-1 h-36 overflow-x-auto pb-1 scrollbar-hide pt-4">
              {chartData.data.map((item, i) => {
                const height = item.val > 0 ? Math.max((item.val / chartData.maxVal) * 100, 8) : 4;
                // Show label rules: Daily: show every 3rd hour, Monthly: show every 5 days, Yearly: show all months
                const showLabel = reportType === 'tahunan' ? true :
                                  reportType === 'bulanan' ? (i === 0 || i % 4 === 0 || i === chartData.data.length - 1) :
                                  (i % 3 === 0);
                return (
                  <div key={i} className="flex flex-col items-center flex-1 min-w-[12px] group relative">
                    {item.val > 0 && (
                      <div className="absolute -top-8 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-md">
                        {formatRupiah(item.val)}
                      </div>
                    )}
                    <div
                      className={`w-full max-w-[20px] rounded-t-md transition-all ${item.val > 0 ? (isAdmin ? 'bg-orange-400 hover:bg-orange-500' : 'bg-red-400 hover:bg-red-500') : 'bg-slate-100'}`}
                      style={{ height: `${height}%` }}
                    />
                    <p className={`text-[9px] mt-1.5 transition-all ${showLabel ? 'text-slate-500 font-medium' : 'text-transparent'}`}>
                      {item.label}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Penjualan Per Cabang */}
        {filterBranch === 'semua' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
              <span className={`material-symbols-outlined !text-[18px] ${primaryText}`}>store</span>
              Perbandingan Cabang
            </p>
            <div className="space-y-3 mt-4">
              {branchSales.map((b, i) => {
                const maxSales = Math.max(...branchSales.map(x => x.total), 1);
                const pct = (b.total / maxSales) * 100;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-700">{b.name}</span>
                      <span className="text-slate-500 font-medium">{formatRupiah(b.total)} ({b.count} tx)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3">
                      <div className={`${primaryBg} h-3 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Produk Terlaris */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
            <span className={`material-symbols-outlined !text-[18px] ${primaryText}`}>emoji_events</span>
            Produk Terlaris
          </p>
          {topProducts.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-4">Belum ada data</p>
          ) : (
            <div className="space-y-2.5 mt-2">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-sm ${
                    i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'
                  }`}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{p.qty} item terjual</p>
                  </div>
                  <p className={`text-sm font-bold ${primaryText}`}>{formatRupiah(p.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
      
      {isAdmin && <BottomNav />}
    </div>
  );
}
