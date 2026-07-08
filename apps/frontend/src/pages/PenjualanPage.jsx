import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { apiFetch } from '../lib/api';
import { formatRupiah } from '../utils/formatters';
import ExcelJS from 'exceljs';

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

  const [reportType, setReportType] = useState(isAdmin ? 'bulanan' : 'harian'); // 'harian', 'bulanan', 'tahunan'
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [filterBranch, setFilterBranch] = useState(isAdmin ? 'semua' : branchId);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // States for Transaction Detail Modal
  const [selectedTx, setSelectedTx] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchTransactions = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (!isAdmin) params.set('branchId', branchId);
    apiFetch(`/transactions?${params}`)
      .then(data => setTransactions(Array.isArray(data) ? data : []))
      .catch(err => console.error('Failed to load transactions:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTransactions();
  }, [isAdmin, branchId]);

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
    // Generate text for receipt (thermal printer format)
    const storeName = branchId === 'pusat' ? "Calico's Pet Care" : 
                      branchId === 'gempi' ? "Gempi Pet Shop" : "Baba Pet Corner";
    let text = `${storeName}\n`;
    text += `Tanggal: ${new Date(tx.date).toLocaleString('id-ID')}\n`;
    text += `Kasir: ${tx.cashierName || 'Admin'}\n`;
    text += `ID: ${tx.id}\n`;
    text += `--------------------------------\n`;
    
    (tx.items || []).forEach(item => {
      text += `${item.productName}\n`;
      text += `${item.qty} x ${formatRupiah(item.price)}\n`;
      text += `                     ${formatRupiah(item.qty * item.price)}\n`;
    });
    
    text += `--------------------------------\n`;
    text += `Total     : ${formatRupiah(tx.total)}\n`;
    text += `Bayar     : ${formatRupiah(tx.paid || tx.total)}\n`;
    text += `Kembali   : ${formatRupiah(tx.change || 0)}\n`;
    text += `Metode    : ${tx.paymentMethod}\n`;
    text += `--------------------------------\n`;
    text += `Terima Kasih!\n\n`;

    // Try to trigger android bridge or just copy to clipboard if web
    if (window.Android && typeof window.Android.printReceipt === 'function') {
      window.Android.printReceipt(text);
    } else {
      navigator.clipboard.writeText(text);
      alert("Struk disalin ke clipboard! (Fitur cetak otomatis khusus di aplikasi Android)");
    }
  };

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

  const handleDownloadExcel = async () => {
    if (filteredData.length === 0) {
      alert('Tidak ada data transaksi untuk diunduh.');
      return;
    }

    const cabangLabel = filterBranch === 'semua' ? 'Semua_Cabang' : (BRANCHES.find(b => b.id === filterBranch)?.name || filterBranch);
    
    // Inisialisasi Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Penjualan');

    // Kolom
    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Tanggal', key: 'tanggal', width: 12 },
      { header: 'Waktu', key: 'waktu', width: 10 },
      { header: 'Kasir', key: 'kasir', width: 15 },
      { header: 'Cabang', key: 'cabang', width: 15 },
      { header: 'Produk', key: 'produk', width: 25 },
      { header: 'Jumlah', key: 'jumlah', width: 10 },
      { header: 'Harga Satuan', key: 'harga', width: 15 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'Total Struk', key: 'total_struk', width: 15 },
      { header: 'Metode Bayar', key: 'metode_bayar', width: 15 },
    ];

    // Format Header (Baris 1)
    worksheet.getRow(1).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E4D2B' } // Dark Green
      };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Isi Baris Data
    let rowNum = 1;
    filteredData.forEach((tx, txIdx) => {
      const txDate = new Date(tx.date);
      const tgl = txDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const waktu = txDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.'); // format jam pakai titik (misal: 09.30)
      const branchLabel = BRANCHES.find(b => b.id === tx.branchId)?.name || tx.branchId;

      tx.items?.forEach((item, itemIdx) => {
        const row = worksheet.addRow({
          no: itemIdx === 0 ? rowNum : '',
          tanggal: itemIdx === 0 ? tgl : '',
          waktu: itemIdx === 0 ? waktu : '',
          kasir: itemIdx === 0 ? (tx.cashierName || tx.cashier) : '',
          cabang: itemIdx === 0 ? branchLabel : '',
          produk: item.productName,
          jumlah: item.qty,
          harga: item.price,
          subtotal: item.qty * item.price,
          total_struk: itemIdx === 0 ? tx.total : '',
          metode_bayar: itemIdx === 0 ? (tx.paymentMethod || 'Tunai') : ''
        });

        // Format Uang pada kolom Harga (H), Subtotal (I), dan Total Struk (J)
        row.getCell('harga').numFmt = '"Rp "#,##0';
        row.getCell('subtotal').numFmt = '"Rp "#,##0';
        if (itemIdx === 0) row.getCell('total_struk').numFmt = '"Rp "#,##0';

        // Border tiap cell data
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
            color: { argb: 'FFDDDDDD' }
          };
        });
      });
      rowNum++;
    });

    // Jeda 1 baris
    worksheet.addRow([]);

    // Baris Total
    const totalPendapatanRow = worksheet.addRow({ subtotal: 'TOTAL PENDAPATAN', total_struk: totalPendapatan });
    totalPendapatanRow.getCell('subtotal').font = { bold: true };
    totalPendapatanRow.getCell('total_struk').font = { bold: true };
    totalPendapatanRow.getCell('total_struk').numFmt = '"Rp "#,##0';

    const totalTransaksiRow = worksheet.addRow({ subtotal: 'TOTAL TRANSAKSI', total_struk: totalTransaksi });
    totalTransaksiRow.getCell('subtotal').font = { bold: true };
    totalTransaksiRow.getCell('total_struk').font = { bold: true };

    const totalItemRow = worksheet.addRow({ subtotal: 'TOTAL ITEM', total_struk: totalItem });
    totalItemRow.getCell('subtotal').font = { bold: true };
    totalItemRow.getCell('total_struk').font = { bold: true };

    // Format border untuk area total
    [totalPendapatanRow, totalTransaksiRow, totalItemRow].forEach(row => {
      row.getCell('subtotal').border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      row.getCell('total_struk').border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });

    // Buat Blob dan Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_Penjualan_${reportType}_${dateLabel.replace(/ /g, '_')}_${cabangLabel.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
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
    <div className={`bg-[#F8F9FA] min-h-screen flex flex-col pb-20 font-body transition-all duration-300 ${
      sidebarOpen ? 'md:pl-64' : 'md:pl-16'
    }`}>
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-5 pb-4 pt-4 sticky top-0 z-40 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h1 className={`font-headline font-extrabold text-xl ${primaryText}`}>Penjualan</h1>
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

      <main className="px-4 py-4 space-y-4 max-w-xl md:max-w-5xl mx-auto w-full">

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
        {isAdmin && (
          <button 
            onClick={handleDownloadExcel}
            className={`w-full py-3.5 ${primaryBg} text-white font-bold rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm shadow-md`}
          >
            <span className="material-symbols-outlined !text-[20px]">download</span>
            Unduh Excel
          </button>
        )}

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

        </div>

        {/* Daftar Transaksi */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-6">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <span className={`material-symbols-outlined !text-[18px] ${primaryText}`}>list_alt</span>
              Riwayat Transaksi
            </p>
          </div>
          
          {filteredData.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-6">Belum ada transaksi</p>
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
                    <div className="w-16 h-16 bg-amber-400 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-sm text-slate-900">
                      <span className="text-xl font-extrabold leading-none">{txDate.getDate().toString().padStart(2, '0')}</span>
                      <span className="text-[10px] font-bold uppercase mt-0.5">{MONTH_NAMES[txDate.getMonth()].substring(0, 3)} {txDate.getFullYear()}</span>
                      <span className="text-[9px] font-semibold mt-1">{txDate.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</span>
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
                        <p className="text-xs font-bold text-red-600 leading-tight">{tx.cashierName || 'Admin'}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>
      
      {/* Modal Detail Transaksi */}
      {isDetailOpen && selectedTx && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 overflow-hidden font-body animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header Modal */}
          <header className="bg-white border-b border-slate-100 px-4 py-4 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsDetailOpen(false)} className="p-2 -ml-2 rounded-xl active:bg-slate-100 text-red-600 transition-colors">
                <span className="material-symbols-outlined !text-[24px]">arrow_back_ios_new</span>
              </button>
              <h1 className="font-bold text-slate-800 text-lg uppercase tracking-wide">{selectedTx.id.toUpperCase()}</h1>
              <button onClick={() => navigator.clipboard.writeText(selectedTx.id)} className="text-slate-400 p-1 hover:text-slate-600 active:scale-90 transition-transform">
                <span className="material-symbols-outlined !text-[20px]">content_copy</span>
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Rincian Transaksi */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <h2 className="font-extrabold text-slate-800 text-lg mb-4">Rincian Transaksi</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Dibuat Oleh</span>
                  <span className="font-bold text-slate-800">{selectedTx.cashierName || 'Admin'} <span className="text-slate-400 font-normal">(Staff Kasir)</span></span>
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
              
              <div className="flex justify-between text-[11px] font-bold text-slate-400 border-b border-slate-100 pb-2 mb-3">
                <span className="w-1/2">Nama Barang</span>
                <span className="w-1/4 text-center">Jumlah</span>
                <span className="w-1/4 text-right">Harga</span>
              </div>

              <div className="space-y-3 mb-4">
                {(selectedTx.items || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-sm border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                    <span className="w-1/2 font-medium text-slate-700 pr-2">{item.productName}</span>
                    <span className="w-1/4 text-center text-slate-500">{formatRupiah(item.price)} x {item.qty}</span>
                    <span className="w-1/4 text-right font-extrabold text-slate-800">{formatRupiah(item.price * item.qty)}</span>
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
              className="flex-1 bg-[#EE2737] hover:bg-red-700 active:scale-[0.98] transition-all text-white font-bold py-3.5 rounded-2xl shadow-md text-center"
            >
              Lihat Struk
            </button>
            
            {isAdmin && (
              <div className="relative group">
                <button 
                  className="p-3.5 border-2 border-[#EE2737] rounded-2xl text-[#EE2737] flex items-center justify-center hover:bg-red-50 active:scale-[0.98] transition-all"
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

      {isAdmin && <BottomNav />}
    </div>
  );
}
