import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { apiFetch } from '../lib/api';
import { formatRupiah } from '../utils/formatters';

const BRANCHES = [
  { id: 'pusat', name: "Calico's Pet Care (Pusat)" },
  { id: 'gempi', name: 'Gempi Pet Shop' },
  { id: 'baba', name: 'Baba Pet Corner' },
];

export default function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const role = location.state?.role || 'kasir';
  const branchId = location.state?.branchName || 'pusat';
  const userName = location.state?.userName || (role === 'admin' ? 'Admin' : 'Kasir');
  const isAdmin = role === 'admin';
  const branchName = BRANCHES.find(b => b.id === branchId)?.name || "Calico's Pet Care";
  const shopName = branchName;

  const cacheKey = `calico_dashboard_stats_${branchId}`;
  const cachedStats = JSON.parse(localStorage.getItem(cacheKey)) || {};

  const [products, setProducts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  
  const [todayTxCount, setTodayTxCount] = useState(cachedStats.todayTxCount || 0);
  const [todayRevenue, setTodayRevenue] = useState(cachedStats.todayRevenue || 0);
  const [todayItemsSold, setTodayItemsSold] = useState(cachedStats.todayItemsSold || 0);
  const [lowStockCount, setLowStockCount] = useState(cachedStats.lowStockCount || 0);
  const [inTransitCount, setInTransitCount] = useState(cachedStats.inTransitCount || 0);

  const [chartHeights, setChartHeights] = useState([0,0,0,0,0,0,0]);
  const [chartLabels, setChartLabels] = useState(['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']);
  const [chartValues, setChartValues] = useState([0,0,0,0,0,0,0]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const branch = branchId;
    
    // Fetch today's transaction summary
    apiFetch(`/transactions/summary?date=${today}&branchId=${branch}`)
      .then(data => {
        const txCount = data.totalTransactions || 0;
        const revenue = data.totalRevenue || 0;
        setTodayTxCount(txCount);
        setTodayRevenue(revenue);
        
        const currentStats = JSON.parse(localStorage.getItem(cacheKey)) || {};
        localStorage.setItem(cacheKey, JSON.stringify({ ...currentStats, todayTxCount: txCount, todayRevenue: revenue }));
      })
      .catch(err => console.error('Dashboard summary error:', err));

    // Fetch today's transactions to count items sold
    apiFetch(`/transactions?date=${today}&branchId=${branch}`)
      .then(data => {
        if (Array.isArray(data)) {
          const totalItems = data.reduce((sum, tx) =>
            sum + (tx.items || []).reduce((s, item) => s + item.qty, 0), 0
          );
          setTodayItemsSold(totalItems);
          
          const currentStats = JSON.parse(localStorage.getItem(cacheKey)) || {};
          localStorage.setItem(cacheKey, JSON.stringify({ ...currentStats, todayItemsSold: totalItems }));
        }
      })
      .catch(err => console.error('Items sold error:', err));

    // Fetch products + stock info
    apiFetch(`/products?branchId=${branch}`)
      .then(data => {
        setProducts(data);
        // Low stock: products where totalStock === 0 (user requested to remove 'stok menipis')
        const ls = data.filter(p => (p.totalStock || 0) <= 0);
        setLowStock(ls);
        setLowStockCount(ls.length);
        
        const currentStats = JSON.parse(localStorage.getItem(cacheKey)) || {};
        localStorage.setItem(cacheKey, JSON.stringify({ ...currentStats, lowStockCount: ls.length }));
      })
      .catch(err => console.error('Products error:', err));

    // Fetch expiring batches (within 60 days)
    apiFetch(`/products/alerts/expiring?branchId=${branch}&days=60`)
      .then(data => setExpiring(data || []))
      .catch(err => console.error('Expiring error:', err));

    // Fetch transfers in transit
    apiFetch('/transfers?status=transit')
      .then(data => {
        const trs = Array.isArray(data) ? data : [];
        setTransfers(trs);
        const inTransit = trs.filter(t => t.status === 'transit').length;
        setInTransitCount(inTransit);
        
        const currentStats = JSON.parse(localStorage.getItem(cacheKey)) || {};
        localStorage.setItem(cacheKey, JSON.stringify({ ...currentStats, inTransitCount: inTransit }));
      })
      .catch(err => console.error('Transfers error:', err));

    // Fetch last 7 days of transactions for the chart
    apiFetch(`/transactions?branchId=${branch}`)
      .then(data => {
        if (!Array.isArray(data)) return;
        
        const last7Days = Array.from({length: 7}).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return {
            dateStr: d.toISOString().split('T')[0],
            label: d.toLocaleDateString('id-ID', { weekday: 'short' }),
            total: 0
          };
        });

        data.forEach(tx => {
          const txDate = new Date(tx.date).toISOString().split('T')[0];
          const dayIndex = last7Days.findIndex(d => d.dateStr === txDate);
          if (dayIndex !== -1) {
            last7Days[dayIndex].total += isAdmin ? tx.total : 1;
          }
        });

        const maxVal = Math.max(...last7Days.map(d => d.total), 1);
        setChartHeights(last7Days.map(d => (d.total / maxVal) * 100));
        setChartLabels(last7Days.map(d => d.label));
        setChartValues(last7Days.map(d => d.total));
      })
      .catch(err => console.error('Chart error:', err));
  }, [branchId, isAdmin, cacheKey]);

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

  const primary = isAdmin ? '#EA580C' : '#DC2626'; // Tailwind orange-600 / red-600
  const primaryText = isAdmin ? 'text-orange-600' : 'text-red-600';
  const primaryBg = isAdmin ? 'bg-orange-600' : 'bg-red-600';
  const primaryLight = isAdmin ? 'bg-orange-50' : 'bg-red-50';
  const primaryLightText = isAdmin ? 'text-orange-600' : 'text-red-600';
  const primaryBorder = isAdmin ? 'border-orange-100' : 'border-red-100';

  const totalProducts = products.length;

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 11 ? 'Selamat Pagi' : greetingHour < 15 ? 'Selamat Siang' : greetingHour < 18 ? 'Selamat Sore' : 'Selamat Malam';
  const todayStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className={`bg-slate-100 min-h-screen flex flex-col pb-20 font-body transition-all duration-300 ${
      sidebarOpen ? 'md:pl-64' : 'md:pl-16'
    }`}>
      {/* ── Header ── */}
      <header className="bg-white sticky top-0 z-40 border-b border-slate-100 pl-16 md:pl-5 pr-5 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
        </div>
        <button 
          onClick={() => navigate('/notifikasi', { state: { ...location.state, lowStock, expiring } })}
          className={`relative p-2 rounded-full bg-slate-50 hover:bg-slate-100 transition-all`}
        >
          <span className={`material-symbols-outlined !text-[20px] text-slate-600`}>notifications</span>
          {(lowStock.length > 0 || expiring.length > 0) && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1 shadow-sm">
              {lowStock.length + expiring.length > 99 ? '99+' : lowStock.length + expiring.length}
            </span>
          )}
        </button>
      </header>

      <main className="px-5 py-6 space-y-4 w-full">
        {/* ── Greeting ── */}
        <section className="text-center md:text-left md:mt-4">
          <h1 className={`text-2xl md:text-3xl font-extrabold font-headline ${primaryText} leading-tight`}>
            {shopName}
          </h1>
        </section>

        {/* ── Quick Links ── */}
        <div className="flex flex-col gap-3">

          {!isAdmin && (
            <button 
              onClick={() => navigate('/rekap', { state: location.state })}
              className={`border ${primaryBorder} rounded-2xl px-5 py-4 flex items-center justify-between bg-white shadow-sm active:scale-[0.98] transition-all cursor-pointer`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full ${primaryLight} flex items-center justify-center`}>
                  <span className={`material-symbols-outlined !text-[20px] ${primaryText}`}>calculate</span>
                </div>
                <span className="text-sm font-bold text-slate-800">Rekap Kasir</span>
              </div>
              <span className="material-symbols-outlined text-slate-300">chevron_right</span>
            </button>
          )}
        </div>



        {/* ── Stat Cards ── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between min-h-[108px] transition-transform hover:scale-[1.02]">
            <span className={`material-symbols-outlined ${primaryText} !text-[28px]`} style={{ fontVariationSettings: "'FILL' 1" }}>
              {isAdmin ? 'payments' : 'receipt_long'}
            </span>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{isAdmin ? 'Pendapatan Hari Ini' : 'Transaksi Hari Ini'}</p>
              <p className={`text-lg font-extrabold font-headline ${isAdmin ? 'text-slate-900' : primaryText}`}>
                {isAdmin ? formatRupiah(todayRevenue) : `${todayTxCount} Transaksi`}
              </p>
            </div>
          </div>
          {/* Card 2 */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between min-h-[108px] transition-transform hover:scale-[1.02]">
            <span className={`material-symbols-outlined ${primaryText} !text-[28px]`} style={{ fontVariationSettings: "'FILL' 1" }}>
              sell
            </span>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Item Terjual Hari Ini</p>
              <p className="text-lg font-extrabold font-headline text-slate-900">{todayItemsSold} Item</p>
            </div>
          </div>
          {/* Card 3 — Stok Kritis */}
          <div className={`rounded-2xl p-4 border shadow-sm flex flex-col justify-between min-h-[108px] transition-transform hover:scale-[1.02] ${lowStock.length > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}>
            <span className={`material-symbols-outlined !text-[28px] ${lowStock.length > 0 ? 'text-red-500' : 'text-slate-400'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
              warning
            </span>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wide ${lowStock.length > 0 ? 'text-red-400' : 'text-slate-400'}`}>Stok Kritis</p>
              <p className={`text-lg font-extrabold font-headline ${lowStock.length > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                {lowStock.length} Produk
              </p>
            </div>
          </div>
          {/* Card 4 — Transfer Transit */}
          <div className={`rounded-2xl p-4 border shadow-sm flex flex-col justify-between min-h-[108px] transition-transform hover:scale-[1.02] ${inTransitCount > 0 ? 'bg-blue-50 border-blue-100' : 'bg-white border-slate-100'}`}>
            <span className={`material-symbols-outlined !text-[28px] ${inTransitCount > 0 ? 'text-blue-500' : 'text-slate-400'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
              local_shipping
            </span>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wide ${inTransitCount > 0 ? 'text-blue-400' : 'text-slate-400'}`}>Dalam Transit</p>
              <p className={`text-lg font-extrabold font-headline ${inTransitCount > 0 ? 'text-blue-600' : 'text-slate-900'}`}>
                {inTransitCount} Transfer
              </p>
            </div>
          </div>
        </section>

        {/* ── Mini Chart ── */}
        <section className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm md:p-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className={`material-symbols-outlined ${primaryText} !text-[22px]`}>monitoring</span>
              <h3 className="font-headline font-bold text-slate-800 text-base md:text-lg">{isAdmin ? 'Tren Pendapatan' : 'Volume Penjualan'}</h3>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md ${primaryLight} ${primaryLightText}`}>
              Minggu Ini
            </span>
          </div>
          
          {/* Chart Graphic Dynamic */}
          <div className="flex items-end justify-between h-32 md:h-48 mt-6 gap-2 border-b border-slate-100 pb-2 relative">
            {chartHeights.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2 relative h-full group">
                {/* Tooltip value */}
                <div className="absolute -top-8 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                  {isAdmin ? formatRupiah(chartValues[i]) : `${chartValues[i]} Tx`}
                </div>
                <div className={`w-full rounded-t-lg transition-all duration-500 hover:opacity-80 cursor-pointer ${i === 6 ? primaryBg : (isAdmin ? 'bg-orange-100' : 'bg-red-100')}`} style={{ height: `${h}%` }}>
                </div>
                <span className="text-[10px] md:text-xs font-bold text-slate-400">
                  {chartLabels[i]}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}