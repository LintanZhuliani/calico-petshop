import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { authClient } from "../lib/auth-client";

export default function LoginPage() {
  const [role, setRole] = useState("admin");
  const [branch, setBranch] = useState("gempi");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showForgotDialog, setShowForgotDialog] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Email dan Password wajib diisi!");
      return;
    }
    
    try {
      const { data, error } = await authClient.signIn.email({
        email: email.toLowerCase(),
        password: password
      });

      if (error) {
        setErrorMsg("Akun tidak ditemukan atau password salah. Silakan periksa kembali!");
        return;
      }

      if (data?.user) {
        const user = data.user;
        
        // Cek apakah role sesuai dengan yang dipilih
        if (user.role !== role) {
          setErrorMsg("Akses ditolak! Role yang Anda pilih tidak sesuai dengan akun terdaftar.");
          await authClient.signOut(); // Batalkan sesi jika role salah
          return;
        }

        // Simpan data di state lokal untuk navigasi (opsional, karena auth tersimpan di cookie)
        setErrorMsg("");
        navigate("/dashboard", { 
          state: { 
            role: user.role, 
            branchName: branch, // Selalu gunakan cabang yang dipilih di dropdown
            userName: user.name 
          } 
        });
      }
    } catch (err) {
      setErrorMsg("Terjadi kesalahan pada server. Coba lagi nanti.");
    }
  };

  const primaryBg = role === "admin" ? "bg-[#D35400]" : "bg-[#C0392B]";
  const primaryText = role === "admin" ? "text-[#D35400]" : "text-[#C0392B]";
  const primaryHoverBg = role === "admin" ? "hover:bg-[#a84300]" : "hover:bg-[#992d22]";
  const primaryActiveBg = role === "admin" ? "active:bg-[#853400]" : "active:bg-[#7a241b]";
  const primaryShadow = role === "admin" ? "shadow-[0_12px_24px_-6px_rgba(211,84,0,0.5)]" : "shadow-[0_12px_24px_-6px_rgba(192,57,43,0.5)]";
  const primaryIconShadow = role === "admin" ? "shadow-[0_12px_24px_-8px_rgba(211,84,0,0.5)]" : "shadow-[0_12px_24px_-8px_rgba(192,57,43,0.5)]";
  const groupFocusText = errorMsg ? "group-focus-within:text-red-500 text-red-400" : (role === "admin" ? "group-focus-within:text-[#D35400]" : "group-focus-within:text-[#C0392B]");
  const focusBorder = errorMsg ? "border-red-500 focus:border-red-500" : `border-transparent ${role === "admin" ? "focus:border-[#D35400]" : "focus:border-[#C0392B]"}`;
  const iconColor = errorMsg ? "text-red-400" : "text-[#8c7a75]";

  return (
    <div className="min-h-screen w-full bg-[#f8f9fa] flex flex-col items-center justify-center py-10 px-6 font-body overflow-y-auto overflow-x-hidden relative">
      {/* Decorative Blur Elements */}
      <div className="absolute top-[-5%] left-[-10%] w-[300px] h-[300px] bg-[#F26B3A]/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-5%] right-[-10%] w-[300px] h-[300px] bg-sky-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <main className="w-full max-w-[400px] z-10 flex flex-col items-center">
        {/* Logo & Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className={`w-[72px] h-[72px] ${primaryBg} rounded-[24px] shrink-0 flex items-center justify-center mb-5 ${primaryIconShadow} transition-colors duration-300`}>
            <span className="material-symbols-outlined text-white text-[36px]" data-icon="pets">
              pets
            </span>
          </div>
          <h1 className="text-[28px] font-extrabold text-slate-900 tracking-tight mb-2 font-headline">
            Calico's Pet Care
          </h1>
        </div>

        {/* Login Card */}
        <div className="w-full bg-white rounded-[32px] p-8 pb-10 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.08)] mb-8 border border-white">
          <form className="space-y-6" onSubmit={handleLogin}>
            
            {/* Error Message */}
            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-3 rounded-2xl text-center text-[13px] font-bold border border-red-200 animate-pulse">
                {errorMsg}
              </div>
            )}
            
            {/* Role Switcher */}
            <div className="bg-[#f5f5f5] p-1.5 rounded-[20px] flex relative w-full mb-2">
              <div
                className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-[16px] shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  role === "admin" ? "translate-x-0" : "translate-x-full"
                }`}
              />
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`relative flex-1 py-3 text-[14px] font-bold z-10 transition-colors duration-300 ${
                  role === "admin" ? primaryText : "text-[#8c7a75] hover:text-slate-600"
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setRole("kasir")}
                className={`relative flex-1 py-3 text-[14px] font-bold z-10 transition-colors duration-300 ${
                  role === "kasir" ? primaryText : "text-[#8c7a75] hover:text-slate-600"
                }`}
              >
                Kasir
              </button>
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-[#5c4a45] uppercase tracking-[0.15em] pl-1">
                Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className={`material-symbols-outlined ${iconColor} text-[22px] ${groupFocusText} transition-colors`} data-icon="person">
                    person
                  </span>
                </div>
                <input
                  className={`block w-full pl-12 pr-4 py-3.5 bg-[#f5f5f5] border-2 ${focusBorder} focus:bg-white focus:ring-0 rounded-[16px] transition-all text-slate-800 placeholder:text-[#a3938d] font-medium text-[15px] outline-none`}
                  placeholder="Masukkan email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMsg("");
                  }}
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-[#5c4a45] uppercase tracking-[0.15em] pl-1">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className={`material-symbols-outlined ${iconColor} text-[22px] ${groupFocusText} transition-colors`} data-icon="lock">
                    lock
                  </span>
                </div>
                <input
                  className={`block w-full pl-12 pr-12 py-3.5 bg-[#f5f5f5] border-2 ${focusBorder} focus:bg-white focus:ring-0 rounded-[16px] transition-all text-slate-800 placeholder:text-[#a3938d] font-medium text-[15px] outline-none ${!showPassword ? 'tracking-widest' : ''}`}
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg("");
                  }}
                  required
                />
                <button
                  className={`absolute inset-y-0 right-0 pr-4 flex items-center ${iconColor} hover:text-slate-700 transition-colors`}
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Pilih Cabang Input */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-[#5c4a45] uppercase tracking-[0.15em] pl-1">
                Pilih Cabang
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className={`material-symbols-outlined text-[#8c7a75] text-[22px] ${groupFocusText} transition-colors`} data-icon="store">
                    store
                  </span>
                </div>
                <select 
                  className={`appearance-none bg-none block w-full pl-12 pr-10 py-3.5 bg-[#f5f5f5] border-2 border-transparent ${focusBorder} focus:bg-white focus:ring-0 rounded-[16px] transition-all text-slate-800 font-medium text-[15px] cursor-pointer outline-none`}
                  style={{ backgroundImage: 'none' }}
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  required
                >
                  <option value="" disabled className="text-slate-400">Pilih Cabang</option>
                  <option value="pusat">Calico's Pet Care (Pusat)</option>
                  <option value="gempi">Gempi Pet Shop</option>
                  <option value="baba">Baba Pet Corner</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[#8c7a75] text-[20px]" data-icon="expand_more">
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            {/* Lupa Password */}
            <div className="flex justify-end pt-1 pb-1">
              <button
                type="button"
                onClick={() => setShowForgotDialog(true)}
                className="text-[13px] font-bold text-[#992900] hover:text-[#c73500] transition-colors bg-transparent border-none p-0 cursor-pointer"
              >
                Lupa Password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              className={`w-full py-[18px] px-6 ${primaryBg} ${primaryHoverBg} ${primaryActiveBg} text-white font-bold rounded-[20px] ${primaryShadow} active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 text-[16px] mt-2`}
              type="submit"
            >
              <span className="material-symbols-outlined text-[20px]" data-icon="login">
                login
              </span>
              Masuk Sekarang
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-slate-400 text-xs font-medium text-center z-10 relative">
          Sistem POS Khusus Karyawan<br/>© 2026 Calico's Pet Care
        </p>
      </main>

      {/* Lupa Password Dialog */}
      {showForgotDialog && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center px-6 transition-all duration-300">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-sm text-center space-y-5 shadow-2xl relative">
            <div className="w-16 h-16 bg-orange-50 rounded-[20px] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-orange-500 !text-[32px]" data-icon="lock_reset">
                lock_reset
              </span>
            </div>
            <div>
              <h3 className="font-headline font-extrabold text-slate-900 text-xl">Lupa Password?</h3>
              <p className="text-sm text-slate-500 mt-2 font-medium leading-relaxed">
                Untuk menjaga keamanan sistem kasir, silakan hubungi <strong>Admin/Pemilik Toko</strong> secara langsung agar mereka dapat mereset password akun Anda.
              </p>
            </div>
            <button 
              onClick={() => setShowForgotDialog(false)} 
              className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-[16px] active:scale-95 transition-all"
            >
              Mengerti, Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}