import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useSession } from '../lib/useSession';
import { formatRupiah } from '../utils/formatters';

export default function RiwayatRekapPage() {
  const navigate = useNavigate();
  const { role, branchId } = useSession();
  const [rekaps, setRekaps] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    // Fetch rekaps
    apiFetch(`/rekap?branchId=${role === 'admin' ? '' : branchId}`)
      .then(data => {
        setRekaps(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load rekaps:', err);
        setLoading(false);
      });
  }, [branchId, role]);

  const filteredRekaps = useMemo(() => {
    return rekaps.filter(r => {
      const d = new Date(r.endTime);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [rekaps, selectedMonth, selectedYear]);

  // Group by date
  const groupedRekaps = useMemo(() => {
    const groups = {};
    filteredRekaps.forEach(r => {
      const d = new Date(r.endTime);
      const dateKey = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(r);
    });
    return groups;
  }, [filteredRekaps]);

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-body pb-20 md:pb-0">
      {/* HEADER */}
      <header className="bg-white sticky top-0 z-30 border-b border-slate-200 px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors">
            <span className="material-symbols-outlined !text-[24px]">arrow_back_ios_new</span>
          </button>
          <h1 className="text-xl font-headline font-bold text-slate-800">Riwayat Tutup Kasir</h1>
        </div>
        <button className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm">
          Ekspor (.xlsx) <span className="border border-white/40 rounded px-1 text-[10px] ml-1">PRO</span>
        </button>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        
        {/* FILTERS */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full appearance-none bg-white border border-slate-200 rounded-2xl p-4 pr-10 text-slate-700 font-semibold focus:outline-none focus:border-orange-500 shadow-sm"
            >
              {months.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-orange-500 pointer-events-none">expand_more</span>
          </div>

          <div className="relative flex-1">
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full appearance-none bg-white border border-slate-200 rounded-2xl p-4 pr-10 text-slate-700 font-semibold focus:outline-none focus:border-orange-500 shadow-sm"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-orange-500 pointer-events-none">expand_more</span>
          </div>
        </div>

        {/* REKAP LIST */}
        {loading ? (
          <div className="text-center text-slate-500 py-10">Memuat data...</div>
        ) : filteredRekaps.length === 0 ? (
          <div className="text-center text-slate-500 py-10 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">receipt_long</span>
            <p>Belum ada tutup kasir di bulan ini.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(groupedRekaps).map(dateKey => (
              <div key={dateKey}>
                <h3 className="font-bold text-slate-600 mb-3 ml-2 text-sm">{dateKey}</h3>
                <div className="space-y-3">
                  {groupedRekaps[dateKey].map(rekap => (
                    <button 
                      key={rekap.id}
                      onClick={() => navigate(`/riwayat-rekap/${rekap.id}`)}
                      className="w-full text-left bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between hover:shadow-md transition-shadow active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                          <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${rekap.cashierName}`} alt={rekap.cashierName} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{rekap.cashierName}</p>
                          <p className="text-xs text-slate-500">Staff Kasir</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-xs text-slate-500 mb-0.5">{new Date(rekap.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                          <p className="font-bold text-emerald-600">+{formatRupiah(rekap.totalRevenue)}</p>
                        </div>
                        <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
