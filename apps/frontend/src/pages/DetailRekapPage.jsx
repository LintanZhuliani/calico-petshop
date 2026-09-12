import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { formatRupiah } from '../utils/formatters';
import TransactionReceiptModal from '../components/TransactionReceiptModal';

export default function DetailRekapPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rekap, setRekap] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedTx, setSelectedTx] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    // Fetch rekap detail
    apiFetch(`/rekap?branchId=`) // In a real app we might want a specific GET /api/rekap/:id endpoint, but for now we can fetch all and find, or just create it in backend
      .then(data => {
        const found = data.find(r => r.id === id);
        if (found) {
          setRekap(found);
          // Fetch transactions for this branch and filter by time
          return apiFetch(`/transactions?branchId=${found.branchId}`);
        } else {
          throw new Error('Rekap not found');
        }
      })
      .then(txs => {
        if (txs && rekap) {
          const startTime = new Date(rekap.startTime);
          const endTime = new Date(rekap.endTime);
          
          const filtered = txs.filter(tx => {
            const txDate = new Date(tx.date);
            return tx.cashierName === rekap.cashierName && txDate >= startTime && txDate <= endTime;
          });
          // Sort descending
          filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
          setTransactions(filtered);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id, rekap?.startTime]);

  if (loading) return <div className="p-8 text-center">Memuat detail...</div>;
  if (!rekap) return <div className="p-8 text-center">Data tidak ditemukan</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-body pb-20 md:pb-0">
      <header className="bg-white sticky top-0 z-30 border-b border-slate-200 px-4 py-4 flex items-center shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors mr-2">
          <span className="material-symbols-outlined !text-[24px]">arrow_back_ios_new</span>
        </button>
        <h1 className="text-xl font-headline font-bold text-slate-800">Detail Tutup Kasir</h1>
      </header>

      <main className="max-w-3xl mx-auto">
        {/* Ringkasan Header */}
        <div className="bg-white p-4 border-b border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-slate-700 text-lg">Rincian Tutup Kasir</h2>
            <button className="flex items-center gap-1.5 text-red-600 font-bold text-sm px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50">
              <span className="material-symbols-outlined !text-[18px]">share</span> Bagikan
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Ditutup Oleh</span>
              <span className="font-bold text-slate-800">{rekap.cashierName} (Staff Kasir)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tanggal Tutup</span>
              <span className="font-bold text-slate-800">
                {new Date(rekap.endTime).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} {new Date(rekap.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <div className="flex justify-between pb-3 border-b border-slate-100">
              <span className="text-slate-500">Disetor Ke</span>
              <span className="font-bold text-slate-800">Admin</span>
            </div>
            
            <div className="flex justify-between pt-1">
              <span className="text-slate-500">Penjualan</span>
              <span className="font-bold text-slate-800">{formatRupiah(rekap.totalRevenue)} ({rekap.totalTransactions})</span>
            </div>
            <div className="flex justify-between pb-3 border-b border-slate-100">
              <span className="text-slate-500">Pembayaran Cicilan</span>
              <span className="font-bold text-slate-800">Rp0 (0)</span>
            </div>

            <div className="flex justify-between pt-1">
              <span className="font-bold text-slate-800">Kas Masuk</span>
              <span className="font-bold text-slate-800">{formatRupiah(rekap.totalCash)}</span>
            </div>
            <div className="flex justify-between pb-3 border-b border-slate-800">
              <span className="font-bold text-slate-800">Kas Keluar</span>
              <span className="font-bold text-slate-800">Rp0</span>
            </div>

            <div className="flex justify-between pt-1">
              <span className="font-bold text-slate-900 text-base">Total</span>
              <span className="font-bold text-slate-900 text-base">{formatRupiah(rekap.totalCash)}</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-b border-slate-200">
          <button className="w-full text-red-600 border border-red-600 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2">
            Ekspor Arus Kas (.xlsx) <span className="border border-red-600 rounded px-1 text-[10px]">PRO</span>
          </button>
        </div>

        {/* Transactions List */}
        <div className="bg-white min-h-[500px]">
          <h3 className="font-bold text-slate-600 p-4 border-b border-slate-100 text-sm">
            {new Date(rekap.endTime).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
          </h3>
          
          <div className="divide-y divide-slate-100">
            {transactions.length === 0 ? (
              <p className="text-center text-slate-500 py-6">Tidak ada transaksi terdata di shift ini.</p>
            ) : (
              transactions.map(tx => (
                <button 
                  key={tx.id} 
                  onClick={() => { setSelectedTx(tx); setShowReceipt(true); }}
                  className="w-full text-left p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-emerald-500 mt-1">download</span>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">{new Date(tx.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                      <p className="font-bold text-slate-800 text-sm mb-0.5">Penjualan produk</p>
                      <p className="text-xs text-slate-500">{tx.paymentMethod}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-600">+{formatRupiah(tx.total)}</span>
                    <span className="material-symbols-outlined text-slate-400 text-lg">chevron_right</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </main>

      {showReceipt && selectedTx && (
        <TransactionReceiptModal 
          transaction={selectedTx}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
}
