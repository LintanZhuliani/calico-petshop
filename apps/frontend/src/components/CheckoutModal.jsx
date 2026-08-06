import React, { useState } from 'react';
import InputField from './InputField';
import { formatRupiah } from '../utils/formatters';
import { apiFetch } from '../lib/api';

export default function CheckoutModal({ isAdmin, cart, onClose, onConfirm }) {
  const primaryText = isAdmin ? 'text-[#D35400]' : '${primaryText}';
  const primaryBg = isAdmin ? 'bg-[#D35400]' : '${primaryBg}';
  const primaryLightBg = isAdmin ? 'bg-orange-50' : '${primaryLightBg}';
  const primaryBorder = isAdmin ? 'border-[#D35400]' : 'border-[#C0392B]';
  const primaryBorderLight = isAdmin ? 'border-orange-300' : '${primaryBorderLight}';
  // Step 1: Metode & Biaya Tambahan, Step 2: Form Pelanggan atau Pembayaran
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // === STEP 1 STATES ===
  const [orderMethod, setOrderMethod] = useState('bayar_langsung'); // 'bayar_langsung', 'piutang', 'buat_pesanan', 'gabungkan_pesanan'
  const [hasAdditionalFee, setHasAdditionalFee] = useState(false);
  const [additionalFees, setAdditionalFees] = useState([]);
  const [showFeeOptions, setShowFeeOptions] = useState(false);
  const [feeTargetIndex, setFeeTargetIndex] = useState(null);

  // === STEP 2 (BUAT PESANAN) STATES ===
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isDelivery, setIsDelivery] = useState(false); // Jenis Pesanan (Kirim = true)
  const [pickupDate, setPickupDate] = useState(false); // Jadwal Ambil
  const [dueDate, setDueDate] = useState(''); // Tenggat Waktu Piutang

  // === CUSTOMER MODAL STATES ===
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '' });

  React.useEffect(() => {
    if (showCustomerModal) {
      fetchCustomers();
    }
  }, [showCustomerModal, customerSearch]);

  const fetchCustomers = async () => {
    try {
      const qs = customerSearch ? `?search=${encodeURIComponent(customerSearch)}` : '';
      const data = await apiFetch(`/customers${qs}`);
      setCustomers(data);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const handleCreateCustomer = async () => {
    try {
      const newCust = await apiFetch('/customers', {
        method: 'POST',
        body: JSON.stringify(newCustomerData)
      });
      setCustomerId(newCust.id);
      setCustomerName(newCust.name);
      setCustomerPhone(newCust.phone || '');
      setIsAddingCustomer(false);
      setShowCustomerModal(false);
    } catch (err) {
      console.error('Failed to create customer:', err);
    }
  };

  // === STEP 2 (BAYAR LANGSUNG) STATES ===
  const [payMethod, setPayMethod] = useState('tunai'); // 'tunai', 'nontunai', 'campuran'
  const [paid, setPaid] = useState('');
  const [nonTunaiType, setNonTunaiType] = useState('qris');
  // Campuran
  const [splitNonTunai, setSplitNonTunai] = useState('');
  const [splitCash, setSplitCash] = useState('');
  const [splitNonTunaiType, setSplitNonTunaiType] = useState('qris');

  const parseAmount = (str) => Number(String(str).replace(/\./g, '').replace(/,/g, ''));
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const feeTotal = hasAdditionalFee ? additionalFees.reduce((sum, fee) => sum + parseAmount(fee.amount), 0) : 0;
  const total = cartTotal + feeTotal;

  // Bayar Langsung Logic
  const change = parseAmount(paid) - total;
  const QUICK_PAYS = [
    total,
    Math.ceil(total / 10000) * 10000 + 10000,
    Math.ceil(total / 50000) * 50000,
    Math.ceil(total / 100000) * 100000,
  ];

  const NON_TUNAI_OPTS = [
    { key: 'qris', label: 'QRIS', icon: 'qr_code_2' },
    { key: 'transfer', label: 'Transfer', icon: 'account_balance' },
    { key: 'edc', label: 'EDC', icon: 'credit_card' },
  ];

  const splitNonTunaiAmt = parseAmount(splitNonTunai);
  const splitCashAmt = parseAmount(splitCash);
  const sisaCash = total - splitNonTunaiAmt;
  const splitChange = splitCashAmt - sisaCash;

  const handleNext = () => {
    if (orderMethod === 'buat_pesanan' || orderMethod === 'piutang') {
      setStep(2); // Go to form pelanggan
    } else if (orderMethod === 'bayar_langsung') {
      setStep(3); // Go to pembayaran
    }
  };

  const handleSubmit = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const validAdditionalFees = hasAdditionalFee ? additionalFees.filter(f => f.name && f.amount) : [];
      const baseData = {
        additionalFee: feeTotal,
        additionalFeesDetails: validAdditionalFees.length > 0 ? JSON.stringify(validAdditionalFees) : null,
      };

      if (orderMethod === 'buat_pesanan' || orderMethod === 'piutang') {
        await onConfirm({
          ...baseData,
          status: 'PENDING',
          customerId: customerId || undefined,
          customerName,
          customerPhone,
          orderType: isDelivery ? 'Delivery' : 'Pickup',
          pickupDate: pickupDate ? new Date() : null, // Simplify for now
          dueDate: orderMethod === 'piutang' && dueDate ? new Date(dueDate) : null,
          paid: 0,
          change: 0,
          paymentMethod: orderMethod === 'piutang' ? 'Piutang' : 'Belum Dibayar',
        });
      } else if (orderMethod === 'bayar_langsung') {
        if (payMethod === 'tunai') {
          await onConfirm({ ...baseData, status: 'COMPLETED', paid: parseAmount(paid), change, paymentMethod: 'Tunai' });
        } else if (payMethod === 'nontunai') {
          const labels = { qris: 'QRIS', transfer: 'Transfer Bank', edc: 'EDC / Debit' };
          await onConfirm({ ...baseData, status: 'COMPLETED', paid: total, change: 0, paymentMethod: labels[nonTunaiType] });
        } else {
          const ntLabel = { qris: 'QRIS', transfer: 'Transfer', edc: 'EDC' }[splitNonTunaiType];
          const methodLabel = `Campuran (${ntLabel} ${formatRupiah(splitNonTunaiAmt)} + Tunai ${formatRupiah(splitCashAmt)})`;
          await onConfirm({ ...baseData, status: 'COMPLETED', paid: splitNonTunaiAmt + splitCashAmt, change: Math.max(0, splitChange), paymentMethod: methodLabel });
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStep1 = () => (
    <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-4">
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Metode Pemesanan</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'bayar_langsung', label: 'Bayar Langsung', desc: 'Langsung bayar' },
            { key: 'piutang', label: 'Piutang', desc: 'Berhutang' },
            { key: 'buat_pesanan', label: 'Buat Pesanan', desc: 'Bayar belakangan' },
            { key: 'gabungkan_pesanan', label: 'Gabungkan Pesanan', desc: 'Gabung dgn pesanan lain' },
          ].map(m => (
            <button
              key={m.key}
              onClick={() => setOrderMethod(m.key)}
              className={`p-3 rounded-2xl border text-left flex flex-col justify-center gap-1 transition-all ${orderMethod === m.key ? `border-[${isAdmin ? '#D35400' : '#C0392B'}] ${primaryLightBg} ${primaryText}` : 'border-slate-200 bg-slate-50 text-slate-500'}`}
            >
              <span className="font-bold text-sm">{m.label}</span>
              <span className="text-[10px] leading-tight">{m.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 py-2 border-b">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm">Biaya Tambahan</span>
          <button
            onClick={() => { 
              const next = !hasAdditionalFee;
              setHasAdditionalFee(next); 
              if (next && additionalFees.length === 0) setAdditionalFees([{ name: '', amount: '' }]);
              if (!next) setAdditionalFees([]);
            }}
            className={`w-10 h-6 rounded-full relative transition-all ${hasAdditionalFee ? '${primaryBg}' : 'bg-slate-200'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hasAdditionalFee ? 'right-1' : 'left-1'}`}></span>
          </button>
        </div>
        {hasAdditionalFee && (
          <div className="bg-slate-50 p-3 rounded-xl space-y-3">
            {additionalFees.map((fee, idx) => (
              <div key={idx} className="space-y-2 bg-white p-3 rounded-lg border relative">
                {additionalFees.length > 1 && (
                  <button onClick={() => setAdditionalFees(prev => prev.filter((_, i) => i !== idx))} className="absolute right-2 top-2 text-slate-400 hover:${primaryText}">
                    <span className="material-symbols-outlined !text-[18px]">close</span>
                  </button>
                )}
                <button onClick={() => { setFeeTargetIndex(idx); setShowFeeOptions(true); }} className="w-full py-2 border-2 border-dashed ${primaryBorderLight} ${primaryText} font-bold rounded-xl text-sm hover:${primaryLightBg}">
                  {fee.name ? `Biaya: ${fee.name}` : 'Pilih Jenis Biaya...'}
                </button>
                {fee.name && (
                  <InputField label="Nominal Biaya" type="number" value={fee.amount} onChange={(val) => {
                    setAdditionalFees(prev => {
                      const next = [...prev];
                      next[idx].amount = val;
                      return next;
                    });
                  }} placeholder="Rp 0" />
                )}
              </div>
            ))}
            <button onClick={() => setAdditionalFees(prev => [...prev, { name: '', amount: '' }])} className="w-full py-2 font-bold ${primaryText} text-sm hover:${primaryLightBg} rounded-xl">
              + Tambah Biaya Lainnya
            </button>
          </div>
        )}
      </div>

      {showFeeOptions && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4">
            <h3 className="font-bold text-lg text-center">Pilih Biaya Tambahan</h3>
            <div className="space-y-2">
              {['Pajak', 'Ongkos Kirim', 'Kemasan', 'Lainnya (Ketik Sendiri)...'].map(opt => (
                <button
                  key={opt}
                  onClick={() => { 
                    let name = opt;
                    if (opt.startsWith('Lainnya')) {
                      name = prompt('Masukkan nama biaya tambahan:') || '';
                    }
                    if (name) {
                      setAdditionalFees(prev => {
                        const next = [...prev];
                        next[feeTargetIndex].name = name;
                        return next;
                      });
                    }
                    setShowFeeOptions(false); 
                  }}
                  className="w-full text-left py-3 px-4 rounded-xl font-bold bg-slate-50 hover:bg-slate-100 border"
                >
                  {opt}
                </button>
              ))}
            </div>
            <button onClick={() => setShowFeeOptions(false)} className="w-full py-3 bg-slate-200 font-bold rounded-xl text-slate-600">Batal</button>
          </div>
        </div>
      )}

      <div className="pt-4 space-y-2">
        <div className="flex justify-between font-bold text-lg text-slate-900">
          <span>Total Pesanan</span>
          <span className="${primaryText}">{formatRupiah(total)}</span>
        </div>
        <button
          onClick={handleNext}
          className={`w-full py-4 ${primaryBg} text-white font-bold rounded-2xl text-base`}
        >
          {orderMethod === 'buat_pesanan' ? 'Lanjut (Buat Pesanan)' : orderMethod === 'piutang' ? 'Lanjut (Detail Piutang)' : 'Lanjut Pembayaran'}
        </button>
      </div>
    </div>
  );

  const renderStep2BuatPesanan = () => (
    <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-6">
      <div className="flex flex-col items-center py-4">
        <span className="material-symbols-outlined !text-6xl ${primaryText} mb-2">
          {orderMethod === 'piutang' ? 'receipt_long' : 'person_add'}
        </span>
        <h3 className="font-bold text-xl">
          {orderMethod === 'piutang' ? 'Detail Piutang' : 'Buat Pesanan'}
        </h3>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col">
          <label className="text-sm font-bold text-slate-700 mb-1">Nama Pelanggan (Wajib)</label>
          <div 
            onClick={() => setShowCustomerModal(true)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-left cursor-pointer flex justify-between items-center"
          >
            <span className={customerName ? "text-slate-900 font-bold" : "text-slate-400"}>
              {customerName || "Pilih atau cari pelanggan..."}
            </span>
            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          </div>
        </div>
        
        <InputField label="Nomor Telepon (Opsional)" type="text" value={customerPhone} onChange={setCustomerPhone} placeholder="Otomatis terisi jika ada" disabled />
        
        {orderMethod === 'piutang' && (
          <InputField label="Tanggal Tenggat Waktu (Opsional)" type="date" value={dueDate} onChange={setDueDate} />
        )}
      </div>

      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm">Jenis Pesanan (Delivery)</span>
          <button onClick={() => setIsDelivery(!isDelivery)} className={`w-10 h-6 rounded-full relative transition-all ${isDelivery ? primaryBg : 'bg-slate-200'}`}>
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isDelivery ? 'right-1' : 'left-1'}`}></span>
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm">Jadwal Ambil</span>
          <button onClick={() => setPickupDate(!pickupDate)} className={`w-10 h-6 rounded-full relative transition-all ${pickupDate ? primaryBg : 'bg-slate-200'}`}>
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${pickupDate ? 'right-1' : 'left-1'}`}></span>
          </button>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button onClick={() => setStep(1)} className="flex-1 py-4 bg-slate-100 font-bold rounded-2xl text-slate-600 border">Kembali</button>
        <button onClick={handleSubmit} disabled={!customerName.trim()} className={`flex-1 py-4 ${primaryBg} text-white font-bold rounded-2xl disabled:opacity-50`}>OK</button>
      </div>
    </div>
  );

  const renderStep3Pembayaran = () => (
    <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-4">
      {/* Salinan UI Bayar Langsung dari KasirPage.jsx */}
      <div className="flex justify-between font-bold text-slate-900 border-b pb-3 mb-3">
        <span>Total Pesanan</span>
        <span className="${primaryText} text-xl">{formatRupiah(total)}</span>
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Metode Pembayaran</p>
        <div className="bg-slate-100 p-1 rounded-2xl flex gap-1">
          {[
            { key: 'tunai', icon: 'payments', label: 'Tunai' },
            { key: 'nontunai', icon: 'credit_card', label: 'Non-Tunai' },
            { key: 'campuran', icon: 'join', label: 'Campuran' },
          ].map(m => (
            <button
              key={m.key}
              onClick={() => setPayMethod(m.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1
                ${payMethod === m.key ? 'bg-white ${primaryText} shadow-sm' : 'text-slate-400'}`}
            >
              <span className="material-symbols-outlined !text-[16px]">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {payMethod === 'tunai' && (
        <div className="space-y-3">
          <InputField label="Uang Dibayar" type="number" value={paid} onChange={setPaid} placeholder={String(total)} />
          <div className="flex gap-2 flex-wrap">
            {[...new Set(QUICK_PAYS)].map(p => (
              <button key={p} onClick={() => setPaid(String(p))} className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700">{formatRupiah(p)}</button>
            ))}
          </div>
          {paid && (
            <div className={`rounded-2xl p-4 text-center ${change >= 0 ? 'bg-green-50' : '${primaryLightBg}'}`}>
              <p className="text-xs font-bold text-slate-500 uppercase">{change >= 0 ? 'Kembalian' : 'Kurang'}</p>
              <p className={`text-2xl font-extrabold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatRupiah(Math.abs(change))}</p>
            </div>
          )}
        </div>
      )}

      {payMethod === 'nontunai' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2.5">
            {NON_TUNAI_OPTS.map(opt => (
              <button key={opt.key} onClick={() => setNonTunaiType(opt.key)} className={`flex flex-col items-center p-3 rounded-xl border ${nonTunaiType === opt.key ? 'border-red-400 ${primaryLightBg} text-red-600' : 'bg-slate-50 text-slate-500'}`}>
                <span className="material-symbols-outlined">{opt.icon}</span>
                <span className="text-xs font-bold mt-1">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t mt-4">
        <button onClick={() => setStep(1)} className="flex-1 py-4 bg-slate-100 font-bold rounded-2xl text-slate-600 border">Kembali</button>
        <button 
          onClick={handleSubmit} 
          disabled={payMethod === 'tunai' && (paid === '' || change < 0)}
          className={`flex-1 py-4 ${primaryBg} text-white font-bold rounded-2xl disabled:opacity-50`}
        >
          Bayar
        </button>
      </div>
    </div>
  );

  const renderCustomerModal = () => {
    // Group customers by initial
    const grouped = customers.reduce((acc, cust) => {
      const initial = (cust.name || '#').charAt(0).toUpperCase();
      const groupKey = /[A-Z]/.test(initial) ? initial : '#';
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(cust);
      return acc;
    }, {});

    const sortedGroups = Object.keys(grouped).sort();

    return (
      <div className="fixed inset-0 z-[60] bg-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowCustomerModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h2 className="text-xl font-bold">Pilih Pelanggan</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsAddingCustomer(true)} className={`px-3 py-1.5 ${primaryBg} text-white font-bold rounded-lg text-sm flex items-center gap-1`}>
              + Pelanggan
            </button>
            <button onClick={fetchCustomers} className="p-1.5 border rounded-lg text-slate-500">
              <span className="material-symbols-outlined !text-xl">sync</span>
            </button>
          </div>
        </div>

        {isAddingCustomer ? (
          <div className="p-6 space-y-4 flex-1">
            <h3 className="font-bold text-lg mb-2">Pelanggan Baru</h3>
            <InputField label="Nama Pelanggan" type="text" value={newCustomerData.name} onChange={(v) => setNewCustomerData({...newCustomerData, name: v})} placeholder="Masukkan nama" />
            <InputField label="Nomor Telepon" type="text" value={newCustomerData.phone} onChange={(v) => setNewCustomerData({...newCustomerData, phone: v})} placeholder="Masukkan nomor (opsional)" />
            
            <div className="flex gap-4 pt-4">
              <button onClick={() => setIsAddingCustomer(false)} className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl">Batal</button>
              <button onClick={handleCreateCustomer} disabled={!newCustomerData.name} className={`flex-1 py-3 ${primaryBg} text-white font-bold rounded-xl disabled:opacity-50`}>Simpan</button>
            </div>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-3 text-slate-400">search</span>
                <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400"
                  placeholder="Cari Nama/Nomor..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {sortedGroups.length === 0 ? (
                <p className="text-center text-slate-400 mt-10">Tidak ada pelanggan ditemukan</p>
              ) : (
                sortedGroups.map(group => (
                  <div key={group}>
                    <h4 className={`font-bold text-lg mb-2 ${primaryText}`}>{group}</h4>
                    <div className="space-y-1 border-b pb-4">
                      {grouped[group].map(cust => (
                        <div 
                          key={cust.id} 
                          onClick={() => {
                            setCustomerId(cust.id);
                            setCustomerName(cust.name);
                            setCustomerPhone(cust.phone || '');
                            setShowCustomerModal(false);
                          }}
                          className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer"
                        >
                          <div>
                            <p className="font-bold text-slate-800">{cust.name}</p>
                            {cust.phone && <p className="text-xs text-slate-500">{cust.phone}</p>}
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${customerId === cust.id ? primaryBorder : 'border-slate-300'}`}>
                            {customerId === cust.id && <div className={`w-2.5 h-2.5 rounded-full ${primaryBg}`}></div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      {showCustomerModal && renderCustomerModal()}
      <div className="bg-white w-full rounded-t-3xl flex flex-col" style={{ maxHeight: '92dvh' }}>
        <div className="flex justify-between items-center px-6 pt-6 pb-4 shrink-0">
          <h2 className="font-headline font-bold text-xl text-slate-900">
            {step === 1 ? 'Checkout' : step === 2 ? 'Detail Pelanggan' : 'Konfirmasi Pembayaran'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-100 active:scale-95">
            <span className="material-symbols-outlined text-slate-500">close</span>
          </button>
        </div>
        
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2BuatPesanan()}
        {step === 3 && renderStep3Pembayaran()}
      </div>
    </div>
  );
}
