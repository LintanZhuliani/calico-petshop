import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { BRANCHES } from '../data/mockData';
import { formatRupiah, formatDateTime } from '../utils/formatters';
import { authClient } from '../lib/auth-client';

export default function ProfilePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const role = location.state?.role || 'kasir';
  const isAdmin = role === 'admin';
  const branchId = location.state?.branchName || 'pusat';
  const userName = location.state?.userName || (isAdmin ? 'Admin' : 'Kasir');

  const primaryText = isAdmin ? 'text-orange-600' : 'text-red-600';
  const primaryBg = isAdmin ? 'bg-orange-600' : 'bg-red-600';
  const primaryLight = isAdmin ? 'bg-orange-50' : 'bg-red-50';
  const primaryLightText = isAdmin ? 'text-orange-700' : 'text-red-700';

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [notifState, setNotifState] = useState(() => {
    const saved = localStorage.getItem('calico_notif_prefs');
    return saved ? JSON.parse(saved) : { stok: true, expired: true, shift: true };
  });

  useEffect(() => {
    localStorage.setItem('calico_notif_prefs', JSON.stringify(notifState));
  }, [notifState]);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [dbEmployees, setDbEmployees] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("");

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await authClient.getSession();
      if (data?.user) {
        setCurrentEmail(data.user.email);
      }
    };
    fetchSession();
  }, []);

  useEffect(() => {
    if (activeModal === 'users') {
      const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
          // Temporarily use fetch directly if apiFetch is not imported, but let's import it
          const { apiFetch } = await import('../lib/api.js');
          const users = await apiFetch('/users');
          setDbEmployees(users);
        } catch (err) {
          console.error("Failed to fetch users:", err);
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchUsers();
    }
  }, [activeModal]);

  const branchName = BRANCHES.find(b => b.id === branchId)?.name || branchId;

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus karyawan ini secara permanen?")) return;
    try {
      const { apiFetch } = await import('../lib/api.js');
      await apiFetch(`/users/${userId}`, { method: 'DELETE' });
      setDbEmployees(prev => prev.filter(emp => emp.id !== userId));
    } catch (err) {
      alert("Gagal menghapus karyawan: " + err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userAccount');
    navigate('/login', { replace: true });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess("");
    
    try {
      const { data, error } = await authClient.changePassword({
        newPassword: newPass,
        currentPassword: oldPass,
        revokeOtherSessions: true // optional: logs out other devices
      });

      if (error) {
        setPassError(error.message || "Gagal mengubah password. Pastikan sandi lama benar!");
        return;
      }

      setPassSuccess("Password berhasil diubah!");
      setTimeout(() => {
        setActiveModal(null);
        setOldPass(""); setNewPass(""); setPassSuccess(""); setPassError("");
      }, 1500);
    } catch (err) {
      setPassError("Terjadi kesalahan sistem. Coba lagi.");
    }
  };

  // We removed mock data. To get accurate counts, it requires a separate API call.
  // For now, we'll keep the menu simple and direct to the Penjualan page.
  const [todayTxCount, setTodayTxCount] = useState(0);
  const [migrating, setMigrating] = useState(false);

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const { apiFetch } = await import('../lib/api.js');
      const local = localStorage.getItem('calico_products');
      if(!local) {
        alert("Tidak ada data produk di HP/Browser ini!");
        return;
      }
      const products = JSON.parse(local);
      let count = 0;
      for(const p of products) {
        if(p.id?.startsWith('p00')) continue; // skip default dummy
        
        // Create product
        const newP = await apiFetch('/products', {
          method: 'POST',
          body: {
            name: p.name,
            category: p.category || "Tanpa Kategori",
            buyPrice: p.buyPrice || 0,
            price: p.price || 0,
            barcode: p.barcode || "",
            image: p.image || null,
            imageEmoji: p.imageEmoji || null,
            minStock: p.minStock || 5
          }
        });
        
        // Add stock
        if (p.totalStock > 0 && newP && newP.id) {
           await apiFetch(`/products/${newP.id}/stock`, {
             method: 'POST',
             body: { branchId, qty: p.totalStock, expiredDate: null }
           });
        }
        count++;
      }
      alert(`Berhasil migrasi ${count} produk ke Server!`);
      localStorage.removeItem('calico_products'); // clear it
      setActiveModal(null);
    } catch(err) {
      alert("Error: " + err.message);
    } finally {
      setMigrating(false);
    }
  };

  useEffect(() => {
    // Fetch today's transactions count silently
    const fetchTx = async () => {
      try {
        const { apiFetch } = await import('../lib/api.js');
        const txs = await apiFetch(`/transactions?branchId=${branchId}`);
        const today = new Date().toDateString();
        setTodayTxCount(txs.filter(t => new Date(t.date).toDateString() === today).length);
      } catch (e) {}
    };
    fetchTx();
  }, [branchId]);

  const MENU_ITEMS = [
    ...(isAdmin ? [
      { id: 'users', icon: 'manage_accounts', label: 'Kelola Karyawan', desc: 'Tambah, edit, atau nonaktifkan akun', color: primaryText },
      { id: 'branches', icon: 'store', label: 'Kelola Cabang', desc: 'Data & konfigurasi semua cabang', color: primaryText },
      { id: 'migrate', icon: 'cloud_upload', label: 'Migrasi 300 Produk Lokal', desc: 'Pindah data dari HP ke Server', color: 'text-purple-600' },
    ] : []),
    { id: 'laporan', icon: 'receipt_long', label: 'Riwayat Transaksi', desc: `${todayTxCount} transaksi hari ini`, color: primaryText },
    { id: 'password', icon: 'lock', label: 'Ganti Password', desc: 'Perbarui keamanan akun', color: primaryText },
    { id: 'notif', icon: 'notifications', label: 'Preferensi Notifikasi', desc: 'Atur alert stok & expired', color: primaryText },
    { id: 'help', icon: 'help', label: 'Bantuan & Panduan', desc: 'Cara pakai aplikasi', color: primaryText },
  ];

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
      {/* Logout Dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-red-500 !text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>logout</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-slate-900 text-lg">Keluar?</h3>
              <p className="text-sm text-slate-500 mt-1">
                Kamu akan keluar dari akun <strong>{userName}</strong>. 
                {isAdmin 
                  ? ' Pastikan semua perubahan data dan laporan sudah tersimpan.' 
                  : ' Pastikan semua transaksi sudah tersimpan.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutDialog(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl active:scale-95">Batal</button>
              <button onClick={handleLogout} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-2xl active:scale-95">Keluar</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-5 pb-4 pt-4 sticky top-0 z-40 flex items-center gap-3">

        <h1 className={`font-headline font-extrabold text-xl ${primaryText}`}>Profil</h1>
      </header>

      <main className="px-5 py-5 space-y-5 max-w-xl md:max-w-5xl mx-auto w-full">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Hero */}
          <div className={`${primaryBg} px-5 py-6 flex items-center gap-4`}>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-white !text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {isAdmin ? 'admin_panel_settings' : 'support_agent'}
              </span>
            </div>
            <div className="text-white">
              <p className="font-headline font-extrabold text-xl leading-tight">{userName}</p>
              <p className="text-white/80 text-sm mt-0.5">{isAdmin ? 'Administrator' : 'Kasir'}</p>
            </div>
          </div>

          {/* Branch & Role Info */}
          <div className="px-5 py-4 space-y-3">
            <InfoRow icon="store" label="Cabang Aktif" value={branchName} />
            <InfoRow icon="badge" label="Role" value={isAdmin ? 'Admin' : 'Kasir'} />
            <InfoRow icon="email" label="Akun" value={currentEmail || '-'} />
          </div>
        </div>

        {/* Menu Items */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm divide-y divide-slate-50">
          {MENU_ITEMS.map((item, i) => {
            // "Riwayat Transaksi" diarahkan ke halaman Laporan
            const isLaporan = item.label === 'Riwayat Transaksi';
            const inner = (
              <>
                <span className={`material-symbols-outlined !text-[24px] ${item.color}`}
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  {item.icon}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 text-sm">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
                <span className="material-symbols-outlined text-slate-300 !text-[20px]">chevron_right</span>
              </>
            );
            if (isLaporan) {
              return (
                <Link
                  key={i}
                  to="/penjualan"
                  state={location.state}
                  className="w-full flex items-center gap-3.5 px-5 py-4 text-left active:bg-slate-50 transition-colors"
                >
                  {inner}
                </Link>
              );
            }
            return (
              <button key={i} onClick={() => setActiveModal(item.id)} className="w-full flex items-center gap-3.5 px-5 py-4 text-left active:bg-slate-50 transition-colors">
                {inner}
              </button>
            );
          })}
        </div>

        {/* Dynamic Modals */}
        {activeModal && activeModal !== 'logout' && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-6 transition-opacity">
            <div className="bg-white w-full max-w-md sm:rounded-3xl rounded-t-3xl p-6 pb-24 shadow-2xl animate-in slide-in-from-bottom-8 max-h-[90vh] overflow-y-auto flex flex-col">
              <div className="flex justify-between items-center mb-5 shrink-0">
                <h3 className="font-headline font-bold text-slate-900 text-lg">
                  {MENU_ITEMS.find(m => m.id === activeModal)?.label || 'Modal'}
                </h3>
                <button onClick={() => {setActiveModal(null); setPassError(""); setPassSuccess(""); setShowAddForm(false);}} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full">
                  <span className="material-symbols-outlined !text-[20px]">close</span>
                </button>
              </div>

              {activeModal === 'password' && (
                <form onSubmit={handlePasswordSubmit} className="space-y-4 pr-1">
                  {passError && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-100">{passError}</p>}
                  {passSuccess && <p className="text-green-600 text-sm bg-green-50 p-3 rounded-xl border border-green-100">{passSuccess}</p>}
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">Sandi Lama</label>
                    <div className="relative mt-1">
                      <input type={showOldPass ? "text" : "password"} required value={oldPass} onChange={e => {setOldPass(e.target.value); setPassError("")}} className={`w-full bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-xl p-3.5 pr-12 outline-none text-slate-800 font-medium tracking-widest`} />
                      <button type="button" onClick={() => setShowOldPass(!showOldPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1">
                        <span className="material-symbols-outlined !text-[20px]">{showOldPass ? "visibility_off" : "visibility"}</span>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">Sandi Baru</label>
                    <div className="relative mt-1">
                      <input type={showNewPass ? "text" : "password"} required minLength={8} value={newPass} onChange={e => {setNewPass(e.target.value); setPassError("")}} className={`w-full bg-slate-50 border-2 border-transparent focus:border-[#D35400] rounded-xl p-3.5 pr-12 outline-none text-slate-800 font-medium tracking-widest`} />
                      <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1">
                        <span className="material-symbols-outlined !text-[20px]">{showNewPass ? "visibility_off" : "visibility"}</span>
                      </button>
                    </div>
                  </div>
                  <button type="submit" className={`w-full py-4 mt-2 ${primaryBg} text-white font-bold rounded-2xl shadow-md active:scale-95 transition-all text-sm tracking-wide flex items-center justify-center gap-2`}>
                    <span className="material-symbols-outlined !text-[18px]">key</span>
                    Simpan Sandi Baru
                  </button>
                </form>
              )}

              {activeModal === 'migrate' && (
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-purple-600 !text-[32px]">cloud_upload</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg">Migrasi Produk</h3>
                  <p className="text-sm text-slate-500">
                    Sistem akan memindahkan semua produk yang pernah kamu ketik manual di HP/Browser ini (dari database lokal lama) ke Server Neon yang baru.
                  </p>
                  <button 
                    onClick={handleMigrate}
                    disabled={migrating}
                    className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-bold rounded-2xl active:scale-95 transition-all mt-4"
                  >
                    {migrating ? 'Sedang Memindahkan Data...' : 'Mulai Migrasi Sekarang'}
                  </button>
                </div>
              )}

              {activeModal === 'users' && (
                <div className="space-y-3">
                  {(() => {
                    return loadingUsers ? (
                      <div className="flex justify-center py-6">
                        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : dbEmployees.filter(emp => emp.role !== 'admin').length === 0 ? (
                      <p className="text-center text-sm text-slate-400 py-6">Belum ada kasir terdaftar</p>
                    ) : (
                      dbEmployees.filter(emp => emp.role !== 'admin').map((emp, i) => (
                        <div key={emp.id || i} className={`p-4 rounded-2xl flex items-center gap-4 border ${emp.email === currentEmail ? `${primaryLight} border-orange-200` : 'bg-slate-50 border-slate-100'}`}>
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${emp.role === 'admin' ? 'bg-orange-100' : 'bg-red-100'}`}>
                            <span className={`material-symbols-outlined ${emp.role === 'admin' ? 'text-orange-600' : 'text-red-600'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                              {emp.role === 'admin' ? 'admin_panel_settings' : 'support_agent'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 truncate">{emp.name}</p>
                            <p className="text-[11px] text-slate-400 truncate">{emp.email}</p>
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-2">
                            <div className="flex flex-col items-end">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide ${emp.role === 'admin' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                {emp.role === 'admin' ? 'Admin' : 'Kasir'}
                              </span>
                              {emp.email === currentEmail && <p className="text-[9px] text-slate-400 mt-1">Anda</p>}
                            </div>
                            {emp.email !== currentEmail && (
                              <button 
                                onClick={() => handleDeleteUser(emp.id)}
                                className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors ml-1"
                                title="Hapus Karyawan"
                              >
                                <span className="material-symbols-outlined !text-[18px]">delete</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    );
                  })()}
                  
                  {!showAddForm ? (
                    <button onClick={() => setShowAddForm(true)} className={`w-full py-4 border-2 border-dashed border-slate-200 ${primaryText} font-bold rounded-2xl hover:bg-slate-50 active:scale-95 transition-all`}>
                      + Tambah Karyawan Baru
                    </button>
                  ) : (
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          const { apiFetch } = await import('../lib/api.js');
                          const response = await apiFetch('/users/invite', {
                            method: 'POST',
                            body: { email: newEmpEmail, branchId: branchId }
                          });
                          alert(`Berhasil! Karyawan telah didaftarkan dengan email: ${newEmpEmail}\n\nPassword bawaan: ${response.generatedPassword}\nHarap arahkan karyawan untuk segera login dan mengganti password.`);
                          setShowAddForm(false);
                          setNewEmpEmail("");
                          // Trigger re-fetch (hacky way: toggle modal)
                          setActiveModal(null);
                          setTimeout(() => setActiveModal('users'), 50);
                        } catch (err) {
                          alert(`Gagal menambahkan karyawan: ${err.message}`);
                        }
                      }} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-2 space-y-3 animate-in slide-in-from-top-2">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">Kirim Undangan Pendaftaran</p>
                      
                      <input 
                        type="email" required 
                        placeholder="Masukkan Email Karyawan" 
                        value={newEmpEmail}
                        onChange={(e) => setNewEmpEmail(e.target.value)}
                        className="w-full bg-white border-2 border-transparent focus:border-slate-300 rounded-xl p-3 outline-none text-slate-800 font-medium text-sm" 
                      />
                      
                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 py-3 text-slate-500 font-bold active:scale-95 text-sm">Batal</button>
                        <button type="submit" className={`flex-1 py-3 ${primaryBg} text-white font-bold rounded-xl active:scale-95 text-sm`}>Kirim Tautan</button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {activeModal === 'branches' && (
                <div className="space-y-3">
                  {BRANCHES.map(b => (
                    <div key={b.id} className="bg-slate-50 p-4 rounded-2xl flex items-center gap-4 border border-slate-100">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${b.id === branchId ? primaryBg : 'bg-slate-200'}`}>
                        <span className={`material-symbols-outlined text-white`}>store</span>
                      </div>
                      <div className="flex-1"><p className="font-bold text-slate-800">{b.name}</p><p className="text-xs text-slate-500">Kode Cabang: {b.id.toUpperCase()}</p></div>
                      {b.id === branchId && <span className={`text-[10px] font-bold ${primaryLight} ${primaryLightText} px-3 py-1.5 rounded-lg uppercase tracking-wide`}>Aktif</span>}
                    </div>
                  ))}
                </div>
              )}

              {activeModal === 'notif' && (
                <div className="space-y-3 pr-1">
                  <p className="text-xs text-slate-400 mb-1">Pengaturan ini akan tersimpan otomatis di perangkatmu.</p>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 shrink-0">
                    <div>
                      <p className="font-bold text-slate-800">Peringatan Stok Tipis</p>
                      <p className="text-xs text-slate-500 mt-0.5">Notifikasi saat stok di bawah batas minimum</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                      <input type="checkbox" checked={notifState.stok} onChange={() => setNotifState(s => ({...s, stok: !s.stok}))} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-checked:bg-orange-500 rounded-full transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 shrink-0">
                    <div>
                      <p className="font-bold text-slate-800">Barang Hampir Kedaluwarsa</p>
                      <p className="text-xs text-slate-500 mt-0.5">Notifikasi 30 hari sebelum produk rusak</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                      <input type="checkbox" checked={notifState.expired} onChange={() => setNotifState(s => ({...s, expired: !s.expired}))} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-checked:bg-orange-500 rounded-full transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 shrink-0">
                    <div>
                      <p className="font-bold text-slate-800">Rekap Shift Harian</p>
                      <p className="text-xs text-slate-500 mt-0.5">Pengingat untuk merekap transaksi shift</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                      <input type="checkbox" checked={notifState.shift} onChange={() => setNotifState(s => ({...s, shift: !s.shift}))} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-checked:bg-orange-500 rounded-full transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>
                </div>
              )}

              {activeModal === 'help' && (
                <div className="space-y-4 text-sm text-slate-600 leading-relaxed pb-6">
                  <p>Selamat datang di pusat bantuan <strong>Calico's Pet Care</strong>. Berikut panduan lengkap sesuai peran Anda:</p>
                  
                  {isAdmin ? (
                    <>
                      <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                        <p className="font-bold text-orange-800 mb-2 flex items-center gap-2"><span className="material-symbols-outlined !text-[16px]">admin_panel_settings</span>Panduan Admin</p>
                        <ul className="list-disc pl-5 space-y-1.5 text-orange-700 text-xs">
                          <li><strong>Dasbor:</strong> Pantau ringkasan pendapatan, stok kritis, dan peringatan barang kedaluwarsa dari seluruh cabang.</li>
                          <li><strong>Produk:</strong> Tambah, edit, atau hapus produk. Atur harga jual, barcode, dan gambar produk.</li>
                          <li><strong>Penjualan:</strong> Lihat grafik penjualan harian, perbandingan antar cabang, dan unduh laporan ke Excel (.csv).</li>
                          <li><strong>Transfer:</strong> Kirim stok barang dari pusat ke cabang. Pantau status pengiriman (di jalan / selesai / ada selisih).</li>
                          <li><strong>Profil:</strong> Kelola karyawan, atur preferensi notifikasi, dan ganti password keamanan.</li>
                        </ul>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                        <p className="font-bold text-red-800 mb-2 flex items-center gap-2"><span className="material-symbols-outlined !text-[16px]">support_agent</span>Panduan Kasir</p>
                        <ul className="list-disc pl-5 space-y-1.5 text-red-700 text-xs">
                          <li><strong>Dasbor:</strong> Lihat ringkasan penjualan cabang Anda hari ini dan peringatan stok.</li>
                          <li><strong>Produk (POS):</strong> Gunakan keranjang belanja interaktif. Masukkan jumlah uang pelanggan, dan sistem otomatis menghitung kembalian.</li>
                          <li><strong>Scan:</strong> Arahkan kamera ke barcode produk untuk langsung menemukan barang tanpa mengetik manual.</li>
                          <li><strong>Transfer:</strong> Terima kiriman barang dari pusat. Cek fisik barang lalu konfirmasi jumlah yang diterima.</li>
                          <li><strong>Profil:</strong> Ganti password dan atur preferensi notifikasi pribadi.</li>
                        </ul>
                      </div>
                    </>
                  )}

                  <div className="border-t border-slate-100 pt-4">
                    <p className="font-bold text-slate-800 mb-3 flex items-center gap-2"><span className="material-symbols-outlined !text-[16px]">quiz</span>Pertanyaan Umum (FAQ)</p>
                    <div className="space-y-2.5">
                      {isAdmin ? (
                        <>
                          <details className="bg-slate-50 rounded-xl border border-slate-100 group">
                            <summary className="p-3 cursor-pointer font-semibold text-slate-700 text-xs flex items-center justify-between">Bagaimana cara menambah produk baru?<span className="material-symbols-outlined !text-[16px] text-slate-400 group-open:rotate-180 transition-transform">expand_more</span></summary>
                            <p className="px-3 pb-3 text-xs text-slate-500">Buka menu Inventaris, lalu klik tombol "+" di pojok kanan atas. Isi nama, harga, kategori, dan barcode lalu simpan.</p>
                          </details>
                          <details className="bg-slate-50 rounded-xl border border-slate-100 group">
                            <summary className="p-3 cursor-pointer font-semibold text-slate-700 text-xs flex items-center justify-between">Bagaimana cara mengirim stok barang ke cabang?<span className="material-symbols-outlined !text-[16px] text-slate-400 group-open:rotate-180 transition-transform">expand_more</span></summary>
                            <p className="px-3 pb-3 text-xs text-slate-500">Buka menu Transfer, pilih Buat Transfer Baru. Tentukan cabang tujuan dan masukkan daftar barang beserta jumlahnya.</p>
                          </details>
                          <details className="bg-slate-50 rounded-xl border border-slate-100 group">
                            <summary className="p-3 cursor-pointer font-semibold text-slate-700 text-xs flex items-center justify-between">Bagaimana cara melihat laporan cabang lain?<span className="material-symbols-outlined !text-[16px] text-slate-400 group-open:rotate-180 transition-transform">expand_more</span></summary>
                            <p className="px-3 pb-3 text-xs text-slate-500">Buka Dasbor lalu klik "Laporan Transaksi". Anda bisa memfilter data transaksi berdasarkan cabang atau tanggal tertentu.</p>
                          </details>
                        </>
                      ) : (
                        <>
                          <details className="bg-slate-50 rounded-xl border border-slate-100 group">
                            <summary className="p-3 cursor-pointer font-semibold text-slate-700 text-xs flex items-center justify-between">Bagaimana cara melakukan checkout (POS)?<span className="material-symbols-outlined !text-[16px] text-slate-400 group-open:rotate-180 transition-transform">expand_more</span></summary>
                            <p className="px-3 pb-3 text-xs text-slate-500">Buka menu Kasir (POS). Anda bisa memindai barcode atau mencari barang manual. Tambahkan ke keranjang, lalu klik Bayar.</p>
                          </details>
                          <details className="bg-slate-50 rounded-xl border border-slate-100 group">
                            <summary className="p-3 cursor-pointer font-semibold text-slate-700 text-xs flex items-center justify-between">Bagaimana cara tutup shift harian?<span className="material-symbols-outlined !text-[16px] text-slate-400 group-open:rotate-180 transition-transform">expand_more</span></summary>
                            <p className="px-3 pb-3 text-xs text-slate-500">Buka Dasbor, klik tombol "Rekap Kasir". Masukkan modal awal dan hitung uang fisik di laci. Sistem akan mencocokkan secara otomatis.</p>
                          </details>
                          <details className="bg-slate-50 rounded-xl border border-slate-100 group">
                            <summary className="p-3 cursor-pointer font-semibold text-slate-700 text-xs flex items-center justify-between">Apa yang terjadi jika selisih uang fisik?<span className="material-symbols-outlined !text-[16px] text-slate-400 group-open:rotate-180 transition-transform">expand_more</span></summary>
                            <p className="px-3 pb-3 text-xs text-slate-500">Jika uang di laci tidak sesuai dengan sistem, akan tercatat sebagai "Uang Lebih" atau "Uang Kurang" pada format laporan WhatsApp.</p>
                          </details>
                        </>
                      )}
                      <details className="bg-slate-50 rounded-xl border border-slate-100 group">
                        <summary className="p-3 cursor-pointer font-semibold text-slate-700 text-xs flex items-center justify-between">Data saya disimpan di mana?<span className="material-symbols-outlined !text-[16px] text-slate-400 group-open:rotate-180 transition-transform">expand_more</span></summary>
                        <p className="px-3 pb-3 text-xs text-slate-500">Data aplikasi kini disimpan dengan aman secara *real-time* di Database Pusat (PostgreSQL). Tidak perlu khawatir hilang jika berganti perangkat.</p>
                      </details>
                      <details className="bg-slate-50 rounded-xl border border-slate-100 group">
                        <summary className="p-3 cursor-pointer font-semibold text-slate-700 text-xs flex items-center justify-between">Apa arti warna di Halaman Notifikasi?<span className="material-symbols-outlined !text-[16px] text-slate-400 group-open:rotate-180 transition-transform">expand_more</span></summary>
                        <p className="px-3 pb-3 text-xs text-slate-500">Warna Hitam = Sudah Kadaluarsa, Warna Merah = Stok Barang Habis, Warna Oranye = Hampir Kadaluarsa.</p>
                      </details>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-xl text-blue-800 border border-blue-100">
                    <p className="font-bold mb-1 flex items-center gap-2"><span className="material-symbols-outlined !text-[18px]">support_agent</span>Butuh Bantuan IT?</p>
                    <p className="text-xs mt-1">Hubungi IT Support di extension 101 atau kirim email ke <strong>support@calico.com</strong></p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}



        {/* Logout */}
        <button
          onClick={() => setShowLogoutDialog(true)}
          className="w-full py-4 bg-red-50 text-red-600 font-bold rounded-2xl border border-red-100 active:scale-95 transition-all flex items-center justify-center gap-2">
          <span className="material-symbols-outlined !text-[20px]">logout</span>
          Keluar dari Akun
        </button>
      </main>

      <BottomNav />
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-slate-400 !text-[20px]">{icon}</span>
      <div className="flex-1 flex justify-between items-center">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

