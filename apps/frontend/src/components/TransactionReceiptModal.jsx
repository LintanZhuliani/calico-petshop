import React, { useState } from 'react';
import { formatRupiah } from '../utils/formatters';
import { useSession } from '../lib/useSession';

export default function TransactionReceiptModal({ transaction: selectedTx, onClose, onDelete }) {
  const { role } = useSession();
  const isAdmin = role === 'admin';
  const primaryText = 'text-orange-600';
  const primaryBg = 'bg-orange-600';
  const primaryLight = 'bg-orange-50';
  
  const [selectedItemDetail, setSelectedItemDetail] = useState(null);

  const handlePrintReceipt = (tx) => {
    let content = `
      <html>
      <head>
        <title>Struk Transaksi ${tx.id}</title>
        <style>
          body { font-family: monospace; width: 300px; margin: 0; padding: 20px; color: #000; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
          .flex-between { display: flex; justify-content: space-between; }
          .mb-1 { margin-bottom: 5px; }
          .mt-2 { margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="center bold mb-1" style="font-size:1.2rem;">CALICO'S PET CARE</div>
        <div class="center">Petshop & Klinik Hewan</div>
        <div class="divider"></div>
        <div class="flex-between"><span>No:</span><span>${tx.id.toUpperCase()}</span></div>
        <div class="flex-between"><span>Tgl:</span><span>${new Date(tx.date).toLocaleString('id-ID')}</span></div>
        <div class="flex-between"><span>Kasir:</span><span>${tx.cashierName || 'Admin'}</span></div>
        <div class="divider"></div>
    `;

    (tx.items || []).forEach(item => {
      content += `
        <div class="bold">${item.productName}</div>
        <div class="flex-between">
          <span>${item.qty} x ${formatRupiah(item.price)}</span>
          <span>${formatRupiah(item.qty * item.price)}</span>
        </div>
      `;
    });

    content += `<div class="divider"></div>`;
    content += `<div class="flex-between bold"><span>Total</span><span>${formatRupiah(tx.total)}</span></div>`;
    
    if (tx.additionalFeesDetails) {
      try {
        const fees = JSON.parse(tx.additionalFeesDetails);
        fees.forEach(fee => {
          if (!fee.name || !fee.amount) return;
          const label = fee.name.startsWith('Diskon') ? fee.name : `Biaya: ${fee.name}`;
          const amountNum = Number(fee.amount);
          content += `<div class="flex-between"><span>${label}</span><span>${amountNum < 0 ? '-' : ''}${formatRupiah(Math.abs(amountNum))}</span></div>`;
        });
      } catch (e) {}
    }

    content += `
        <div class="flex-between mt-2"><span>Bayar (${tx.paymentMethod})</span><span>${formatRupiah(tx.paid || tx.total)}</span></div>
        <div class="flex-between"><span>Kembali</span><span>${formatRupiah(tx.change || 0)}</span></div>
        <div class="divider mt-2"></div>
        <div class="center mt-2">Terima kasih atas kunjungan Anda!</div>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    printWin.document.write(content);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
      printWin.close();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50 overflow-hidden font-body animate-in fade-in slide-in-from-bottom-4 duration-200">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button onClick={onClose} className={`p-2 -ml-2 rounded-xl active:bg-slate-100 ${primaryText} transition-colors shrink-0`}>
            <span className="material-symbols-outlined !text-[24px]">arrow_back_ios_new</span>
          </button>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] md:text-sm font-normal text-slate-500 leading-none mb-1">ID Transaksi:</span> 
            <span className="font-bold text-slate-800 text-xs md:text-lg uppercase tracking-wide truncate">{selectedTx.id.toUpperCase()}</span>
          </div>
        </div>
        <button onClick={() => navigator.clipboard.writeText(selectedTx.id)} className="text-slate-400 p-2 hover:text-slate-600 active:scale-90 transition-transform shrink-0 ml-2 bg-slate-50 rounded-xl">
          <span className="material-symbols-outlined !text-[20px]">content_copy</span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <h2 className="font-extrabold text-slate-800 text-lg mb-4">Rincian Transaksi</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Dibuat Oleh</span>
              <span className="font-bold text-slate-800">{selectedTx.cashierName || 'Admin'}</span>
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

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <h2 className="font-extrabold text-slate-800 text-lg mb-4">Pesanan</h2>
          
          <div className="space-y-2 mb-4 mt-2">
            {(selectedTx.items || []).map((item, idx) => (
              <div 
                key={idx} 
                onClick={() => setSelectedItemDetail(item)}
                className="flex justify-between items-start text-sm border-b border-slate-50 pb-3 last:border-0 last:pb-0 cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition-colors rounded-xl p-2 -mx-2"
              >
                <div className="flex-1 pr-4 min-w-0">
                  <p className="font-semibold text-slate-800 leading-tight">{item.productName}</p>
                  <p className="text-xs text-slate-500 mt-1.5">{item.qty} x {formatRupiah(item.price)}</p>
                </div>
                <span className="font-extrabold text-slate-800 shrink-0">{formatRupiah(item.price * item.qty)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 pt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Pesanan</span>
              <span className="font-bold text-slate-800">{formatRupiah((selectedTx.items || []).reduce((s, i) => s + i.price * i.qty, 0))}</span>
            </div>
            {selectedTx.additionalFeesDetails && (() => {
              try {
                const fees = JSON.parse(selectedTx.additionalFeesDetails);
                return fees.map((fee, idx) => {
                  if (!fee.name || !fee.amount) return null;
                  const label = fee.name.startsWith('Diskon') ? fee.name : `Biaya: ${fee.name}`;
                  const amountNum = Number(fee.amount);
                  return (
                    <div key={idx} className="flex justify-between">
                      <span className="text-slate-500">{label}</span>
                      <span className={`font-bold ${amountNum < 0 ? 'text-red-500' : 'text-slate-800'}`}>
                        {amountNum < 0 ? '-' : ''}{formatRupiah(Math.abs(amountNum))}
                      </span>
                    </div>
                  );
                });
              } catch (e) {
                return null;
              }
            })()}
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

      <div className="bg-white border-t border-slate-200 p-4 pb-8 flex items-center gap-3 shrink-0">
        <button 
          onClick={() => handlePrintReceipt(selectedTx)}
          className={`flex-1 ${primaryBg} hover:opacity-90 active:scale-[0.98] transition-all text-white font-bold py-3.5 rounded-2xl shadow-md text-center`}
        >
          Cetak Struk
        </button>
        
        {isAdmin && onDelete && (
          <div className="relative group">
            <button 
              className={`p-3.5 border-2 ${primaryText} border-current hover:bg-slate-50 rounded-2xl flex items-center justify-center active:scale-[0.98] transition-all`}
              onClick={(e) => {
                const menu = e.currentTarget.nextElementSibling;
                menu.classList.toggle('hidden');
              }}
            >
              <span className="material-symbols-outlined !text-[20px]">more_vert</span>
            </button>
            <div className="hidden absolute bottom-full right-0 mb-2 w-32 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
              <button 
                onClick={() => onDelete(selectedTx.id)}
                className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedItemDetail && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedItemDetail(null)}>
          <div className="bg-white rounded-[32px] w-full max-w-xs overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedItemDetail(null)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors">
              <span className="material-symbols-outlined !text-[20px]">close</span>
            </button>
            <div className="p-6 flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-3xl ${primaryLight} flex items-center justify-center mb-4 ${primaryText} shadow-sm`}>
                <span className="material-symbols-outlined !text-[32px]">inventory_2</span>
              </div>
              <h4 className="font-extrabold text-slate-800 text-lg leading-tight mb-2">{selectedItemDetail.productName}</h4>
              <p className="text-slate-500 font-medium mb-6">Informasi Item</p>
              
              <div className="w-full bg-slate-50 rounded-2xl p-4 space-y-3 mb-2">
                <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium flex items-center gap-1">Kuantitas</span>
                  <span className="font-bold text-slate-800">{selectedItemDetail.qty} x</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium flex items-center gap-1">Harga Jual</span>
                  <span className="font-bold text-slate-800">{formatRupiah(selectedItemDetail.price)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium flex items-center gap-1">Harga Modal</span>
                  <span className="font-bold text-slate-800">{selectedItemDetail.buyPrice ? formatRupiah(selectedItemDetail.buyPrice) : '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
