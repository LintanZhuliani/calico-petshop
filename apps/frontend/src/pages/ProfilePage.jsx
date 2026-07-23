import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { BRANCHES } from '../data/mockData';
import { formatRupiah, formatDateTime } from '../utils/formatters';
import { authClient } from '../lib/auth-client';
import { useSession, clearSession } from '../lib/useSession';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { role, branchName: branchId, userName } = useSession();
  const isAdmin = role === 'admin';

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
  
  const [editProfileName, setEditProfileName] = useState("");
  const [editProfileEmail, setEditProfileEmail] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
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
        setEditProfileName(data.user.name || userName);
        setEditProfileEmail(data.user.email);
      }
    };
    fetchSession();
  }, [userName]);

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

  const handleLogout = async () => {
    localStorage.removeItem('userAccount');
    clearSession();
    try {
      await authClient.signOut();
    } catch(e) { console.error(e); }
    navigate('/login', { replace: true });
  };

  const handleSwitchBranch = (newBranchId) => {
    if (newBranchId === branchId) return;
    const currentSession = JSON.parse(localStorage.getItem('calico_session')) || {};
    const newSession = { ...currentSession, branchName: newBranchId, role, userName };
    localStorage.setItem('calico_session', JSON.stringify(newSession));
    
    // Clear caches to prevent data bleeding
    localStorage.removeItem('calico_products_cache');
    localStorage.removeItem('calico_dashboard_stats');
    
    // Navigate and hard reload to apply new branch state everywhere
    window.location.href = '/dashboard';
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

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setSavingProfile(true);

    try {
      const { apiFetch } = await import('../lib/api.js');
      const res = await apiFetch('/users/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: editProfileName, email: editProfileEmail })
      });
      
      setProfileSuccess("Profil berhasil diperbarui!");
      setCurrentEmail(editProfileEmail);
      
      // Update local session
      const currentSession = JSON.parse(localStorage.getItem('calico_session')) || {};
      const newSession = { ...currentSession, userName: editProfileName };
      localStorage.setItem('calico_session', JSON.stringify(newSession));
      
      setTimeout(() => {
        setActiveModal(null);
        setProfileSuccess(""); setProfileError("");
        window.location.reload();
      }, 1000);
    } catch (err) {
      setProfileError(err.message || "Gagal memperbarui profil.");
    } finally {
      setSavingProfile(false);
    }
  };

  // We removed mock data. To get accurate counts, it requires a separate API call.
  // For now, we'll keep the menu simple and direct to the Penjualan page.
  const [todayTxCount, setTodayTxCount] = useState(0);

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
    ] : []),
    { id: 'edit_profile', icon: 'person_edit', label: 'Edit Profil', desc: 'Ubah nama pengguna & email', color: primaryText },
    { id: 'branches', icon: 'store', label: isAdmin ? 'Kelola Cabang' : 'Ganti Cabang', desc: 'Pilih & ganti cabang aktif', color: primaryText },
    { id: 'laporan', icon: 'receipt_long', label: 'Riwayat Transaksi', desc: `${todayTxCount} transaksi hari ini`, color: primaryText },
    { id: 'riwayat_notifikasi', icon: 'history', label: 'Riwayat Notifikasi', desc: 'Log hapus barang & kadaluarsa', color: primaryText },
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
    <div className={`bg-white min-h-screen flex flex-col pb-24 font-body transition-all duration-300 ${
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
      <header className="bg-white border-b border-slate-200 px-5 pb-4 pt-4 sticky top-0 z-40 flex items-center gap-3">
        <button 
          onClick={() => window.dispatchEvent(new Event('mobile-drawer-toggle'))}
          className="md:hidden p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center"
        >
          <span className="material-symbols-outlined !text-[24px]">menu</span>
        </button>
        <h1 className={`font-headline font-extrabold text-xl ${primaryText}`}>Profil</h1>
      </header>

      <main className="px-5 py-6 space-y-4 w-full">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
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
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm divide-y divide-slate-50">
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
            if (isLaporan || item.id === 'riwayat_notifikasi') {
              return (
                <Link
                  key={i}
                  to={isLaporan ? "/riwayat" : "/riwayat-notifikasi"}
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

        {/* Edit Profil Modal */}
        {activeModal === 'edit_profile' && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center px-4" onClick={(e) => { if(e.target === e.currentTarget) setActiveModal(null); }}>
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
              <button onClick={() => setActiveModal(null)} className="absolute top-5 right-5 p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200">
                <span className="material-symbols-outlined !text-[20px]">close</span>
              </button>
              
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-2xl ${primaryLight} flex items-center justify-center shrink-0`}>
                  <span className={`material-symbols-outlined ${primaryText} !text-[24px]`}>person_edit</span>
                </div>
                <div>
                  <h3 className="font-headline font-bold text-lg text-slate-900 leading-tight">Edit Profil</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Ubah detail akun Anda</p>
                </div>
              </div>

              {profileError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl flex items-start gap-2 border border-red-100">
                  <span className="material-symbols-outlined !text-[16px]">error</span>
                  <p className="leading-snug">{profileError}</p>
                </div>
              )}
              {profileSuccess && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 text-xs font-bold rounded-xl flex items-center gap-2 border border-green-100">
                  <span className="material-symbols-outlined !text-[16px]">check_circle</span>
                  {profileSuccess}
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nama Lengkap</label>
                  <input type="text" required value={editProfileName} onChange={e => setEditProfileName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-orange-300 rounded-xl text-sm font-semibold outline-none transition-all" />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Email Baru</label>
                  <input type="email" required value={editProfileEmail} onChange={e => setEditProfileEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-orange-300 rounded-xl text-sm font-semibold outline-none transition-all" />
                </div>
                
                <button disabled={savingProfile} type="submit" className={`w-full py-3.5 mt-2 ${primaryBg} text-white font-bold rounded-2xl active:scale-95 transition-all text-sm flex justify-center items-center gap-2 disabled:opacity-50`}>
                  {savingProfile ? 'Menyimpan...' : 'Simpan Profil'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Dynamic Modals */}
        {activeModal && activeModal !== 'logout' && activeModal !== 'edit_profile' && (
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
                        <div key={emp.id || i} className={`p-4 rounded-2xl flex items-center gap-4 border ${emp.email === currentEmail ? `${primaryLight} border-orange-200` : 'bg-slate-50 border-slate-200'}`}>
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
                    <div 
                      key={b.id} 
                      onClick={() => handleSwitchBranch(b.id)}
                      className={`cursor-pointer bg-slate-50 p-4 rounded-2xl flex items-center gap-4 border ${b.id === branchId ? `border-${primaryLightText.split('-')[1]}-400 shadow-sm bg-${primaryLightText.split('-')[1]}-50/30` : 'border-slate-200 hover:border-slate-300'} transition-all active:scale-95`}
                    >
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
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 shrink-0">
                    <div>
                      <p className="font-bold text-slate-800">Peringatan Stok Tipis</p>
                      <p className="text-xs text-slate-500 mt-0.5">Notifikasi saat stok di bawah batas minimum</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                      <input type="checkbox" checked={notifState.stok} onChange={() => setNotifState(s => ({...s, stok: !s.stok}))} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-checked:bg-orange-500 rounded-full transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 shrink-0">
                    <div>
                      <p className="font-bold text-slate-800">Barang Hampir Kedaluwarsa</p>
                      <p className="text-xs text-slate-500 mt-0.5">Notifikasi 30 hari sebelum produk rusak</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                      <input type="checkbox" checked={notifState.expired} onChange={() => setNotifState(s => ({...s, expired: !s.expired}))} className="sr-only peer" />
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
                          <li><strong>Dasbor:</strong> Memantau ringkasan pendapatan harian, informasi stok kritis, dan notifikasi kedaluwarsa secara aktual (*real-time*).</li>
                          <li><strong>Kelola Produk:</strong> Mengelola inventaris secara menyeluruh, termasuk fungsi menambah, mengedit, dan menghapus produk. Fitur ini juga digunakan untuk menyesuaikan harga modal, harga jual, *barcode*, serta mengedit kuantitas stok.</li>
                          <li><strong>Checkout:</strong> Berfungsi khusus sebagai modul *Point of Sale* (POS) untuk memproses dan mencatat transaksi penjualan pelanggan.</li>
                          <li><strong>Riwayat & Analitik:</strong> Meninjau daftar transaksi yang telah berlangsung, mengunduh laporan penjualan bulanan, mencetak ulang struk, serta melakukan pembatalan transaksi (*Refund*).</li>
                          <li><strong>Profil:</strong> Pusat pengaturan akun untuk mengubah kata sandi, menyesuaikan preferensi notifikasi, dan mengakses bantuan sistem.</li>
                        </ul>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                        <p className="font-bold text-red-800 mb-2 flex items-center gap-2"><span className="material-symbols-outlined !text-[16px]">support_agent</span>Panduan Kasir</p>
                        <ul className="list-disc pl-5 space-y-1.5 text-red-700 text-xs">
                          <li><strong>Dasbor:</strong> Menampilkan ringkasan pendapatan operasional *shift* berjalan serta memfasilitasi pembuatan Laporan Tutup Kasir (Rekap Kasir) via WhatsApp.</li>
                          <li><strong>Checkout:</strong> Menu utama yang digunakan untuk melayani transaksi pelanggan. Mendukung penggunaan pemindai *barcode* maupun pencarian manual.</li>
                          <li><strong>Kelola Produk:</strong> Memberikan akses hanya untuk melihat daftar inventaris yang tersedia (tanpa hak akses untuk memodifikasi data harga maupun jumlah stok).</li>
                          <li><strong>Notifikasi:</strong> Menyajikan peringatan sistematis terkait barang yang kehabisan stok atau akan segera memasuki masa kedaluwarsa.</li>
                          <li><strong>Profil:</strong> Halaman khusus untuk memperbarui kata sandi keamanan Anda dan membaca instruksi teknis penggunaan sistem.</li>
                        </ul>
                      </div>
                    </>
                  )}

                  <div className="border-t border-slate-200 pt-4">
                    <p className="font-bold text-slate-800 mb-3 flex items-center gap-2"><span className="material-symbols-outlined !text-[16px]">quiz</span>Pertanyaan Umum (FAQ)</p>
                    <div className="space-y-2.5">
                      {isAdmin ? (
                        <>
                          <details className="bg-slate-50 rounded-xl border border-slate-200 group">
                            <summary className="p-3 cursor-pointer font-semibold text-slate-700 text-xs flex items-center justify-between">Bagaimana cara melihat Margin Profit?<span className="material-symbols-outlined !text-[16px] text-slate-400 group-open:rotate-180 transition-transform">expand_more</span></summary>
                            <p className="px-3 pb-3 text-xs text-slate-500">Saat Anda menambah atau mengedit produk di menu Inventaris, masukkan Harga Modal dan Harga Jual. Sistem akan secara otomatis menghitung dan menampilkan persentase margin profit Anda.</p>
                          </details>
                          <details className="bg-slate-50 rounded-xl border border-slate-200 group">
                            <summary className="p-3 cursor-pointer font-semibold text-slate-700 text-xs flex items-center justify-between">Bagaimana cara membatalkan transaksi (Refund)?<span className="material-symbols-outlined !text-[16px] text-slate-400 group-open:rotate-180 transition-transform">expand_more</span></summary>
                            <p className="px-3 pb-3 text-xs text-slate-500">Silakan buka menu Riwayat Transaksi. Temukan transaksi yang keliru, tekan ikon titik tiga pada transaksi tersebut, kemudian pilih opsi hapus. Stok produk akan dikembalikan ke inventaris secara otomatis.</p>
                          </details>
                          <details className="bg-slate-50 rounded-xl border border-slate-200 group">
                            <summary className="p-3 cursor-pointer font-semibold text-slate-700 text-xs flex items-center justify-between">Apakah Kasir dapat mengakses informasi harga modal?<span className="material-symbols-outlined !text-[16px] text-slate-400 group-open:rotate-180 transition-transform">expand_more</span></summary>
                            <p className="px-3 pb-3 text-xs text-slate-500">Tidak. Akun Kasir memiliki hak akses yang terbatas. Mereka tidak memiliki izin untuk melihat harga modal, margin profit, menu Manajemen Pengguna, maupun membatalkan transaksi.</p>
                          </details>
                          <details className="bg-slate-50 rounded-xl border border-slate-200 group">
                            <summary className="p-3 cursor-pointer font-semibold text-slate-700 text-xs flex items-center justify-between">Bagaimana jika terjadi kesalahan saat menginput stok atau kedaluwarsa?<span className="material-symbols-outlined !text-[16px] text-slate-400 group-open:rotate-180 transition-transform">expand_more</span></summary>
                            <p className="px-3 pb-3 text-xs text-slate-500">Apabila Anda salah memasukkan jumlah stok atau tanggal kedaluwarsa, Anda dapat mengubahnya dengan menekan ikon pensil yang terdapat pada fitur Edit Stok.</p>
                          </details>
                          <details className="bg-slate-50 rounded-xl border border-slate-200 group">
                            <summary className="p-3 cursor-pointer font-semibold text-slate-700 text-xs flex items-center justify-between">Bagaimana cara menginput barang dengan harga modal baru?<span className="material-symbols-outlined !text-[16px] text-slate-400 group-open:rotate-180 transition-transform">expand_more</span></summary>
                            <p className="px-3 pb-3 text-xs text-slate-500">Jika terdapat penambahan barang, baik dengan harga modal yang baru maupun tanpa harga modal baru, proses tersebut dapat dilakukan melalui fitur "+ Stok".</p>
                          </details>
                        </>
                      ) : (
                        <>
                          <details className="bg-slate-50 rounded-xl border border-slate-200 group">
                            <summary className="p-3 cursor-pointer font-semibold text-slate-700 text-xs flex items-center justify-between">Bagaimana cara mencari produk di Kasir?<span className="material-symbols-outlined !text-[16px] text-slate-400 group-open:rotate-180 transition-transform">expand_more</span></summary>
                            <p className="px-3 pb-3 text-xs text-slate-500">Anda dapat menggunakan kolom pencarian, memindai *barcode*, atau menekan tombol filter kategori yang berada di bagian atas layar.</p>
                          </details>
                          <details className="bg-slate-50 rounded-xl border border-slate-200 group">
                            <summary className="p-3 cursor-pointer font-semibold text-slate-700 text-xs flex items-center justify-between">Bagaimana prosedur penutupan shift harian?<span className="material-symbols-outlined !text-[16px] text-slate-400 group-open:rotate-180 transition-transform">expand_more</span></summary>
                            <p className="px-3 pb-3 text-xs text-slate-500">Silakan buka Dasbor, lalu pilih "Rekap Kasir". Masukkan nominal uang fisik yang terdapat di laci. Sistem akan secara otomatis memformat laporan lengkap untuk dikirimkan melalui WhatsApp kepada Admin.</p>
                          </details>
                          <details className="bg-slate-50 rounded-xl border border-slate-200 group">
                            <summary className="p-3 cursor-pointer font-semibold text-slate-700 text-xs flex items-center justify-between">Mengapa saya tidak diizinkan membatalkan transaksi?<span className="material-symbols-outlined !text-[16px] text-slate-400 group-open:rotate-180 transition-transform">expand_more</span></summary>
                            <p className="px-3 pb-3 text-xs text-slate-500">Fitur pembatalan (*Refund*) dan modifikasi data merupakan fitur yang bersifat sensitif, sehingga kewenangan tersebut dibatasi hanya untuk pemilik toko (Admin).</p>
                          </details>
                        </>
                      )}
                      <details className="bg-slate-50 rounded-xl border border-slate-200 group">
                        <summary className="p-3 cursor-pointer font-semibold text-slate-700 text-xs flex items-center justify-between">Apa fungsi dari menu Checkout dan Kelola Produk?<span className="material-symbols-outlined !text-[16px] text-slate-400 group-open:rotate-180 transition-transform">expand_more</span></summary>
                        <p className="px-3 pb-3 text-xs text-slate-500">Menu Checkout digunakan secara khusus untuk memproses transaksi penjualan kepada pelanggan. Sementara itu, menu Kelola Produk diperuntukkan bagi pengelolaan data produk pada sistem.</p>
                      </details>
                      <details className="bg-slate-50 rounded-xl border border-slate-200 group">
                        <summary className="p-3 cursor-pointer font-semibold text-slate-700 text-xs flex items-center justify-between">Bagaimana cara mengunduh aplikasi ini?<span className="material-symbols-outlined !text-[16px] text-slate-400 group-open:rotate-180 transition-transform">expand_more</span></summary>
                        <p className="px-3 pb-3 text-xs text-slate-500">Anda dapat mengunduh dan memasang aplikasi ini secara langsung dengan memilih opsi "Instal Aplikasi" atau "Tambahkan ke Layar Utama" (Add to Home Screen) pada pengaturan peramban (*browser*) Anda.</p>
                      </details>
                      <details className="bg-slate-50 rounded-xl border border-slate-200 group">
                        <summary className="p-3 cursor-pointer font-semibold text-slate-700 text-xs flex items-center justify-between">Bagaimana sistem notifikasi beroperasi?<span className="material-symbols-outlined !text-[16px] text-slate-400 group-open:rotate-180 transition-transform">expand_more</span></summary>
                        <p className="px-3 pb-3 text-xs text-slate-500">Sistem akan memunculkan notifikasi apabila terdapat barang yang hampir kedaluwarsa. Apabila barang telah melewati batas kedaluwarsa, notifikasi tersebut akan dipindahkan ke Riwayat Notifikasi. Barang dengan status stok habis juga akan masuk ke dalam notifikasi, dan notifikasi tersebut baru akan dihilangkan setelah data stok diperbarui.</p>
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

