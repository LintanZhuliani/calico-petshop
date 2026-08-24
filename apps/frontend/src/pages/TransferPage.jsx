import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { apiFetch } from '../lib/api';
import { useSession } from '../lib/useSession';
import { socket } from '../lib/socket';
import { BRANCHES } from '../data/mockData';
import { formatDateTime } from '../utils/formatters';

const STATUS_CONFIG = {
  pending: { label: 'Menunggu', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', icon: 'hourglass_empty' },
  approved: { label: 'Disetujui', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', icon: 'check_circle' },
  rejected: { label: 'Ditolak', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', icon: 'cancel' },
};

function getBranchName(id) {
  return BRANCHES.find(b => b.id === id)?.name || id;
}

export default function RequestPage() {
  const { role, branchName: branchId, userName, userId } = useSession();
  const isAdmin = role === 'admin';

  const primaryText = isAdmin ? 'text-[#D35400]' : 'text-[#C0392B]';
  const primaryBg = isAdmin ? 'bg-[#D35400]' : 'bg-[#C0392B]';
  const primaryLight = isAdmin ? 'bg-orange-50' : 'bg-red-50';

  const [activeTab, setActiveTab] = useState(isAdmin ? 'incoming' : 'new');
  const [historyPeriod, setHistoryPeriod] = useState('bulanan');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [pusatProducts, setPusatProducts] = useState([]);
  const [toast, setToast] = useState('');

  // Form state (Kasir — buat request)
  const [requestType, setRequestType] = useState('RESTOCK');
  const [requestItems, setRequestItems] = useState([]);
  const [addItemOpen, setAddItemOpen] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedProductName, setSelectedProductName] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [qty, setQty] = useState('');
  const [expiredDate, setExpiredDate] = useState('');
  const [note, setNote] = useState('');
  
  // Admin Approval state
  const [processingId, setProcessingId] = useState(null);
  const [sourceBranchId, setSourceBranchId] = useState('pusat');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const isPusatAdmin = isAdmin && branchId === 'pusat';

  const fetchRequests = async () => {
    try {
      const url = isPusatAdmin ? '/requests' : `/requests?branchId=${branchId}`;
      const data = await apiFetch(url);
      setRequests(data || []);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await apiFetch(`/products?branchId=${branchId}`);
      setProducts(data || []);
      
      if (branchId !== 'pusat') {
        const dataPusat = await apiFetch('/products?branchId=pusat');
        setPusatProducts(dataPusat || []);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  useEffect(() => {
    fetchRequests();
    if (!isPusatAdmin) fetchProducts();
  }, [isPusatAdmin, branchId]);

  useEffect(() => {
    const onDataUpdated = () => {
      fetchRequests();
      if (!isPusatAdmin) fetchProducts();
    };
    const onNewRequest = () => {
      if (isPusatAdmin) showToast('Ada request baru dari Kasir!');
      fetchRequests();
    };
    
    socket.on('DATA_UPDATED', onDataUpdated);
    socket.on('NEW_REQUEST', onNewRequest);
    return () => {
      socket.off('DATA_UPDATED', onDataUpdated);
      socket.off('NEW_REQUEST', onNewRequest);
    }
  }, [isPusatAdmin, branchId]);

  const handleAddItem = () => {
    if (!selectedProduct || !qty || Number(qty) < 0) {
      showToast('Silakan pilih produk dan masukkan jumlah yang valid.');
      return;
    }

    if (requestType === 'RESTOCK' && branchId !== 'pusat') {
      const p = pusatProducts.find(x => x.id === selectedProduct);
      const stockPusat = p ? (p.totalStock || 0) : 0;
      
      if (Number(qty) > stockPusat) {
        const msg = stockPusat === 0 
          ? `⚠️ Stok barang ini sedang KOSONG di Pusat.`
          : `⚠️ Stok di Pusat tidak mencukupi!\n(Hanya tersedia ${stockPusat} unit).`;
          
        if (!window.confirm(`${msg}\n\nApakah Anda yakin ingin tetap menambahkan produk ini ke request?`)) {
          return;
        }
      }
    }

    setRequestItems(prev => {
      const existing = prev.find(i => i.productId === selectedProduct);
      if (existing) {
        return prev.map(i => i.productId === selectedProduct ? { ...i, qty: Number(qty), expiredDate: expiredDate || i.expiredDate } : i);
      }
      return [...prev, { 
        productId: selectedProduct, 
        productName: selectedProductName, 
        qty: Number(qty),
        expiredDate: expiredDate || undefined
      }];
    });

    setSelectedProduct('');
    setSelectedProductName('');
    setProductSearch('');
    setQty('');
    setExpiredDate('');
    setAddItemOpen(false);
  };

  // Kasir: Kirim Request
  const handleSendRequest = async () => {
    if (requestItems.length === 0) {
      showToast('Tambahkan minimal 1 barang ke dalam request.');
      return;
    }
    
    try {
      await apiFetch('/requests', {
        method: 'POST',
        body: {
          requestType,
          items: requestItems,
          branchId,
          requestedById: userId || 'kasir123',
          requestedByName: userName || 'Kasir',
          note
        }
      });
      
      setRequestItems([]);
      setNote('');
      setActiveTab('list');
      showToast('Request berhasil dikirim dan menunggu persetujuan.');
      fetchRequests();
    } catch (err) {
      showToast('Gagal: ' + err.message);
    }
  };

  // Admin: Action Approve / Reject
  const handleAction = async (id, action) => {
    try {
      const body = { adminId: userId || 'admin123', adminName: userName || 'Admin' };
      if (action === 'approve') {
        const reqItem = requests.find(r => r.id === id);
        if (reqItem?.requestType === 'RESTOCK') {
           body.sourceBranchId = sourceBranchId;
        }
      }

      await apiFetch(`/requests/${id}/${action}`, {
        method: 'POST',
        body
      });

      setProcessingId(null);
      showToast(`Request berhasil di${action === 'approve' ? 'setujui' : 'tolak'}!`);
      fetchRequests();
    } catch (err) {
      showToast('Gagal: ' + err.message);
    }
  };

  const incomingRequests = requests.filter(r => r.status === 'pending');
  
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();

  const listRequests = requests.filter(r => {
    if (r.status === 'pending' && isPusatAdmin) return false;
    const d = new Date(r.createdAt);
    if (historyPeriod === 'bulanan') {
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }
    return d.getFullYear() === currentYear;
  });

  const handlePrevDate = () => {
    const newDate = new Date(selectedDate);
    if (historyPeriod === 'bulanan') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setFullYear(newDate.getFullYear() - 1);
    }
    setSelectedDate(newDate);
  };

  const handleNextDate = () => {
    const newDate = new Date(selectedDate);
    if (historyPeriod === 'bulanan') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setFullYear(newDate.getFullYear() + 1);
    }
    setSelectedDate(newDate);
  };
  
  const formatPeriodLabel = () => {
    if (historyPeriod === 'bulanan') {
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      return `${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
    }
    return `${selectedDate.getFullYear()}`;
  };

  const TABS = isPusatAdmin
    ? [{ key: 'incoming', label: `Masuk (${incomingRequests.length})`, icon: 'inbox' }, { key: 'list', label: 'Riwayat', icon: 'history' }]
    : isAdmin 
      ? [{ key: 'list', label: 'Riwayat', icon: 'history' }] // Admin in branch only sees Riwayat
      : [{ key: 'new', label: 'Buat Request', icon: 'add_circle' }, { key: 'list', label: 'Riwayat', icon: 'list' }];

  // Ensure active tab is valid when switching roles/branches
  useEffect(() => {
    if (isAdmin && !isPusatAdmin && activeTab !== 'list') {
      setActiveTab('list');
    }
  }, [isAdmin, isPusatAdmin, activeTab]);

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
    <div className={`bg-white min-h-screen flex flex-col pb-24 font-body transition-all duration-300 ${
      sidebarOpen ? 'md:pl-64' : 'md:pl-16'
    }`}>
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl">
          {toast}
        </div>
      )}

      {/* ── Header ── */}
      <header className="bg-white sticky top-0 z-40 border-b border-slate-200 px-5 pt-4 pb-3 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.dispatchEvent(new Event('mobile-drawer-toggle'))}
            className="md:hidden p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center"
          >
            <span className="material-symbols-outlined !text-[24px]">menu</span>
          </button>
          <h1 className={`font-headline font-extrabold text-xl text-center w-full ${primaryText}`}>Request Produk</h1>
        </div>
        {/* Tabs */}
        <div className="flex border-b border-slate-200 -mx-5 px-5">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 text-center flex items-center justify-center gap-1.5 pb-3 px-3 text-sm font-bold transition-all border-b-2 ${activeTab === tab.key ? `${primaryText} border-current` : 'text-slate-400 border-transparent'}`}>
              <span className="material-symbols-outlined !text-[18px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-5 py-6 space-y-4 w-full">

        {/* ── KASIR / ADMIN CABANG: Form Buat Request ── */}
        {activeTab === 'new' && !isPusatAdmin && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h2 className="font-headline font-bold text-slate-800 text-center uppercase">DETAIL REQUEST</h2>

              {/* Tipe Request */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Jenis Request</label>
                <select value={requestType} onChange={e => { setRequestType(e.target.value); setRequestItems([]); }}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-red-400 rounded-2xl text-slate-800 font-medium outline-none">
                  <option value="RESTOCK">Restock</option>
                  <option value="ADJUSTMENT">Penyesuaian Stok</option>
                </select>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Catatan (Opsional)</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                  placeholder={requestType === 'RESTOCK' ? "Butuh segera untuk weekend..." : "Stok rusak / salah hitung..."}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-red-400 rounded-2xl text-slate-800 font-medium outline-none resize-none" />
              </div>
            </div>

            {/* Item List */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="font-headline font-bold text-slate-800">Daftar Barang</h2>
                <button onClick={() => setAddItemOpen(true)}
                  className={`flex items-center gap-1 ${primaryBg} text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-all`}>
                  <span className="material-symbols-outlined !text-[16px]">add</span>Tambah
                </button>
              </div>

              {requestItems.length === 0 && (
                <div className="text-center py-6 text-slate-300">
                  <span className="material-symbols-outlined !text-[36px]">shopping_bag</span>
                  <p className="text-sm mt-1">Belum ada barang ditambahkan</p>
                </div>
              )}

              {requestItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{item.productName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                       <p className="text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100">{item.qty} unit</p>
                       {item.expiredDate && (
                         <p className="text-[10px] font-medium text-orange-500 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">Exp: {item.expiredDate}</p>
                       )}
                    </div>
                  </div>
                  <button onClick={() => setRequestItems(prev => prev.filter((_, idx) => idx !== i))}
                    className="p-1.5 bg-red-50 rounded-lg active:scale-95">
                    <span className="material-symbols-outlined text-red-400 !text-[18px]">delete</span>
                  </button>
                </div>
              ))}

              {/* Add Item Modal */}
              {addItemOpen && (
                <div className="border-t border-slate-200 pt-3 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pilih Produk</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Ketik nama produk..."
                        value={productSearch}
                        onFocus={() => setShowDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setShowDropdown(true);
                          setSelectedProduct('');
                          setSelectedProductName('');
                        }}
                        className="w-full px-4 py-3 pl-10 bg-slate-50 border-2 border-transparent focus:border-red-400 rounded-xl text-slate-800 text-sm outline-none"
                      />
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 !text-[18px]">search</span>
                      
                      {showDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 shadow-xl max-h-48 overflow-y-auto rounded-xl">
                          {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 ? (
                            <div className="p-3 text-sm text-slate-500 text-center">Produk tidak ditemukan</div>
                          ) : (
                            products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                              <div 
                                key={p.id}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setSelectedProduct(p.id);
                                  setSelectedProductName(p.name);
                                  setProductSearch(p.name);
                                  setShowDropdown(false);
                                }}
                                className="px-4 py-3 hover:bg-red-50 cursor-pointer text-sm text-slate-700 flex justify-between items-center border-b border-slate-50 last:border-0"
                              >
                                <span className="font-semibold">{p.name}</span>
                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-bold">Sistem: {p.totalStock || 0}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="space-y-1.5 flex-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {requestType === 'RESTOCK' ? 'Jml Diminta' : 'Stok Real'}
                      </label>
                      <input type="number" value={qty} onChange={e => setQty(e.target.value)}
                        placeholder="0" min="0"
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-red-400 rounded-2xl text-slate-800 outline-none font-bold" />
                    </div>
                    {requestType === 'ADJUSTMENT' && (
                      <div className="space-y-1.5 flex-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tgl Exp (Opsional)</label>
                        <input type="date" value={expiredDate} onChange={e => setExpiredDate(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-red-400 rounded-2xl text-slate-800 outline-none font-medium text-sm" />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={() => { setAddItemOpen(false); setProductSearch(''); }} className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl active:scale-95">Batal</button>
                    <button onClick={handleAddItem} className={`flex-1 py-2.5 ${primaryBg} text-white font-bold rounded-xl active:scale-95`}>+ Tambah</button>
                  </div>
                </div>
              )}
            </div>

            <button onClick={handleSendRequest}
              className={`w-full py-4 ${primaryBg} text-white font-bold rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md shadow-red-200`}>
              <span className="material-symbols-outlined !text-[20px]">send</span>
              Ajukan Request
            </button>
          </div>
        )}

        {/* ── ADMIN PUSAT: Request Masuk ── */}
        {activeTab === 'incoming' && isPusatAdmin && (
          <div className="space-y-3">
            {incomingRequests.length === 0 && (
              <div className="flex flex-col items-center py-16 text-slate-300">
                <span className="material-symbols-outlined !text-[48px]">inbox</span>
                <p className="font-bold text-slate-400 mt-2">Tidak ada request</p>
                <p className="text-sm">Semua cabang aman.</p>
              </div>
            )}
            {incomingRequests.map(req => (
              <div key={req.id} className="bg-white rounded-2xl border border-orange-200 shadow-sm overflow-hidden">
                <div className="bg-orange-50 px-4 py-3 flex justify-between items-start border-b border-orange-100">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{req.requestType === 'RESTOCK' ? 'Restock' : 'Penyesuaian'} #{req.id.slice(-5)}</p>
                    <p className="text-xs text-slate-500">Cabang: <span className="font-semibold text-slate-700">{req.branchName}</span> • Oleh: {req.requestedByName}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(req.createdAt)}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wide shadow-sm ${req.requestType === 'RESTOCK' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                    {req.requestType === 'RESTOCK' ? 'Restock' : 'Penyesuaian'}
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Daftar Barang</p>
                    <div className="space-y-2">
                      {req.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-sm font-semibold text-slate-700 block">{item.productName}</span>
                            {item.expiredDate && <span className="text-[10px] text-orange-500 font-medium">Exp: {item.expiredDate}</span>}
                          </div>
                          <span className="font-extrabold text-slate-800 bg-white px-2 py-1 rounded shadow-sm text-sm border border-slate-100">{item.qty} <span className="text-xs font-medium text-slate-500">unit</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {req.note && (
                    <div className="text-xs text-slate-600 italic bg-yellow-50 p-3 rounded-xl border border-yellow-100 flex gap-2">
                      <span className="material-symbols-outlined !text-[16px] text-yellow-600">info</span>
                      "{req.note}"
                    </div>
                  )}

                  {processingId === req.id ? (
                    <div className="bg-slate-100 p-3 rounded-xl space-y-3 mt-3 animate-fade-in border border-slate-200">
                      {req.requestType === 'RESTOCK' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Ambil Dari Cabang</label>
                          <select value={sourceBranchId} onChange={e => setSourceBranchId(e.target.value)}
                            className="w-full p-2 rounded-lg border-none text-sm font-medium outline-none text-slate-700 bg-white shadow-sm">
                            {BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                        </div>
                      )}
                      <p className="text-xs text-slate-500 text-center font-medium">Anda yakin ingin {req.requestType === 'RESTOCK' ? 'mengirim stok' : 'menimpa stok cabang ini'}?</p>
                      <div className="flex gap-2">
                        <button onClick={() => setProcessingId(null)} className="flex-1 py-2.5 bg-white text-slate-600 font-bold rounded-xl shadow-sm text-sm active:scale-95 transition-all">Batal</button>
                        <button onClick={() => handleAction(req.id, 'approve')}
                          className="flex-1 py-2.5 bg-green-600 text-white font-bold rounded-xl shadow-sm text-sm active:scale-95 transition-all">
                          Ya, Setujui
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 pt-2 border-t border-slate-100 mt-2">
                      <button onClick={() => handleAction(req.id, 'reject')}
                        className="flex-1 py-2.5 bg-red-50 text-red-600 font-bold rounded-xl text-sm active:scale-95 transition-all hover:bg-red-100">Tolak</button>
                      <button onClick={() => setProcessingId(req.id)}
                        className="flex-1 py-2.5 bg-green-600 text-white font-bold rounded-xl text-sm active:scale-95 transition-all shadow-md shadow-green-200 hover:bg-green-700">Setujui</button>
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
            
            {/* Tab Filter Bulanan / Tahunan */}
            <div className="flex w-full pt-2 border-b border-slate-200">
              <button 
                onClick={() => { setHistoryPeriod('bulanan'); setSelectedDate(new Date()); }}
                className={`flex-1 text-center py-2 text-sm font-bold rounded-t-xl border border-b-0 transition-all ${historyPeriod === 'bulanan' ? 'text-[#D35400] border-slate-200 bg-white relative z-10 translate-y-[1px]' : 'text-slate-500 border-transparent hover:bg-slate-50'}`}
              >
                Bulanan
              </button>
              <button 
                onClick={() => { setHistoryPeriod('tahunan'); setSelectedDate(new Date()); }}
                className={`flex-1 text-center py-2 text-sm font-bold rounded-t-xl border border-b-0 transition-all ${historyPeriod === 'tahunan' ? 'text-[#D35400] border-slate-200 bg-white relative z-10 translate-y-[1px]' : 'text-slate-500 border-transparent hover:bg-slate-50'}`}
              >
                Tahunan
              </button>
            </div>

            {/* Date Selector */}
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl py-3 px-4 shadow-sm mb-4">
              <button 
                onClick={handlePrevDate}
                className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-xl hover:bg-slate-100 active:scale-95 transition-all text-slate-600 font-bold border border-slate-100"
              >
                <span className="material-symbols-outlined !text-[16px]">chevron_left</span>
              </button>
              <div className="text-center">
                <p className="font-bold text-[#D35400] text-sm leading-tight">{formatPeriodLabel()}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{historyPeriod}</p>
              </div>
              <button 
                onClick={handleNextDate}
                className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-xl hover:bg-slate-100 active:scale-95 transition-all text-slate-600 font-bold border border-slate-100"
              >
                <span className="material-symbols-outlined !text-[16px]">chevron_right</span>
              </button>
            </div>

            {listRequests.length === 0 && (
              <div className="flex flex-col items-center py-16 text-slate-300">
                <span className="material-symbols-outlined !text-[48px]">history</span>
                <p className="font-bold text-slate-400 mt-2">Belum ada riwayat request</p>
              </div>
            )}
            {listRequests.map(req => {
              const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
              return (
                <div key={req.id} className={`bg-white rounded-2xl border ${cfg.border} shadow-sm flex flex-col overflow-hidden`}>
                  
                  <div className={`flex justify-between items-start px-4 py-3 border-b border-slate-50 ${cfg.bg}`}>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{req.requestType === 'RESTOCK' ? 'Restock' : 'Penyesuaian'} #{req.id.slice(-5)}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{formatDateTime(req.createdAt)}</p>
                    </div>
                    <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg bg-white shadow-sm ${cfg.color}`}>
                      <span className="material-symbols-outlined !text-[12px]">{cfg.icon}</span>
                      {cfg.label}
                    </div>
                  </div>

                  <div className="px-4 py-3 space-y-2">
                    <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                      <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">{req.requestType === 'RESTOCK' ? 'Restock' : 'Penyesuaian'}</span>
                      {isPusatAdmin && (
                        <span className="text-xs text-slate-500 font-medium">Cabang: <span className="font-bold text-slate-700">{req.branchName}</span></span>
                      )}
                    </div>
                    
                    <div className="space-y-1.5 pt-1">
                      {req.items.map((item, idx) => (
                         <div key={idx} className="flex justify-between items-center text-sm">
                           <span className="text-slate-700 font-medium">{item.productName}</span>
                           <span className="font-extrabold text-slate-800 text-xs">{item.qty} unit</span>
                         </div>
                      ))}
                    </div>
                    
                    <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-100 flex justify-between mt-2">
                       <span>Oleh: {req.requestedByName}</span>
                       {req.resolvedByName && <span className="font-semibold text-slate-500">Res: {req.resolvedByName}</span>}
                    </div>
                  </div>

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
