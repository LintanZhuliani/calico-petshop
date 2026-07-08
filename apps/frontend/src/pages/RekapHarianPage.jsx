import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { apiFetch } from '../lib/api';
import { formatRupiah } from '../utils/formatters';

const BRANCHES = [
  { id: 'pusat', name: "Calico's Pet Care (Pusat)" },
  { id: 'gempi', name: 'Gempi Pet Shop' },
  { id: 'baba', name: 'Baba Pet Corner' },
];

function toLocalDateStr(dateStr) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export default function RekapHarianPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const role = location.state?.role || 'kasir';
  const branchId = location.state?.branchName || 'pusat';
  const branchName = BRANCHES.find(b => b.id === branchId)?.name || 'Toko';

  const [date] = useState(toLocalDateStr(new Date()));
  const [modalAwal, setModalAwal] = useState('');
  const [uangFisik, setUangFisik] = useState('');
  const [pengeluaran, setPengeluaran] = useState([]);
  const [newPengeluaranName, setNewPengeluaranName] = useState('');
  const [newPengeluaranAmount, setNewPengeluaranAmount] = useState('');

  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    // Fetch all transactions for this branch and filter locally to ensure consistency with Dashboard
    apiFetch(`/transactions?branchId=${branchId}`)
      .then(data => {
        const txs = Array.isArray(data) ? data : [];
        const todayStrLocal = new Date().toDateString();
        const todaysTxs = txs.filter(tx => new Date(tx.date).toDateString() === todayStrLocal);
        setTransactions(todaysTxs);
      })
      .catch(err => console.error('Failed to load rekap transactions:', err));
  }, [branchId]);

  const [picName, setPicName] = useState('');

  const stats = useMemo(() => {
    let grandCash = 0;
    let grandQR = 0;
    let grandTransfer = 0;
    let grandEDC = 0;

    let groomingCash = 0;
    let groomingNonCash = 0;

    let ongkirCash = 0;
    let ongkirNonCash = 0;

    let penginapanCash = 0;
    let penginapanNonCash = 0;

    transactions.forEach(tx => {
      const method = tx.paymentMethod || 'Tunai';
      
      let txCash = 0;
      let txQR = 0;
      let txTransfer = 0;
      let txEDC = 0;

      if (method.startsWith('Campuran')) {
        const nonTunaiMatch = method.match(/Rp\s*([\d\.]+)\s*\+/);
        const cashMatch = method.match(/\+\s*Tunai\s*Rp\s*([\d\.]+)/);
        
        let ntAmount = nonTunaiMatch ? parseInt(nonTunaiMatch[1].replace(/\./g, '')) : 0;
        let cAmount = cashMatch ? parseInt(cashMatch[1].replace(/\./g, '')) : 0;
        const actualCash = cAmount - (tx.change || 0);

        if (method.includes('QRIS')) txQR = ntAmount;
        else if (method.includes('Transfer')) txTransfer = ntAmount;
        else if (method.includes('EDC')) txEDC = ntAmount;
        
        txCash = actualCash;
      } else if (method === 'Tunai') {
        txCash = tx.total;
      } else if (method === 'QRIS') {
        txQR = tx.total;
      } else if (method.includes('Transfer')) {
        txTransfer = tx.total;
      } else if (method.includes('EDC')) {
        txEDC = tx.total;
      }

      grandCash += txCash;
      grandQR += txQR;
      grandTransfer += txTransfer;
      grandEDC += txEDC;

      tx.items.forEach(item => {
        const lineTotal = item.qty * item.price;
        const cat = item.category || 'Lainnya';
        
        const isCash = method === 'Tunai' || (method.startsWith('Campuran') && txCash >= lineTotal);

        if (cat === 'Grooming') {
          if (isCash) groomingCash += lineTotal;
          else groomingNonCash += lineTotal;
        } else if (cat === 'Ongkos Kirim') {
          if (isCash) ongkirCash += lineTotal;
          else ongkirNonCash += lineTotal;
        } else if (cat === 'Penginapan Kucing') {
          if (isCash) penginapanCash += lineTotal;
          else penginapanNonCash += lineTotal;
        }
      });
    });

    const grandTotal = grandCash + grandQR + grandTransfer + grandEDC;
    const totalGrooming = groomingCash + groomingNonCash;
    const totalOngkir = ongkirCash + ongkirNonCash;
    const totalPenginapan = penginapanCash + penginapanNonCash;

    return {
      grandCash, grandQR, grandTransfer, grandEDC, grandTotal,
      groomingCash, groomingNonCash, totalGrooming,
      ongkirCash, ongkirNonCash, totalOngkir,
      penginapanCash, penginapanNonCash, totalPenginapan
    };
  }, [transactions]);

  const handleAddPengeluaran = () => {
    if (!newPengeluaranName || !newPengeluaranAmount) return;
    setPengeluaran([...pengeluaran, { name: newPengeluaranName, amount: parseInt(newPengeluaranAmount) || 0 }]);
    setNewPengeluaranName('');
    setNewPengeluaranAmount('');
  };

  const removePengeluaran = (idx) => {
    setPengeluaran(pengeluaran.filter((_, i) => i !== idx));
  };

  const totalPengeluaran = pengeluaran.reduce((s, p) => s + p.amount, 0);
  const valUangFisik = parseInt(uangFisik) || 0;
  const valModalAwal = parseInt(modalAwal) || 0;

  // Kas Sistem = Modal Awal + Semua penerimaan tunai (Grand Cash) - pengeluaran tunai
  const kasSistem = valModalAwal + stats.grandCash - totalPengeluaran;
  const selisih = valUangFisik - kasSistem;
  const uangLebih = selisih > 0 ? selisih : 0;
  const uangKurang = selisih < 0 ? Math.abs(selisih) : 0;

  const generateReportText = () => {
    const dObj = new Date();
    const dStr = `${String(dObj.getDate()).padStart(2, '0')}.${String(dObj.getMonth()+1).padStart(2, '0')}. ${dObj.getFullYear()}`;
    const hb = valModalAwal;
    const cashPenjualan = stats.grandCash;
    const totalCashDiLaci = hb + cashPenjualan;
    
    let text = `*${branchName} - ${dStr}*\n\n`;
    text += `Total penjualan\n`;
    text += `Cash: ${formatRupiah(stats.grandCash)}\n`;
    text += `Qr: ${formatRupiah(stats.grandQR)}\n`;
    text += `Transfer: ${formatRupiah(stats.grandTransfer + stats.grandEDC)}\n`;
    text += `Omset: ${formatRupiah(stats.grandTotal)}\n\n`;

    text += `House bank: ${formatRupiah(hb)}\n`;
    text += `Cash penjualan: ${formatRupiah(cashPenjualan)}\n`;
    text += `Total cash di laci: ${formatRupiah(totalCashDiLaci)}\n\n`;

    text += `Pengeluaran:\n`;
    if (pengeluaran.length > 0) {
      pengeluaran.forEach(p => {
        text += `${p.name} = ${formatRupiah(p.amount)}\n`;
      });
    } else {
      text += `-\n`;
    }
    text += `\n`;

    text += `Pic: ${picName || 'Kasir'}\n\n`;

    if (uangLebih > 0 || uangKurang > 0) {
      text += `••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••\n`;
      if (uangLebih > 0) text += `* uang lebih ${formatRupiah(uangLebih)}\n`;
      if (uangKurang > 0) text += `* uang kurang ${formatRupiah(uangKurang)}\n`;
    }

    return text;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateReportText());
    alert("Laporan berhasil disalin ke clipboard!");
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
      <header className="bg-white border-b border-slate-100 px-5 py-4 sticky top-0 z-40 flex items-center gap-3">

        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-50 border border-slate-100 active:scale-95 transition-all">
          <span className="material-symbols-outlined text-slate-500 !text-[22px]">arrow_back</span>
        </button>
        <div>
          <h1 className="font-headline font-extrabold text-lg text-slate-800">Rekap Kasir Harian</h1>
          <p className="text-xs text-slate-400">{branchName}</p>
        </div>
      </header>

      <main className="px-4 py-5 space-y-5 max-w-xl md:max-w-5xl mx-auto w-full">
        
        {/* STEP 1: Ringkasan Sistem */}
        <section className="bg-slate-800 text-white p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-1">1. Ringkasan Sistem</h2>
              <p className="text-2xl font-headline font-extrabold">{formatRupiah(stats.grandTotal)}</p>
              <p className="text-xs text-slate-400">Total Pendapatan Hari Ini</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
              <span className="material-symbols-outlined !text-[20px] text-emerald-400">point_of_sale</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Cash Bersih (Disetor)</p>
              <p className="font-bold text-emerald-400">{formatRupiah(stats.grandCash - totalPengeluaran)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Total Non-Tunai</p>
              <p className="font-bold text-sky-400">{formatRupiah(stats.grandQR + stats.grandTransfer + stats.grandEDC)}</p>
            </div>
          </div>
        </section>

        {/* STEP 2: Laci Kasir */}
        <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-3">
            <span className="material-symbols-outlined text-orange-500 !text-[22px]">payments</span>
            <h2 className="font-bold text-slate-800">2. Hitung Laci Kasir</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                House Bank (Modal Awal Laci)
                <span className="ml-1 normal-case font-normal text-slate-400">(Uang pecahan sebelum buka)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400 font-bold">Rp</span>
                <input 
                  type="number" placeholder="0" 
                  value={modalAwal} onChange={e => setModalAwal(e.target.value)}
                  className="w-full bg-slate-50 rounded-xl pl-11 pr-4 py-3 text-sm font-semibold outline-none border border-slate-200 focus:border-orange-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                Uang Fisik Akhir
                <span className="ml-1 normal-case font-normal text-slate-400">(Hitungan tunai saat tutup)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400 font-bold">Rp</span>
                <input 
                  type="number" placeholder="0" 
                  value={uangFisik} onChange={e => setUangFisik(e.target.value)}
                  className="w-full bg-slate-50 rounded-xl pl-11 pr-4 py-3 text-sm font-semibold outline-none border border-slate-200 focus:border-orange-400 transition-colors"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                PIC / Nama Kasir
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400 font-bold material-symbols-outlined !text-[20px]">person</span>
                <input 
                  type="text" placeholder="Masukkan nama kasir" 
                  value={picName} onChange={e => setPicName(e.target.value)}
                  className="w-full bg-slate-50 rounded-xl pl-11 pr-4 py-3 text-sm font-semibold outline-none border border-slate-200 focus:border-orange-400 transition-colors"
                />
              </div>
            </div>
          </div>
        </section>

        {/* STEP 3: Pengeluaran & Lainnya */}
        <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
            <span className="material-symbols-outlined text-red-500 !text-[22px]">receipt_long</span>
            <h2 className="font-bold text-slate-800">3. Pengeluaran & Lainnya</h2>
          </div>
          
          {/* Pengeluaran */}
          <div className="mb-4">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Daftar Pengeluaran</label>
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <div className="flex gap-2 flex-1">
                <input 
                  type="text" placeholder="Nama (Cth: Listrik)" 
                  value={newPengeluaranName} onChange={e => setNewPengeluaranName(e.target.value)}
                  className="flex-1 bg-slate-50 rounded-xl px-3 py-2.5 text-sm outline-none border border-slate-200 focus:border-red-300 min-w-0"
                />
                <input 
                  type="number" placeholder="Nominal" 
                  value={newPengeluaranAmount} onChange={e => setNewPengeluaranAmount(e.target.value)}
                  className="w-1/3 bg-slate-50 rounded-xl px-3 py-2.5 text-sm outline-none border border-slate-200 focus:border-red-300 min-w-0"
                />
              </div>
              <button onClick={handleAddPengeluaran} className="w-full sm:w-auto bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-xl font-bold transition-colors shrink-0">
                Tambah
              </button>
            </div>

            {pengeluaran.length > 0 && (
              <div className="space-y-2 mb-3">
                {pengeluaran.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg text-sm border border-slate-100">
                    <span className="font-medium text-slate-700">{p.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-800">{formatRupiah(p.amount)}</span>
                      <button onClick={() => removePengeluaran(idx)} className="text-slate-400 hover:text-red-500">
                        <span className="material-symbols-outlined !text-[16px]">close</span>
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="text-slate-500">Total Pengeluaran</span>
                  <span className="font-bold text-red-600">-{formatRupiah(totalPengeluaran)}</span>
                </div>
              </div>
            )}
          </div>


        </section>

        {/* STEP 4: Ringkasan Pencocokan Kas */}
        <section className="bg-orange-50 p-5 rounded-2xl border border-orange-200 space-y-3">
          <h2 className="font-bold text-slate-800 mb-3 border-b border-orange-200/50 pb-2">4. Hasil Akhir (Pencocokan)</h2>
          
          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Tunai Seharusnya (Sistem)</span>
              <span className="font-semibold text-slate-800">{formatRupiah(kasSistem)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Tunai Fisik (Laci)</span>
              <span className="font-semibold text-slate-800">{formatRupiah(valUangFisik)}</span>
            </div>
            <div className="border-t border-orange-200/50 pt-2 flex justify-between items-center text-sm">
              <span className="font-bold text-slate-700">Selisih Kas</span>
              {selisih === 0 ? (
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <span className="material-symbols-outlined !text-[16px]">check_circle</span> PAS
                </span>
              ) : selisih > 0 ? (
                <span className="font-bold text-emerald-600">Lebih {formatRupiah(uangLebih)}</span>
              ) : (
                <span className="font-bold text-red-600">Kurang {formatRupiah(uangKurang)}</span>
              )}
            </div>
          </div>

          <button 
            onClick={copyToClipboard}
            className="w-full bg-orange-600 text-white font-bold py-3.5 rounded-xl hover:bg-orange-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined">content_copy</span>
            Salin Format WhatsApp
          </button>
        </section>

      </main>

      <BottomNav role={role} />
    </div>
  );
}
