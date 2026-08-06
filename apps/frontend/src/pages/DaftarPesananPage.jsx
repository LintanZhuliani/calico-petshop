import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { apiFetch } from '../lib/api';
import { useSession } from '../lib/useSession';
import { formatRupiah, formatDate } from '../utils/formatters';
import { socket } from '../lib/socket';

export default function DaftarPesananPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { branchName: branchId, role } = useSession();
  const isAdmin = role === 'admin';

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');

  // Tabs
  const [activeTab, setActiveTab] = useState('Semua'); // 'Semua', 'Pesanan Baru', 'Belum Dibayar', 'Sudah Dibayar'

  // Payment Modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paid, setPaid] = useState('');
  const [payMethod, setPayMethod] = useState('tunai');
  const [nonTunaiType, setNonTunaiType] = useState('qris');
  const [isProcessing, setIsProcessing] = useState(false);

  // Receipt Modal State
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  // Accordion state
  const [expandedOrders, setExpandedOrders] = useState(new Set());

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const primaryText = isAdmin ? 'text-[#D35400]' : 'text-[#C0392B]';
  const primaryBg = isAdmin ? 'bg-[#D35400]' : 'bg-[#C0392B]';
  const primaryLight = isAdmin ? 'bg-orange-50 text-[#D35400]' : 'bg-red-50 text-[#C0392B]';

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const fetchOrders = async () => {
    try {
      // Hanya ambil PENDING (semua hari) dan COMPLETED (hari ini saja) untuk mencegah loading lama
      const todayIso = new Date().toISOString().split('T')[0];
      const activeBranch = branchId || 'all';
      const pendingData = await apiFetch(`/transactions?branchId=${activeBranch}&status=PENDING`);
      const todayCompleted = await apiFetch(`/transactions?branchId=${activeBranch}&date=${todayIso}&status=COMPLETED`);
      
      const allData = [...pendingData, ...todayCompleted];
      
      // Sort newest first
      allData.sort((a, b) => new Date(b.date) - new Date(a.date));
      setOrders(allData);

      // Auto open receipt if navigated from checkout
      if (location.state?.autoOpenLatest && allData.length > 0) {
        setSelectedTx(allData[0]);
        setIsDetailOpen(true);
        // Clear state to prevent reopening
        navigate(location.pathname, { replace: true, state: {} });
      }
    } catch (err) {
      showToast('Gagal memuat pesanan');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!branchId) return;
    fetchOrders();

    socket.on('TRANSACTION_CREATED', fetchOrders);
    socket.on('DATA_UPDATED', fetchOrders);

    return () => {
      socket.off('TRANSACTION_CREATED', fetchOrders);
      socket.off('DATA_UPDATED', fetchOrders);
    };
  }, [branchId]);

  // Filter orders based on active tab
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Keep only PENDING and COMPLETED
      if (order.status === 'CANCELLED') return false;

      if (activeTab === 'Pesanan Baru') {
        // Pesanan Baru = SEMUA pesanan HARI INI (Apapun statusnya)
        const today = new Date().toDateString();
        const orderDate = new Date(order.date).toDateString();
        return today === orderDate;
      }
      if (activeTab === 'Piutang') {
        // Piutang = Semua pesanan Piutang
        return order.paymentMethod === 'Piutang';
      }
      if (activeTab === 'Belum Dibayar') {
        // Belum Dibayar = Semua pesanan PENDING (termasuk Piutang maupun bukan)
        return order.status === 'PENDING';
      }
      if (activeTab === 'Sudah Dibayar') {
        return order.status === 'COMPLETED';
      }
      return true; // 'Semua' shows all
    });
  }, [orders, activeTab]);

  const handleCancelOrder = async (id) => {
    if (!window.confirm('Yakin ingin membatalkan pesanan ini?')) return;
    try {
      await apiFetch(`/transactions/${id}/cancel`, { method: 'POST' });
      showToast('Pesanan berhasil dibatalkan');
      fetchOrders();
    } catch (err) {
      showToast('Gagal membatalkan pesanan: ' + err.message);
    }
  };

  const handleDeleteOrder = async (id) => {
    if (!window.confirm('PERINGATAN: Yakin ingin menghapus permanen pesanan ini?')) return;
    try {
      await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
      showToast('Pesanan berhasil dihapus permanen');
      fetchOrders();
    } catch (err) {
      showToast('Gagal menghapus pesanan: ' + err.message);
    }
  };

  const handleOpenPayModal = (order) => {
    setSelectedOrder(order);
    setPaid('');
    setPayMethod('tunai');
    setIsPayModalOpen(true);
  };

  const handlePayOrder = async () => {
    if (isProcessing || !selectedOrder) return;
    setIsProcessing(true);

    const total = selectedOrder.total;
    const paidAmt = payMethod === 'tunai' ? Number(paid) : total;
    const changeAmt = paidAmt - total;
    const finalMethod = payMethod === 'tunai' ? 'Tunai' : 
      (nonTunaiType === 'qris' ? 'QRIS' : nonTunaiType === 'transfer' ? 'Transfer Bank' : 'EDC / Debit');

    try {
      await apiFetch(`/transactions/${selectedOrder.id}/pay`, {
        method: 'PUT',
        body: {
          paid: paidAmt,
          change: changeAmt,
          paymentMethod: finalMethod,
        }
      });
      showToast('Pesanan berhasil dibayar');
      setIsPayModalOpen(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (err) {
      showToast('Gagal membayar pesanan: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Helper untuk Cetak Struk ──
  const handlePrintReceipt = (tx) => {
    const pad = (left, right) => {
      const space = 32 - left.length - right.length;
      return left + (space > 0 ? ' '.repeat(space) : ' ') + right;
    };
    const center = (text) => {
      if (text.length >= 32) return text;
      const padLeft = Math.floor((32 - text.length) / 2);
      return ' '.repeat(padLeft) + text;
    };

    let text = center("Calico's Pet Care") + '\n';
    text += center("Jl. Ps. Jengkol no 20, Babakan,") + '\n';
    text += center("Setu, Tangsel") + '\n';
    text += center("085702002027") + '\n';
    text += '-'.repeat(32) + '\n';
    
    text += pad("ID", tx.id) + '\n';
    const txDate = new Date(tx.date);
    const dateStr = `${String(txDate.getDate()).padStart(2, '0')}-${String(txDate.getMonth() + 1).padStart(2, '0')}-${txDate.getFullYear()} ${String(txDate.getHours()).padStart(2, '0')}:${String(txDate.getMinutes()).padStart(2, '0')}`;
    text += pad("Tanggal", dateStr) + '\n';
    text += pad("Kasir", tx.cashierName || 'Admin') + '\n';
    if (tx.customerName) text += pad("Pelanggan", tx.customerName) + '\n';
    text += '-'.repeat(32) + '\n';

    (tx.items || []).forEach(item => {
      const name = item.productName.length > 32 ? item.productName.substring(0, 32) : item.productName;
      text += name + '\n';
      const qtyPrice = `${item.qty} x ${item.price.toLocaleString('id-ID')}`;
      const subtotal = (item.qty * item.price).toLocaleString('id-ID');
      text += pad(qtyPrice, subtotal) + '\n';
    });

    if (tx.additionalFee > 0) {
      if (tx.additionalFeesDetails) {
        try {
          const fees = JSON.parse(tx.additionalFeesDetails);
          fees.forEach(fee => {
            if (fee.name && fee.amount) {
              text += pad(`Biaya: ${fee.name}`, Number(fee.amount).toLocaleString('id-ID')) + '\n';
            }
          });
        } catch (e) {
          text += pad('Biaya Tambahan', tx.additionalFee.toLocaleString('id-ID')) + '\n';
        }
      } else {
        text += pad('Biaya Tambahan', tx.additionalFee.toLocaleString('id-ID')) + '\n';
      }
    }

    text += '-'.repeat(32) + '\n';
    text += pad("TOTAL", tx.total.toLocaleString('id-ID')) + '\n';
    text += pad("BAYAR", (tx.paid || tx.total).toLocaleString('id-ID')) + '\n';
    text += pad("KEMBALI", (tx.change || 0).toLocaleString('id-ID')) + '\n';
    text += '-'.repeat(32) + '\n';
    text += center("Terima Kasih!") + '\n';

    if (window.AndroidBridge && window.AndroidBridge.printText) {
      window.AndroidBridge.printText(text);
    } else {
      console.log("=== SIMULASI STRUK ===\n" + text);
      alert("Cetak Struk:\n\n" + text);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-body pb-20 md:pb-0 transition-all duration-300 md:pl-64">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-5 py-3 rounded-2xl shadow-xl z-[200] font-bold text-sm flex items-center gap-2 animate-in slide-in-from-top-4">
          <span className="material-symbols-outlined text-green-400">check_circle</span>
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <header className="bg-white px-5 pt-8 pb-4 sticky top-0 z-30 shadow-sm border-b">
        <h1 className={`font-headline text-2xl font-black ${primaryText}`}>Daftar Pesanan</h1>
        
        {/* Tabs */}
        <div className="flex gap-4 mt-4 border-b pb-2 overflow-x-auto whitespace-nowrap hide-scrollbar">
          {['Semua', 'Pesanan Baru', 'Piutang', 'Belum Dibayar', 'Sudah Dibayar'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`font-bold pb-2 relative transition-colors ${activeTab === tab ? primaryText : 'text-slate-400'}`}
            >
              {tab}
              {activeTab === tab && (
                <div className={`absolute bottom-[-9px] left-0 right-0 h-[3px] rounded-t-full ${primaryBg}`}></div>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* List */}
      <main className="flex-1 p-5 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className={`w-8 h-8 border-4 border-slate-200 border-t-[${isAdmin ? '#D35400' : '#C0392B'}] rounded-full animate-spin`}></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <span className="material-symbols-outlined !text-6xl mb-4">list_alt</span>
            <p className="font-bold">Belum ada pesanan.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isPending = order.status === 'PENDING';
            const badgeText = isPending ? 'Pesanan Diproses' : 'Sudah Dibayar';
            const badgeBg = isPending ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';
            const isExpanded = expandedOrders.has(order.id);
            
            return (
              <div key={order.id} className="bg-white rounded-2xl border shadow-sm p-4 space-y-3 relative transition-all">
                {/* Top Row: Badge Status & Due Date */}
                <div className="flex justify-between items-start mb-2">
                  <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${badgeBg}`}>
                    {badgeText}
                  </div>
                  {order.dueDate && (
                    <div className="inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-600 border border-red-200">
                      Tenggat: {formatDate(order.dueDate).split(',')[0]}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-start" onClick={(e) => toggleExpand(order.id, e)}>
                  <div className="cursor-pointer">
                    <p className="font-bold text-slate-800 text-lg">{order.customerName || 'Pelanggan'}</p>
                    <div className="flex flex-col">
                      <p className={`text-xs font-bold mt-1 ${isPending ? primaryText : 'text-slate-500'}`}>
                        {order.id} {order.orderType === 'Delivery' && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">Delivery</span>}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatDate(order.date)}
                      </p>
                    </div>
                  </div>
                  <button className="p-2 rounded-xl bg-slate-50 text-slate-400 transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <span className="material-symbols-outlined">expand_more</span>
                  </button>
                </div>

                {/* Bagian Bawah: Akan disembunyikan jika tidak diperluas (collapse) */}
                {isExpanded && (
                  <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                    {/* Items preview */}
                    <div className="border-t border-b py-3 mt-1 flex items-center justify-between cursor-pointer" onClick={() => { setSelectedTx(order); setIsDetailOpen(true); }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl shrink-0 bg-slate-100 flex items-center justify-center text-slate-400">
                          <span className="material-symbols-outlined !text-[18px]">shopping_bag</span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-700 truncate max-w-[200px]">
                            {order.items && order.items.length > 0 ? order.items[0].productName : 'Item'} 
                            {order.items?.length > 1 && ` (+${order.items.length - 1} lainnya)`}
                          </p>
                          <p className="text-xs text-slate-500">{order.items?.[0]?.qty || 0} x {formatRupiah(order.items?.[0]?.price || 0)}</p>
                        </div>
                      </div>
                      <span className="font-bold text-slate-900">{formatRupiah(order.total)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-3 gap-3">
                      <div className="flex items-baseline gap-2 w-full justify-between sm:w-auto sm:justify-start">
                        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total</span>
                        <span className={`font-black text-lg ${primaryText}`}>{formatRupiah(order.total)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {/* Tombol Lihat Struk (Selalu Muncul) */}
                        <button 
                          onClick={() => { setSelectedTx(order); setIsDetailOpen(true); }}
                          className="flex-1 sm:flex-none justify-center px-4 py-2 border-2 border-slate-200 text-slate-600 font-bold rounded-xl text-xs bg-white hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-1 shadow-sm"
                        >
                          <span className="material-symbols-outlined !text-[16px]">receipt_long</span>
                          <span>Struk</span>
                        </button>

                        {isPending && (
                          <button 
                            onClick={() => handleOpenPayModal(order)}
                            className={`flex-1 sm:flex-none justify-center px-5 py-2 ${primaryBg} text-white font-bold rounded-xl text-xs active:scale-95 transition-all shadow-sm`}
                          >
                            Bayar
                          </button>
                        )}
                        {(isPending || isAdmin) && (
                          <div className="relative group ml-1 shrink-0">
                            <button className="p-2 border-2 border-slate-200 rounded-xl text-slate-500 shrink-0"
                              onClick={(e) => {
                                const menu = e.currentTarget.nextElementSibling;
                                menu.classList.toggle('hidden');
                              }}
                            >
                              <span className="material-symbols-outlined !text-[18px]">more_vert</span>
                            </button>
                            <div className="hidden absolute right-0 bottom-full mb-2 w-36 bg-white border shadow-xl rounded-xl overflow-hidden z-20">
                              {isPending && (
                                <button 
                                  onClick={() => handleCancelOrder(order.id)}
                                  className="w-full text-left px-4 py-3 text-red-600 font-bold text-sm hover:bg-red-50 flex items-center gap-2 border-b"
                                >
                                  <span className="material-symbols-outlined !text-[18px]">cancel</span> Batalkan
                                </button>
                              )}
                              {isAdmin && (
                                <button 
                                  onClick={() => handleDeleteOrder(order.id)}
                                  className="w-full text-left px-4 py-3 text-red-600 font-bold text-sm hover:bg-red-50 flex items-center gap-2"
                                >
                                  <span className="material-symbols-outlined !text-[18px]">delete</span> Hapus
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* ── Modal Pembayaran (Untuk Pesanan PENDING) ── */}
      {isPayModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={e => { if (e.target === e.currentTarget) setIsPayModalOpen(false); }}>
          <div className="bg-white w-full rounded-t-3xl p-6 pb-8 animate-in slide-in-from-bottom-8">
            <h2 className="font-bold text-xl mb-4 text-slate-900">Pembayaran Pesanan</h2>
            
            <div className="flex justify-between font-bold text-slate-900 border-b pb-3 mb-3">
              <span>Total Pesanan</span>
              <span className={primaryText + " text-xl"}>{formatRupiah(selectedOrder.total)}</span>
            </div>

            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Metode Pembayaran</p>
            <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 mb-4">
              {[
                { key: 'tunai', icon: 'payments', label: 'Tunai' },
                { key: 'nontunai', icon: 'credit_card', label: 'Non-Tunai' },
              ].map(m => (
                <button
                  key={m.key} onClick={() => setPayMethod(m.key)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1 ${payMethod === m.key ? `bg-white ${primaryText} shadow-sm` : 'text-slate-400'}`}
                >
                  <span className="material-symbols-outlined !text-[16px]">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>

            {payMethod === 'tunai' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Uang Dibayar</label>
                  <input
                    type="number" value={paid} onChange={e => setPaid(e.target.value)}
                    placeholder={String(selectedOrder.total)}
                    className="w-full border-2 p-3 rounded-xl font-bold"
                  />
                </div>
                {paid && (Number(paid) - selectedOrder.total) >= 0 && (
                  <div className="bg-green-50 p-4 rounded-xl text-center">
                    <p className="text-xs text-slate-500 font-bold uppercase">Kembalian</p>
                    <p className="text-2xl font-black text-green-600">{formatRupiah(Number(paid) - selectedOrder.total)}</p>
                  </div>
                )}
              </div>
            )}

            {payMethod === 'nontunai' && (
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { key: 'qris', label: 'QRIS', icon: 'qr_code_2' },
                  { key: 'transfer', label: 'Transfer', icon: 'account_balance' },
                  { key: 'edc', label: 'EDC', icon: 'credit_card' },
                ].map(opt => (
                  <button key={opt.key} onClick={() => setNonTunaiType(opt.key)} className={`flex flex-col items-center p-3 rounded-xl border ${nonTunaiType === opt.key ? 'border-red-400 bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'}`}>
                    <span className="material-symbols-outlined">{opt.icon}</span>
                    <span className="text-xs font-bold mt-1">{opt.label}</span>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={handlePayOrder}
              disabled={isProcessing || (payMethod === 'tunai' && (paid === '' || (Number(paid) - selectedOrder.total < 0)))}
              className={`w-full mt-6 py-4 ${primaryBg} text-white font-bold rounded-2xl disabled:opacity-50`}
            >
              Konfirmasi Pembayaran
            </button>
          </div>
        </div>
      )}

      {/* ── Modal Detail / Struk ── */}
      {isDetailOpen && selectedTx && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50 overflow-hidden font-body animate-in fade-in slide-in-from-bottom-4 duration-200">
          <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button onClick={() => setIsDetailOpen(false)} className={`p-2 -ml-2 rounded-xl active:bg-slate-100 ${primaryText} transition-colors shrink-0`}>
                <span className="material-symbols-outlined !text-[24px]">arrow_back_ios_new</span>
              </button>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] md:text-sm font-normal text-slate-500 leading-none mb-1">ID Transaksi:</span> 
                <span className="font-bold text-slate-800 text-xs md:text-lg uppercase tracking-wide truncate">{selectedTx.id.toUpperCase()}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigator.clipboard.writeText(selectedTx.id)} className="text-slate-400 p-2 hover:text-slate-600 active:scale-90 bg-slate-50 rounded-xl">
                <span className="material-symbols-outlined !text-[20px]">content_copy</span>
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="bg-white rounded-2xl border shadow-sm p-4">
              <h2 className="font-extrabold text-slate-800 text-lg mb-4">Rincian Transaksi</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Pelanggan</span>
                  <span className="font-bold">{selectedTx.customerName || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Status</span>
                  <span className={`font-bold ${selectedTx.status === 'PENDING' ? 'text-amber-600' : 'text-green-600'}`}>{selectedTx.status}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Pembayaran</span>
                  <span className="font-bold">{selectedTx.paymentMethod || 'Belum dibayar'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tanggal Transaksi</span>
                  <span className="font-bold">{formatDate(selectedTx.date)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-4">
              <h2 className="font-extrabold text-slate-800 text-lg mb-4">Pesanan</h2>
              <div className="space-y-2 mb-4">
                <h3 className="font-bold text-slate-800 leading-tight">
                  {selectedTx.customerName || 'Pelanggan'} 
                  {selectedTx.orderType === 'Delivery' && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">Delivery</span>}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatDate(selectedTx.date)}
                  {selectedTx.dueDate && (
                    <span className="ml-2 text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded">Tenggat: {formatDate(selectedTx.dueDate).split(' ')[0]}</span>
                  )}
                </p>
                {(selectedTx.items || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-sm border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-semibold text-slate-800">{item.productName}</p>
                      <p className="text-xs text-slate-500 mt-1">{item.qty} x {formatRupiah(item.price)}</p>
                    </div>
                    <span className="font-extrabold text-slate-800">{formatRupiah(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Produk</span>
                  <span className="font-bold text-slate-800">{formatRupiah((selectedTx.items || []).reduce((s,i)=>s+i.price*i.qty,0))}</span>
                </div>
                {selectedTx.additionalFee > 0 && (
                  (() => {
                    if (selectedTx.additionalFeesDetails) {
                      try {
                        const fees = JSON.parse(selectedTx.additionalFeesDetails);
                        return fees.map((fee, idx) => fee.name && fee.amount ? (
                          <div key={idx} className="flex justify-between">
                            <span className="text-slate-500">Biaya: {fee.name}</span>
                            <span className="font-bold text-slate-800">{formatRupiah(fee.amount)}</span>
                          </div>
                        ) : null);
                      } catch (e) {
                        return (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Biaya Tambahan</span>
                            <span className="font-bold text-slate-800">{formatRupiah(selectedTx.additionalFee)}</span>
                          </div>
                        );
                      }
                    }
                    return (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Biaya Tambahan</span>
                        <span className="font-bold text-slate-800">{formatRupiah(selectedTx.additionalFee)}</span>
                      </div>
                    );
                  })()
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-extrabold text-slate-900 text-base">Total</span>
                  <span className="font-extrabold text-[#C0392B] text-base">{formatRupiah(selectedTx.total)}</span>
                </div>
                {selectedTx.status === 'COMPLETED' && (
                  <>
                    <div className="flex justify-between text-slate-500 pt-1">
                      <span>Bayar</span>
                      <span className="font-bold">{formatRupiah(selectedTx.paid || selectedTx.total)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Kembali</span>
                      <span className="font-bold">{formatRupiah(selectedTx.change || 0)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border-t p-4 pb-8">
            <button onClick={() => handlePrintReceipt(selectedTx)} className={`w-full py-4 ${primaryBg} text-white font-bold rounded-2xl shadow-md`}>
              Cetak Struk
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
