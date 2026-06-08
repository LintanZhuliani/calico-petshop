import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { apiFetch } from '../lib/api';
import { formatRupiah, generateId } from '../utils/formatters';
import { getExpiryStatus, getExpiryColorClass } from '../utils/stockAlerts';

let Html5Qrcode = null;
let Html5QrcodeSupportedFormats = null;

export default function ScanPage() {
  const location = useLocation();
  const role = location.state?.role || 'kasir';
  const isAdmin = role === 'admin';

  const primary = isAdmin ? '#D35400' : '#C0392B';
  const primaryText = isAdmin ? 'text-[#D35400]' : 'text-[#C0392B]';
  const primaryBg = isAdmin ? 'bg-[#D35400]' : 'bg-[#C0392B]';
  const primaryLight = isAdmin ? 'bg-orange-50' : 'bg-red-50';

  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); // product found
  const [notFound, setNotFound] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [mode, setMode] = useState('check'); // 'check' | 'sell' | 'restock'
  const [qty, setQty] = useState(1);
  const [expiredDate, setExpiredDate] = useState('');
  const [toast, setToast] = useState('');
  const [products, setProducts] = useState([]);
  const [scannerReady, setScannerReady] = useState(false);
  const [libLoaded, setLibLoaded] = useState(false);

  const scannerRef = useRef(null);
  const scannerDivId = 'calico-qr-scanner';

  const branchId = location.state?.branchName || 'pusat';

  useEffect(() => {
    apiFetch(`/products?branchId=${branchId}`)
      .then(data => setProducts(data))
      .catch(err => console.error(err));
    // Dynamically import html5-qrcode
    import('html5-qrcode').then(mod => {
      Html5Qrcode = mod.Html5Qrcode || mod.default?.Html5Qrcode;
      Html5QrcodeSupportedFormats = mod.Html5QrcodeSupportedFormats || mod.default?.Html5QrcodeSupportedFormats;
      setLibLoaded(true);
    }).catch(() => setLibLoaded(false));
    return () => stopScanner();
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const findProduct = (code) => {
    const term = code.toLowerCase().trim();
    const p = products.find(p => p.barcode === term || p.id === term || p.name.toLowerCase().includes(term));
    if (p) {
      setScanResult(p);
      setNotFound(false);
    } else {
      setScanResult(null);
      setNotFound(true);
      setManualCode(code); // Simpan hasil scan untuk ditampilkan
    }
  };

  const startScanner = () => {
    if (!libLoaded || !Html5Qrcode) {
      showToast('Library scanner belum siap.');
      return;
    }
    setScanning(true);
    setScanResult(null);
    setNotFound(false);
    setTimeout(() => {
      try {
        const html5QrCode = new Html5Qrcode(scannerDivId);
        scannerRef.current = html5QrCode;
        html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 150 }, // Rectangular for 1D Barcodes
            formatsToSupport: Html5QrcodeSupportedFormats ? [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39
            ] : undefined,
          },
          (decodedText) => {
            stopScanner();
            findProduct(decodedText);
          },
          (errorMessage) => { /* ignore scan errors */ }
        ).then(() => {
          setScannerReady(true);
        }).catch(err => {
          showToast('Kamera tidak bisa diakses.');
          setScanning(false);
        });
      } catch (e) {
        showToast('Kamera tidak bisa diakses.');
        setScanning(false);
      }
    }, 300);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      try { 
        scannerRef.current.stop().then(() => {
          scannerRef.current.clear();
          scannerRef.current = null;
        }).catch(() => {
          scannerRef.current.clear();
          scannerRef.current = null;
        });
      } catch (e) { }
    }
    setScanning(false);
    setScannerReady(false);
  };

  const handleManualSearch = () => {
    if (!manualCode.trim()) return;
    findProduct(manualCode.trim());
  };

  // Kasir: Proses jual
  const handleSell = async () => {
    if (!scanResult || qty <= 0) return;
    const total = scanResult.totalStock || 0;
    if (qty > total) { showToast('Stok tidak cukup!'); return; }

    try {
      await apiFetch('/transactions', {
        method: 'POST',
        body: {
          items: [{ productId: scanResult.id, productName: scanResult.name, qty, price: scanResult.price }],
          paid: scanResult.price * qty,
          change: 0,
          paymentMethod: 'Tunai',
          branchId: branchId
        }
      });
      
      showToast(`${qty} unit ${scanResult.name} terjual (FEFO)`);
      setScanResult(null);
      setQty(1);
      
      // Refresh products to update stock
      apiFetch(`/products?branchId=${branchId}`).then(setProducts);
    } catch (err) {
      showToast('Gagal memproses transaksi: ' + err.message);
    }
  };

  // Admin: Tambah stok
  const handleRestock = async () => {
    if (!scanResult || qty <= 0) return;
    try {
      await apiFetch(`/products/${scanResult.id}/stock`, {
        method: 'POST',
        body: {
          branchId: branchId,
          qty: Number(qty),
          expiredDate: expiredDate || null
        }
      });
      showToast(`+${qty} unit ${scanResult.name} berhasil ditambahkan!`);
      setScanResult(null);
      setQty(1);
      setExpiredDate('');
      
      // Refresh products
      apiFetch(`/products?branchId=${branchId}`).then(setProducts);
    } catch (err) {
      showToast('Gagal menambah stok: ' + err.message);
    }
  };

  const totalStock = scanResult ? (scanResult.totalStock || 0) : 0;
  const expiryStatus = scanResult?.batches?.length > 0
    ? getExpiryStatus([...scanResult.batches].sort((a, b) => a.expiredDate && b.expiredDate ? new Date(a.expiredDate) - new Date(b.expiredDate) : 0)[0]?.expiredDate)
    : 'none';
  const expiryColors = getExpiryColorClass(expiryStatus);

  return (
    <div className="bg-[#F8F9FA] min-h-screen flex flex-col pb-20 font-body">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="bg-white sticky top-0 z-40 border-b border-slate-100 px-5 py-4 text-center">
        <h1 className={`font-headline font-extrabold text-xl ${primaryText}`}>Scan barang</h1>
        <p className="text-sm text-slate-400 mt-0.5">Scan garis barcode kemasan untuk memproses stok</p>
      </header>

      <main className="px-5 py-5 space-y-5 max-w-xl mx-auto w-full">
        {/* Mode Toggle (khusus admin dapat restock mode) */}
        {isAdmin && (
          <div className="bg-slate-100 p-1 rounded-2xl flex">
            {['check', 'restock'].map(m => (
              <button key={m} onClick={() => { setMode(m); setScanResult(null); setNotFound(false); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === m ? `bg-white ${primaryText} shadow-sm` : 'text-slate-400'}`}>
                {m === 'check' ? '🔍 Cek Stok' : '📦 Restock'}
              </button>
            ))}
          </div>
        )}

        {/* Scanner Area */}
        {!scanning && !scanResult && (
          <div
            onClick={startScanner}
            className={`relative flex flex-col items-center justify-center bg-white border-2 border-dashed ${isAdmin ? 'border-orange-200' : 'border-red-200'} rounded-3xl py-12 cursor-pointer active:scale-[0.98] transition-all`}
          >
            <div className={`w-20 h-20 ${primaryLight} rounded-3xl flex items-center justify-center mb-4`}>
              <span className={`material-symbols-outlined ${primaryText} !text-[40px]`} style={{ fontVariationSettings: "'FILL' 1" }}>qr_code_scanner</span>
            </div>
            <p className="font-bold text-slate-700">Tap untuk mulai scan</p>
            <p className="text-sm text-slate-400 mt-1 px-4 text-center">Arahkan kamera ke gambar Barcode pada kemasan</p>
          </div>
        )}

        {/* Manual Input Search */}
        {!scanning && !scanResult && (
          <div className="flex gap-2">
            <input 
              type="text" 
              value={manualCode} 
              onChange={e => setManualCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
              placeholder="Atau ketik nama/barcode produk..." 
              className="flex-1 px-4 py-3 bg-white border border-slate-200 focus:border-slate-400 rounded-2xl outline-none font-medium text-slate-700 placeholder:text-slate-400"
            />
            <button 
              onClick={handleManualSearch}
              className={`px-5 rounded-2xl ${primaryBg} text-white font-bold active:scale-95 transition-all`}
            >
              Cari
            </button>
          </div>
        )}

        {/* Scanner Live */}
        {scanning && (
          <div className="bg-white rounded-3xl overflow-hidden relative border border-slate-200 p-2 pt-10">
            <div id={scannerDivId} className="w-full min-h-[300px]" />
            <button
              onClick={stopScanner}
              className="absolute top-3 right-3 bg-black/60 text-white p-2 rounded-xl"
            >
              <span className="material-symbols-outlined !text-[20px]">close</span>
            </button>
          </div>
        )}



        {/* Not found */}
        {notFound && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
            <span className="material-symbols-outlined text-red-400 !text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>search_off</span>
            <p className="font-bold text-red-700 mt-2">Produk tidak ditemukan</p>
            <p className="text-sm text-red-500">Barcode: <span className="font-mono">{manualCode}</span></p>
            {isAdmin && (
              <button className="mt-3 text-sm font-bold text-[#D35400]">+ Daftarkan produk baru</button>
            )}
          </div>
        )}

        {/* Scan Result Card */}
        {scanResult && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Product Header */}
            <div className={`${primaryLight} px-5 py-4 flex items-center gap-3`}>
              <span className="text-4xl">{scanResult.imageEmoji}</span>
              <div className="flex-1">
                <p className="font-bold text-slate-900">{scanResult.name}</p>
                <p className="text-xs text-slate-500">{scanResult.category} · Barcode: {scanResult.barcode}</p>
              </div>
              <button onClick={() => { setScanResult(null); setNotFound(false); }}
                className="p-1.5 bg-white/60 rounded-xl">
                <span className="material-symbols-outlined text-slate-500 !text-[18px]">close</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 border-b border-slate-100">
              <div className="py-4 px-4 text-center border-r border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Harga</p>
                <p className={`font-extrabold text-base font-headline ${primaryText}`}>{formatRupiah(scanResult.price)}</p>
              </div>
              <div className="py-4 px-4 text-center border-r border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Stok</p>
                <p className={`font-extrabold text-base font-headline ${totalStock === 0 ? 'text-red-600' : totalStock <= scanResult.minStock ? 'text-amber-600' : 'text-green-600'}`}>
                  {totalStock} unit
                </p>
              </div>
              <div className="py-4 px-4 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Batch</p>
                <p className="font-extrabold text-base font-headline text-slate-800">{scanResult.batches.length}</p>
              </div>
            </div>

            {/* Batch Nearest Expiry */}
            {scanResult.batches.length > 0 && (() => {
              const nearest = [...scanResult.batches]
                .filter(b => b.expiredDate)
                .sort((a, b) => new Date(a.expiredDate) - new Date(b.expiredDate))[0];
              if (!nearest) return null;
              const status = getExpiryStatus(nearest.expiredDate);
              const colors = getExpiryColorClass(status);
              return (
                <div className={`mx-4 my-3 flex items-center justify-between ${colors.bg} ${colors.border} border rounded-xl px-3 py-2`}>
                  <p className="text-xs font-semibold text-slate-600">Exp. terdekat (FEFO)</p>
                  <span className={`text-xs font-bold ${colors.text}`}>{formatDate(nearest.expiredDate)}</span>
                </div>
              );
            })()}

            {/* Actions */}
            <div className="p-4 space-y-3">
              {/* Qty Input */}
              <div className="flex items-center gap-3">
                <p className="text-sm font-bold text-slate-700 flex-1">Jumlah:</p>
                <button onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 active:scale-95">-</button>
                <span className="w-10 text-center font-extrabold text-slate-900 text-lg font-headline">{qty}</span>
                <button onClick={() => setQty(q => q + 1)}
                  className={`w-9 h-9 rounded-xl ${primaryBg} flex items-center justify-center font-bold text-white active:scale-95`}>+</button>
              </div>

              {/* Admin: Restock — tambah expiry */}
              {isAdmin && mode === 'restock' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tgl Expired (opsional)</label>
                  <input type="date" value={expiredDate} onChange={e => setExpiredDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-orange-400 rounded-2xl text-sm outline-none" />
                </div>
              )}

              {/* Action Button */}
              {(!isAdmin || mode === 'sell') && (
                <button onClick={handleSell} disabled={totalStock === 0}
                  className="w-full py-3.5 bg-[#C0392B] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined !text-[20px]">point_of_sale</span>
                  {totalStock === 0 ? 'Stok Habis' : `Jual ${qty} unit — ${formatRupiah(scanResult.price * qty)}`}
                </button>
              )}
              {isAdmin && mode === 'restock' && (
                <button onClick={handleRestock}
                  className="w-full py-3.5 bg-[#D35400] text-white font-bold rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined !text-[20px]">add_box</span>
                  + Tambah {qty} unit ke stok
                </button>
              )}
              {isAdmin && mode === 'check' && (
                <button onClick={() => setMode('restock')}
                  className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl active:scale-95 transition-all text-sm">
                  📦 Switch ke mode Restock
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tips */}
        {!scanResult && !notFound && !scanning && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Tips Penggunaan</p>
            <div className="space-y-1.5">
              {[
                { icon: 'qr_code_scanner', text: 'Tap area kamera di atas untuk scan otomatis' },
                { icon: 'lightbulb', text: 'Pastikan cahaya cukup untuk hasil scan optimal' },
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-slate-600">
                  <span className={`material-symbols-outlined ${primaryText} !text-[18px]`}>{t.icon}</span>
                  <p className="text-xs">{t.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
