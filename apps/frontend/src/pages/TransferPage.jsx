import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { apiFetch } from '../lib/api';
import { socket } from '../lib/socket';
import { BRANCHES } from '../data/mockData';
import { formatRupiah, formatDateTime, generateId } from '../utils/formatters';

const STATUS_CONFIG = {
  transit: { label: 'Dalam Perjalanan', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', icon: 'local_shipping' },
  completed: { label: 'Selesai', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', icon: 'check_circle' },
  discrepancy: { label: 'Ada Selisih', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', icon: 'error' },
};

function getBranchName(id) {
  return BRANCHES.find(b => b.id === id)?.name || id;
}

export default function TransferPage() {
  const location = useLocation();
  const role = location.state?.role || 'kasir';
  const isAdmin = role === 'admin';
  const branchId = location.state?.branchName || 'pusat';
  const userName = location.state?.userName || (isAdmin ? 'Admin' : 'Kasir');

  const primaryText = isAdmin ? 'text-[#D35400]' : 'text-[#C0392B]';
  const primaryBg = isAdmin ? 'bg-[#D35400]' : 'bg-[#C0392B]';
  const primaryLight = isAdmin ? 'bg-orange-50' : 'bg-red-50';

  const [activeTab, setActiveTab] = useState(isAdmin ? 'new' : 'incoming');
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [toast, setToast] = useState('');

  // Form state (admin — buat mutasi baru)
  const [fromBranch, setFromBranch] = useState(isAdmin ? branchId : 'pusat');
  const [toBranch, setToBranch] = useState('');
  const [note, setNote] = useState('');
  const [transferItems, setTransferItems] = useState([]);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedQty, setSelectedQty] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Konfirmasi penerimaan
  const [confirmingId, setConfirmingId] = useState(null);
  const [receivedQtys, setReceivedQtys] = useState({});

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const fetchTransfers = async () => {
    try {
      const data = await apiFetch('/transfers');
      setTransfers(data || []);
    } catch (err) {
      console.error('Failed to fetch transfers:', err);
    }
  };

  const fetchProductsForBranch = async (branch) => {
    try {
      const data = await apiFetch(`/products?branchId=${branch}`);
      setProducts(data || []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  useEffect(() => {
    if (isAdmin && activeTab === 'new') {
      fetchProductsForBranch(fromBranch);
      setTransferItems([]); // Reset items if branch changes because stock is different
    }
  }, [fromBranch, isAdmin, activeTab]);

  useEffect(() => {
    // Real-time synchronization
    const onDataUpdated = () => {
      fetchTransfers();
      if (isAdmin && activeTab === 'new') {
        fetchProductsForBranch(fromBranch);
      }
    };
    
    socket.on('DATA_UPDATED', onDataUpdated);
    return () => socket.off('DATA_UPDATED', onDataUpdated);
  }, [isAdmin, activeTab, fromBranch]);

  // Admin: Kirim mutasi baru
  const handleSendTransfer = async () => {
    if (!fromBranch || !toBranch || fromBranch === toBranch || transferItems.length === 0) {
      showToast('Lengkapi data transfer terlebih dahulu!');
      return;
    }
    
    try {
      await apiFetch('/transfers', {
        method: 'POST',
        body: {
          fromBranchId: fromBranch,
          toBranchId: toBranch,
          note,
          items: transferItems.map(i => ({
            productId: i.productId,
            productName: i.productName,
            qty: i.qty,
          }))
        }
      });
      
      setTransferItems([]);
      setNote('');
      setToBranch('');
      setActiveTab('list');
      showToast('Transfer berhasil dikirim! Status: Dalam Perjalanan');
      fetchTransfers();
    } catch (err) {
      showToast('Gagal: ' + err.message);
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct) {
      showToast('Silakan cari dan klik/pilih produk dari daftar terlebih dahulu!');
      return;
    }
    if (!selectedQty || Number(selectedQty) <= 0) {
      showToast('Masukkan jumlah stok yang valid!');
      return;
    }
    const p = products.find(prod => prod.id === selectedProduct);
    if (!p) return;
    
    const qty = Number(selectedQty);
    if (qty > p.totalStock) {
      showToast(`Stok tidak cukup! Hanya tersedia ${p.totalStock} unit.`);
      return;
    }

    setTransferItems(prev => {
      const existing = prev.find(i => i.productId === selectedProduct);
      if (existing) {
        if (existing.qty + qty > p.totalStock) {
          showToast(`Stok tidak cukup! Hanya tersedia ${p.totalStock} unit.`);
          return prev;
        }
        return prev.map(i => i.productId === selectedProduct ? { ...i, qty: i.qty + qty } : i);
      }
      return [...prev, { productId: p.id, productName: p.name, qty: qty }];
    });
    setSelectedProduct('');
    setSelectedQty('');
    setProductSearch('');
    setAddItemOpen(false);
  };

  // Kasir: Konfirmasi terima
  const handleConfirmReceived = async (transfer) => {
    try {
      const receivedItems = transfer.items.map(item => ({
        productId: item.productId,
        qtyReceived: Number(receivedQtys[item.productId] ?? item.qtyRequested),
      }));

      await apiFetch(`/transfers/${transfer.id}/confirm`, {
        method: 'PATCH',
        body: { receivedItems }
      });

      setConfirmingId(null);
      setReceivedQtys({});
      showToast('Barang diterima! Stok Cabang diperbarui.');
      fetchTransfers();
    } catch (err) {
      showToast('Gagal: ' + err.message);
    }
  };

  // Filter list
  const incomingTransfers = transfers.filter(t => t.toBranchId === branchId && t.status === 'transit');

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const listTransfers = transfers.filter(t => {
    const d = new Date(t.createdAt);
    const isCurrentMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    if (!isCurrentMonth) return false;

    if (isAdmin) return true;
    return t.toBranchId === branchId || t.fromBranchId === branchId;
  });

  // Fungsi untuk download CSV riwayat transfer
  const handleDownloadCSV = () => {
    if (listTransfers.length === 0) return;

    const headers = ['ID Mutasi', 'Tanggal Dibuat', 'Status', 'Dari Cabang', 'Ke Cabang', 'Dibuat Oleh', 'Dikonfirmasi Oleh', 'Tanggal Dikonfirmasi', 'Catatan', 'Rincian Barang'];
    
    const rows = listTransfers.map(tr => {
      const itemsStr = tr.items.map(i => {
        const received = i.qtyReceived !== null ? i.qtyReceived : 0;
        return `${i.productName} (Kirim: ${i.qtyRequested}, Terima: ${received})`;
      }).join('; ');
      
      return [
        `TR-${tr.id.slice(-5).toUpperCase()}`,
        formatDateTime(tr.createdAt).replace(/,/g, ''), 
        tr.status,
        getBranchName(tr.fromBranchId),
        getBranchName(tr.toBranchId),
        tr.initiatedByName || '-',
        tr.confirmedByName || '-',
        tr.confirmedAt ? formatDateTime(tr.confirmedAt).replace(/,/g, '') : '-',
        `"${tr.note || '-'}"`,
        `"${itemsStr}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const branchNameForFile = isAdmin ? 'Semua_Cabang' : getBranchName(branchId).replace(/[^a-z0-9]/gi, '_');
    const monthName = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' }).replace(' ', '_');
    const filename = `Riwayat_Mutasi_${branchNameForFile}_${monthName}.csv`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const TABS = isAdmin
    ? [{ key: 'new', label: 'Transfer barang', icon: 'add_circle' }, { key: 'list', label: 'Semua', icon: 'list' }]
    : [{ key: 'incoming', label: `Masuk (${incomingTransfers.length})`, icon: 'move_to_inbox' }, { key: 'list', label: 'Riwayat', icon: 'history' }];

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
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl">
          {toast}
        </div>
      )}

      <header className="bg-white sticky top-0 z-40 border-b border-slate-100 px-5 pt-4 pb-0 flex flex-col gap-3">
        <div className="flex items-center gap-3">

          <h1 className={`font-headline font-extrabold text-xl ${primaryText}`}>Transfer Barang</h1>
        </div>
        {/* Tabs */}
        <div className="flex border-b border-slate-100 -mx-5 px-5 gap-1">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 pb-3 px-3 text-sm font-bold transition-all border-b-2 ${activeTab === tab.key ? `${primaryText} border-current` : 'text-slate-400 border-transparent'}`}>
              <span className="material-symbols-outlined !text-[18px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4 space-y-4 max-w-xl md:max-w-5xl mx-auto w-full">

        {/* ── ADMIN: Form Buat Mutasi ── */}
        {activeTab === 'new' && isAdmin && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
              <h2 className="font-headline font-bold text-slate-800">Detail Pengiriman</h2>

              {/* From Branch */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Dari Cabang (Sesi Saat Ini)</label>
                <div className="w-full px-4 py-3 bg-slate-100 border-2 border-transparent rounded-2xl text-slate-600 font-bold outline-none flex items-center justify-between cursor-not-allowed">
                  <span>{BRANCHES.find(b => b.id === branchId)?.name || 'Cabang Tidak Diketahui'}</span>
                  <span className="material-symbols-outlined text-slate-400 !text-[18px]">lock</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="material-symbols-outlined text-slate-300 !text-[24px]">arrow_downward</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* To Branch */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Ke Cabang</label>
                <select value={toBranch} onChange={e => setToBranch(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-orange-400 rounded-2xl text-slate-800 font-medium outline-none">
                  <option value="">-- Pilih cabang tujuan --</option>
                  {BRANCHES.filter(b => b.id !== fromBranch).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Catatan (Opsional)</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                  placeholder="Restock mingguan, dll..."
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-orange-400 rounded-2xl text-slate-800 font-medium outline-none resize-none" />
              </div>
            </div>

            {/* Item List */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="font-headline font-bold text-slate-800">Daftar Barang</h2>
                <button onClick={() => setAddItemOpen(true)}
                  className={`flex items-center gap-1 ${primaryBg} text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-all`}>
                  <span className="material-symbols-outlined !text-[16px]">add</span>Tambah
                </button>
              </div>

              {transferItems.length === 0 && (
                <div className="text-center py-6 text-slate-300">
                  <span className="material-symbols-outlined !text-[36px]">inventory_2</span>
                  <p className="text-sm mt-1">Belum ada barang ditambahkan</p>
                </div>
              )}

              {transferItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{item.productName}</p>
                    <p className="text-xs text-slate-400">{item.qty} unit</p>
                  </div>
                  <button onClick={() => setTransferItems(prev => prev.filter((_, idx) => idx !== i))}
                    className="p-1.5 bg-red-50 rounded-lg active:scale-95">
                    <span className="material-symbols-outlined text-red-400 !text-[18px]">delete</span>
                  </button>
                </div>
              ))}

              {/* Add Item Modal */}
              {addItemOpen && (
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pilih Produk</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Ketik nama produk untuk mencari..."
                        value={productSearch}
                        onFocus={() => setShowDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setShowDropdown(true);
                          setSelectedProduct('');
                        }}
                        className="w-full px-4 py-3 pl-10 bg-slate-50 border-2 border-transparent focus:border-orange-400 rounded-xl text-slate-800 text-sm outline-none"
                      />
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 !text-[18px]">search</span>
                      
                      {showDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-100 shadow-xl max-h-48 overflow-y-auto rounded-xl">
                          {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 ? (
                            <div className="p-3 text-sm text-slate-500 text-center">Produk tidak ditemukan</div>
                          ) : (
                            products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                              <div 
                                key={p.id}
                                onClick={() => {
                                  setSelectedProduct(p.id);
                                  setProductSearch(p.name);
                                  setShowDropdown(false);
                                }}
                                className="px-4 py-3 hover:bg-orange-50 cursor-pointer text-sm text-slate-700 flex justify-between items-center border-b border-slate-50 last:border-0"
                              >
                                <span className="font-semibold">{p.name}</span>
                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-bold">Stok: {p.totalStock || 0}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Jumlah</label>
                    <input type="number" value={selectedQty} onChange={e => setSelectedQty(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-orange-400 rounded-2xl text-slate-800 outline-none" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => { setAddItemOpen(false); setProductSearch(''); }} className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl active:scale-95">Batal</button>
                    <button onClick={handleAddItem} className={`flex-1 py-2.5 ${primaryBg} text-white font-bold rounded-xl active:scale-95`}>+ Tambah</button>
                  </div>
                </div>
              )}
            </div>

            <button onClick={handleSendTransfer}
              className={`w-full py-4 ${primaryBg} text-white font-bold rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2`}>
              <span className="material-symbols-outlined !text-[20px]">local_shipping</span>
              Kirim Sekarang
            </button>
          </div>
        )}

        {/* ── KASIR: Konfirmasi Penerimaan ── */}
        {activeTab === 'incoming' && !isAdmin && (
          <div className="space-y-3">
            {incomingTransfers.length === 0 && (
              <div className="flex flex-col items-center py-16 text-slate-300">
                <span className="material-symbols-outlined !text-[48px]">move_to_inbox</span>
                <p className="font-bold text-slate-400 mt-2">Tidak ada barang masuk</p>
                <p className="text-sm">Belum ada transfer yang menunggu konfirmasi</p>
              </div>
            )}
            {incomingTransfers.map(tr => (
              <div key={tr.id} className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
                <div className="bg-blue-50 px-4 py-3 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Transfer #{tr.id.slice(-5)}</p>
                    <p className="text-xs text-slate-500">Dari: {getBranchName(tr.fromBranchId)}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(tr.createdAt)}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-1 rounded-lg uppercase tracking-wide">Transit</span>
                </div>

                {/* Items */}
                <div className="p-4 space-y-2">
                  {tr.items.map(item => (
                    <div key={item.productId} className="flex items-center justify-between">
                      <p className="text-sm text-slate-700">{item.productName}</p>
                      {confirmingId === tr.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">Terima:</span>
                          <input
                            type="number"
                            value={receivedQtys[item.productId] ?? item.qtyRequested}
                            onChange={e => setReceivedQtys(prev => ({ ...prev, [item.productId]: e.target.value }))}
                            className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center text-sm font-bold outline-none"
                          />
                          <span className="text-xs text-slate-400">/ {item.qtyRequested}</span>
                        </div>
                      ) : (
                        <span className="font-bold text-sm text-slate-900">{item.qtyRequested} unit</span>
                      )}
                    </div>
                  ))}
                </div>

                {tr.note && (
                  <div className="border-t border-slate-50 px-4 py-2">
                    <p className="text-xs text-slate-400">{tr.note}</p>
                  </div>
                )}

                <div className="border-t border-slate-100 p-4 space-y-2">
                  {confirmingId !== tr.id ? (
                    <button onClick={() => setConfirmingId(tr.id)}
                      className="w-full py-3 bg-green-600 text-white font-bold rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined !text-[20px]">check_circle</span>
                      Konfirmasi Penerimaan
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 text-center">Masukkan qty yang benar-benar diterima. Jika ada selisih, sistem akan mencatat laporan.</p>
                      <div className="flex gap-2">
                        <button onClick={() => setConfirmingId(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl active:scale-95">Batal</button>
                        <button onClick={() => handleConfirmReceived(tr)}
                          className="flex-1 py-3 bg-green-600 text-white font-bold rounded-2xl active:scale-95 transition-all">
                          ✓ Simpan
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── List / Riwayat ── */}
        {activeTab === 'list' && (
          <div className="space-y-4">
            {/* Header Riwayat & Tombol Unduh */}
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-bold text-slate-800">Riwayat Bulan Ini</h2>
              {isAdmin && listTransfers.length > 0 && (
                <button
                  onClick={handleDownloadCSV}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl ${primaryLight} ${primaryText} text-[11px] font-bold active:scale-95 transition-all`}
                >
                  <span className="material-symbols-outlined !text-[16px]">download</span>
                  Unduh (CSV)
                </button>
              )}
            </div>

            {listTransfers.length === 0 && (
              <div className="flex flex-col items-center py-16 text-slate-300">
                <span className="material-symbols-outlined !text-[48px]">history</span>
                <p className="font-bold text-slate-400 mt-2">Belum ada riwayat mutasi bulan ini</p>
              </div>
            )}
            {listTransfers.map(tr => {
              const cfg = STATUS_CONFIG[tr.status] || STATUS_CONFIG.transit;
              return (
                <div key={tr.id} className={`bg-white rounded-2xl border ${cfg.border} shadow-sm flex flex-col overflow-hidden transition-all hover:shadow-md`}>
                  
                  {/* Header: ID, Waktu, Status */}
                  <div className="flex justify-between items-start px-5 py-4 border-b border-slate-50 bg-slate-50/50">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">Mutasi #{tr.id.slice(-5).toUpperCase()}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{formatDateTime(tr.createdAt)}</p>
                    </div>
                    <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg ${cfg.bg} ${cfg.color}`}>
                      <span className="material-symbols-outlined !text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>{cfg.icon}</span>
                      {cfg.label}
                    </div>
                  </div>

                  {/* Route Timeline */}
                  <div className="px-5 py-5 flex items-stretch gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border-2 border-white shadow-sm z-10">
                        <span className="material-symbols-outlined text-slate-500 !text-[16px]">storefront</span>
                      </div>
                      <div className="w-0.5 flex-1 bg-slate-200 my-1 rounded-full" />
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm z-10 ${tr.status === 'transit' ? 'bg-blue-100' : 'bg-green-100'}`}>
                        <span className={`material-symbols-outlined !text-[16px] ${tr.status === 'transit' ? 'text-blue-500' : 'text-green-600'}`}>
                          {tr.status === 'transit' ? 'local_shipping' : 'home_pin'}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dikirim Dari</p>
                        <p className="font-bold text-slate-800 text-sm">{getBranchName(tr.fromBranchId)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tujuan</p>
                        <p className="font-bold text-slate-800 text-sm">{getBranchName(tr.toBranchId)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="mx-5 border-t-2 border-dashed border-slate-100" />

                  {/* Items */}
                  <div className="px-5 py-4 space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rincian Barang</p>
                    <div className="space-y-2.5">
                      {tr.items.map(item => {
                        const isDiscrepancy = item.qtyReceived !== null && item.qtyReceived !== item.qtyRequested;
                        return (
                          <div key={item.productId} className="flex justify-between items-start text-sm">
                            <span className="text-slate-700 font-medium">{item.productName}</span>
                            <div className="text-right shrink-0 ml-4">
                              {item.qtyReceived !== null ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className={`font-bold text-sm ${isDiscrepancy ? 'text-red-600' : 'text-green-600'}`}>
                                    {item.qtyReceived}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-medium">/ {item.qtyRequested} unit</span>
                                </div>
                              ) : (
                                <span className="font-bold text-slate-800">{item.qtyRequested} unit</span>
                              )}
                              {isDiscrepancy && (
                                <p className="text-[10px] text-red-500 font-bold mt-0.5 bg-red-50 inline-block px-1.5 py-0.5 rounded">
                                  Selisih: {Math.abs(item.qtyRequested - item.qtyReceived)}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Catatan & Konfirmasi */}
                  {(tr.note || tr.confirmedAt || tr.status === 'transit') && (
                    <div className="bg-slate-50 px-5 py-3.5 text-xs space-y-2 border-t border-slate-100">
                      {tr.note && (
                        <div className="flex gap-2">
                          <span className="material-symbols-outlined text-slate-400 !text-[14px]">edit_document</span>
                          <p className="text-slate-600 italic">"{tr.note}"</p>
                        </div>
                      )}
                      {tr.confirmedAt && (
                        <div className="flex justify-between items-center text-slate-400 pt-1">
                          <p>Diterima oleh <span className="font-bold text-slate-600">{tr.confirmedByName}</span></p>
                          <p>{formatDateTime(tr.confirmedAt).split(',')[0]}</p>
                        </div>
                      )}
                      {tr.status === 'transit' && isAdmin && (
                        <div className="flex items-center justify-center gap-1.5 text-blue-500 pt-1">
                          <span className="material-symbols-outlined !text-[14px] animate-pulse">hourglass_empty</span>
                          <p className="font-semibold">Menunggu konfirmasi kasir tujuan</p>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
