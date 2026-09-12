import React, { useState } from 'react';
import { formatRupiah } from '../utils/formatters';
import TransactionReceiptModal from './TransactionReceiptModal';

export default function DailyCashierDetailModal({ group, onClose, onDeleteTx }) {
  const [selectedTx, setSelectedTx] = useState(null);

  const txs = group.transactions || [];
  const total = group.totalCash || 0;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50 overflow-hidden font-body animate-in fade-in slide-in-from-bottom-4 duration-200">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button onClick={onClose} className="p-2 -ml-2 rounded-xl active:bg-slate-100 text-orange-600 transition-colors shrink-0">
            <span className="material-symbols-outlined !text-[24px]">arrow_back_ios_new</span>
          </button>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-slate-800 text-lg tracking-wide truncate">Rincian Tutup Kasir</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Ditutup Oleh</span>
              <span className="font-bold text-slate-800">{group.cashierName} (Staff Kasir)</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Tanggal Tutup</span>
              <span className="font-bold text-slate-800">{group.dateKey} {new Date(group.latestTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Penjualan</span>
              <span className="font-bold text-slate-800">{formatRupiah(total)} ({txs.length})</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
              <span className="text-slate-500 font-medium">Pembayaran Cicilan</span>
              <span className="font-bold text-slate-800">Rp0 (0)</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-1">
              <span className="text-slate-800 font-extrabold">Kas Masuk</span>
              <span className="font-extrabold text-slate-800">{formatRupiah(total)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-800 font-extrabold">Kas Keluar</span>
              <span className="font-extrabold text-slate-800">Rp0</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200">
              <span className="text-slate-900 font-black text-base">Total</span>
              <span className="font-black text-slate-900 text-base">{formatRupiah(total)}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-slate-600 mb-3 ml-2 text-sm">{group.dateKey}</h3>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            {txs.map((tx) => {
              const isNonTunai = tx.paymentMethod !== 'Tunai';
              return (
                <div 
                  key={tx.id} 
                  onClick={() => setSelectedTx(tx)}
                  className="flex p-4 gap-3 items-center hover:bg-slate-50 cursor-pointer active:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-emerald-600 !text-[16px]">download</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <p className="font-bold text-slate-800 text-sm truncate pr-2 uppercase">{tx.id}</p>
                      <p className="font-bold text-emerald-600 text-sm shrink-0">+{formatRupiah(tx.total)}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-slate-500">{tx.paymentMethod}</p>
                      <p className="text-xs text-slate-400">{new Date(tx.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 ml-1">chevron_right</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedTx && (
        <TransactionReceiptModal 
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
          onDelete={(id) => {
            onDeleteTx(id);
            setSelectedTx(null);
            // Optionally close the group modal if they delete, but we just leave it for now
          }}
        />
      )}
    </div>
  );
}
