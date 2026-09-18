import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/useSession';
import { apiFetch } from '../lib/api';
import BottomNav from '../components/BottomNav';
import { exportProductsToExcel } from '../utils/export';

export default function DataProdukPage() {
  const { role, user } = useSession();
  const navigate = useNavigate();
  const isAdmin = role === 'admin';

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState('');

  // 1. Authorization check
  useEffect(() => {
    if (user?.email !== 'lintanzhuliani840@gmail.com') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // 2. Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const data = await apiFetch('/branches');
        setBranches(data || []);
      } catch (err) {
        console.error('Failed to fetch branches', err);
      }
    };
    fetchBranches();
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    setMessage('');
    try {
      // Get the name for the file
      let branchName = 'Semua_Cabang';
      if (selectedBranch !== 'all') {
        const b = branches.find(x => x.id === selectedBranch);
        if (b) branchName = b.name;
      }

      const productsData = await apiFetch(`/products/export?branchId=${selectedBranch}`);
      
      if (!productsData || productsData.length === 0) {
        setMessage('Tidak ada data produk yang ditemukan.');
        setIsExporting(false);
        return;
      }

      await exportProductsToExcel(productsData, branchName);
      setMessage('Berhasil mengunduh data!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setMessage('Gagal mengunduh data: Akses ditolak atau terjadi kesalahan.');
    } finally {
      setIsExporting(false);
    }
  };

  const primaryBg = isAdmin ? 'bg-[#D35400]' : 'bg-[#C0392B]';
  const primaryLight = isAdmin ? 'bg-orange-100' : 'bg-red-100';
  const primaryText = isAdmin ? 'text-[#D35400]' : 'text-[#C0392B]';

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-body pb-24 md:pb-0">
      {/* HEADER */}
      <div className={`md:hidden ${primaryBg} text-white p-6 rounded-b-[32px] shadow-sm relative z-10`}>
        <div className="flex items-center gap-4 mt-8">
          <h1 className="font-headline font-bold text-2xl tracking-tight">Data Produk</h1>
        </div>
        <p className="text-white/80 text-sm mt-1">Pusat Unduh Laporan Inventaris</p>
      </div>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full p-6 md:p-8 md:mt-10">
        <div className="hidden md:block mb-8">
          <h1 className="font-headline font-bold text-3xl text-slate-800">Data Produk</h1>
          <p className="text-slate-500 mt-1">Unduh Laporan Inventaris (Khusus Owner)</p>
        </div>

        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
          <div className={`w-16 h-16 rounded-2xl ${primaryLight} flex items-center justify-center mb-6`}>
            <span className={`material-symbols-outlined !text-[32px] ${primaryText}`}>inventory_2</span>
          </div>

          <h2 className="font-bold text-lg text-slate-800 mb-2">Pilih Cabang</h2>
          <p className="text-sm text-slate-500 mb-6">Silakan pilih cabang untuk mengunduh laporan stok beserta batch dan tanggal kedaluwarsa.</p>

          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 focus:border-[#D35400] rounded-2xl text-slate-700 font-bold outline-none mb-8 transition-colors appearance-none"
            style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394A3B8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
          >
            <option value="all">🏢 Semua Cabang</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>🏠 {b.name}</option>
            ))}
          </select>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`w-full py-4 ${primaryBg} hover:opacity-90 text-white font-bold rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50`}
          >
            <span className="material-symbols-outlined">download</span>
            {isExporting ? 'Memproses...' : 'Unduh Excel Data Produk'}
          </button>

          {message && (
            <p className={`mt-4 text-center text-sm font-semibold ${message.includes('Gagal') || message.includes('Tidak ada') ? 'text-red-500' : 'text-emerald-500'}`}>
              {message}
            </p>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
