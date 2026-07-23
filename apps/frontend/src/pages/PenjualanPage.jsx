import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { apiFetch } from '../lib/api';
import { useSession } from '../lib/useSession';
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
  const { role, branchName: branchId } = useSession();
  const isAdmin = role === 'admin';

  const primaryText = isAdmin ? 'text-[#D35400]' : 'text-[#C0392B]';
  const primaryBg = isAdmin ? 'bg-[#D35400]' : 'bg-[#C0392B]';
  const primaryLight = isAdmin ? 'bg-[#FFF3E0]' : 'bg-[#FDEDEC]'; // orange-50 / red-50 equivalent

  const [reportType, setReportType] = useState(isAdmin ? 'bulanan' : 'harian'); // 'harian', 'bulanan', 'tahunan'
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [filterBranch, setFilterBranch] = useState(branchId || 'semua');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (branchId) params.set('branchId', branchId);
    apiFetch(`/transactions?${params}`)
      .then(data => setTransactions(Array.isArray(data) ? data : []))
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
  const totalKeuntungan = filteredData.reduce((s, tx) => 
    s + (tx.items?.reduce((si, item) => si + (item.qty * (item.price - (item.buyPrice || 0))), 0) || 0)
  , 0);

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

    // Kolom Dasar
    const baseColumns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Tanggal', key: 'tanggal', width: 12 },
      { header: 'Waktu', key: 'waktu', width: 10 },
      { header: 'Kasir', key: 'kasir', width: 15 },
      { header: 'Cabang', key: 'cabang', width: 15 },
      { header: 'Produk', key: 'produk', width: 25 },
      { header: 'Jumlah', key: 'jumlah', width: 10 },
      { header: 'Harga Jual', key: 'harga', width: 15 },
      { header: 'Subtotal Jual', key: 'subtotal', width: 15 },
    ];
    
    if (isAdmin) {
      baseColumns.push({ header: 'Harga Modal', key: 'modal', width: 15 });
      baseColumns.push({ header: 'Laba Kotor', key: 'laba', width: 15 });
    }
    
    baseColumns.push(
      { header: 'Total Struk', key: 'total_struk', width: 15 },
      { header: 'Metode Bayar', key: 'metode_bayar', width: 15 }
    );
    
    worksheet.columns = baseColumns;

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
    
    // Urutkan data berdasarkan tanggal secara menaik (terlama -> terbaru) khusus untuk laporan Excel
    const sortedDataForExcel = [...filteredData].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    sortedDataForExcel.forEach((tx, txIdx) => {
      const txDate = new Date(tx.date);
      const tgl = txDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const waktu = txDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.'); // format jam pakai titik (misal: 09.30)
      const branchLabel = BRANCHES.find(b => b.id === tx.branchId)?.name || tx.branchId;

      tx.items?.forEach((item, itemIdx) => {
        const rowData = {
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
        };
        
        if (isAdmin) {
          rowData.modal = item.buyPrice || 0;
          rowData.laba = item.qty * (item.price - (item.buyPrice || 0));
        }

        const row = worksheet.addRow(rowData);

        // Format Uang pada kolom nominal
        row.getCell('harga').numFmt = '"Rp "#,##0';
        row.getCell('subtotal').numFmt = '"Rp "#,##0';
        if (isAdmin) {
          row.getCell('modal').numFmt = '"Rp "#,##0';
          row.getCell('laba').numFmt = '"Rp "#,##0';
        }
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
    const colBeforeTotal = isAdmin ? 11 : 9;
    
    const addTotalRow = (label, value, isMoney = false, customColor = null) => {
       const row = worksheet.addRow({});
       row.getCell(1).value = label;
       row.getCell('total_struk').value = value;
       
       const cellLabel = row.getCell(1);
       const cellValue = row.getCell('total_struk');

       cellLabel.font = { bold: true, color: customColor || { argb: 'FF000000' } };
       cellLabel.alignment = { horizontal: 'right', vertical: 'middle' };
       cellValue.font = { bold: true, color: customColor || { argb: 'FF000000' } };
       if (isMoney) cellValue.numFmt = '"Rp "#,##0';
       
       // Merge dari kolom 1 sampai 1 kolom sebelum 'total_struk'
       worksheet.mergeCells(row.number, 1, row.number, colBeforeTotal);
       
       // Beri border
       cellLabel.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
       cellValue.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    };

    addTotalRow('TOTAL PENDAPATAN', totalPendapatan, true);
    addTotalRow('TOTAL TRANSAKSI', totalTransaksi, false);
    addTotalRow('TOTAL ITEM', totalItem, false);
    if (isAdmin) {
      addTotalRow('TOTAL LABA KOTOR', totalKeuntungan, true, { argb: 'FF9A6100' });
    }

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
    <div className={`bg-slate-100 min-h-screen flex flex-col pb-24 font-body transition-all duration-300 ${
      sidebarOpen ? 'md:pl-64' : 'md:pl-16'
    }`}>
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-5 pb-4 pt-4 sticky top-0 z-40 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.dispatchEvent(new Event('mobile-drawer-toggle'))}
            className="md:hidden p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center"
          >
            <span className="material-symbols-outlined !text-[24px]">menu</span>
          </button>
          <h1 className={`font-headline font-extrabold text-xl ${primaryText}`}>Penjualan & Analitik</h1>
        </div>
        
        {isAdmin && (
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            {['harian', 'bulanan', 'tahunan'].map(type => (
              <button
                key={type}
                onClick={() => setReportType(type)}
                className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${reportType === type ? `${primaryBg} text-white shadow-md` : 'text-slate-500 hover:text-slate-700'}`}
              >
                {type}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="px-5 py-4 space-y-4 w-full">

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
        {isAdmin && (
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wide mb-1 flex items-center gap-1">
                Laba Kotor <span className="material-symbols-outlined !text-[14px] text-yellow-600">lock</span>
              </p>
              <p className="font-extrabold font-headline text-2xl md:text-3xl text-slate-800 leading-none">{formatRupiah(totalKeuntungan)}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-yellow-50">
              <span className="material-symbols-outlined !text-[28px] text-yellow-600">account_balance_wallet</span>
            </div>
          </div>
        )}

        {/* Tombol Unduh */}
        {isAdmin && (
          <button 
            onClick={handleDownloadExcel}
            className={`w-full py-3.5 ${primaryBg} hover:opacity-90 text-white font-bold rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm shadow-md`}
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
                      className={`w-full max-w-[20px] rounded-t-md transition-all ${item.val > 0 ? (isAdmin ? 'bg-[#D35400] hover:bg-[#b84800]' : 'bg-[#C0392B] hover:bg-red-800') : 'bg-slate-100'}`}
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
      
      <BottomNav />
    </div>
  );
}
