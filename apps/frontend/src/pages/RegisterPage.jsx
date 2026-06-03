import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { authClient } from "../lib/auth-client";

export default function RegisterPage() {
  const [role, setRole] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Password tidak cocok!");
      return;
    }

    try {
      const { data, error } = await authClient.signUp.email({
        email: email.toLowerCase(),
        password: password,
        name: name,
        role: role,
        // Optional: you can add branchId if you have a dropdown for it, 
        // for now we let it be handled later or set a default.
      });

      if (error) {
        alert(error.message || "Gagal mendaftar. Email mungkin sudah digunakan.");
        return;
      }

      setSuccessMessage("Pendaftaran Berhasil! Mengalihkan ke halaman login...");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      console.error("Register error:", err);
      alert("Terjadi kesalahan pada server: " + (err.message || err));
    }
  };

  const primaryBg = role === "admin" ? "bg-[#D35400]" : "bg-[#C0392B]";
  const primaryText = role === "admin" ? "text-[#D35400]" : "text-[#C0392B]";
  const primaryHoverBg = role === "admin" ? "hover:bg-[#a84300]" : "hover:bg-[#992d22]";
  const primaryActiveBg = role === "admin" ? "active:bg-[#853400]" : "active:bg-[#7a241b]";
  const primaryShadow = role === "admin" ? "shadow-[0_12px_24px_-6px_rgba(211,84,0,0.5)]" : "shadow-[0_12px_24px_-6px_rgba(192,57,43,0.5)]";
  const primaryIconShadow = role === "admin" ? "shadow-[0_12px_24px_-8px_rgba(211,84,0,0.5)]" : "shadow-[0_12px_24px_-8px_rgba(192,57,43,0.5)]";
  const groupFocusText = role === "admin" ? "group-focus-within:text-[#D35400]" : "group-focus-within:text-[#C0392B]";
  const focusBorder = role === "admin" ? "focus:border-[#D35400]" : "focus:border-[#C0392B]";
  const ringFocusBorder = role === "admin" ? "focus:ring-[#D35400] text-[#D35400]" : "focus:ring-[#C0392B] text-[#C0392B]";

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
            Daftar Akun Baru
          </h1>
          <p className="text-slate-600 font-medium tracking-wide">
            Bergabung dengan Pet Care Tracker
          </p>
        </div>

        {/* Register Card */}
        <div className="w-full bg-white rounded-[32px] p-8 pb-10 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.08)] mb-8 border border-white">
          <form className="space-y-6" onSubmit={handleRegister}>
            
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

            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-50 text-green-700 p-3.5 rounded-[16px] text-center text-[14px] font-bold border border-green-200 animate-pulse">
                {successMessage}
              </div>
            )}

            {/* Name Input */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-[#5c4a45] uppercase tracking-[0.15em] pl-1">
                Nama Lengkap
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className={`material-symbols-outlined text-[#8c7a75] text-[22px] ${groupFocusText} transition-colors`} data-icon="badge">
                    badge
                  </span>
                </div>
                <input
                  className={`block w-full pl-12 pr-4 py-3.5 bg-[#f5f5f5] border-2 border-transparent ${focusBorder} focus:bg-white focus:ring-0 rounded-[16px] transition-all text-slate-800 placeholder:text-[#a3938d] font-medium text-[15px] outline-none`}
                  placeholder="Masukkan nama lengkap"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-[#5c4a45] uppercase tracking-[0.15em] pl-1">
                Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className={`material-symbols-outlined text-[#8c7a75] text-[22px] ${groupFocusText} transition-colors`} data-icon="mail">
                    mail
                  </span>
                </div>
                <input
                  className={`block w-full pl-12 pr-4 py-3.5 bg-[#f5f5f5] border-2 border-transparent ${focusBorder} focus:bg-white focus:ring-0 rounded-[16px] transition-all text-slate-800 placeholder:text-[#a3938d] font-medium text-[15px] outline-none`}
                  placeholder="Masukkan email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  <span className={`material-symbols-outlined text-[#8c7a75] text-[22px] ${groupFocusText} transition-colors`} data-icon="lock">
                    lock
                  </span>
                </div>
                <input
                  className={`block w-full pl-12 pr-12 py-3.5 bg-[#f5f5f5] border-2 border-transparent ${focusBorder} focus:bg-white focus:ring-0 rounded-[16px] transition-all text-slate-800 placeholder:text-[#a3938d] font-medium text-[15px] outline-none ${!showPassword ? 'tracking-widest' : ''}`}
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#8c7a75] hover:text-slate-700 transition-colors"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-[#5c4a45] uppercase tracking-[0.15em] pl-1">
                Konfirmasi Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className={`material-symbols-outlined text-[#8c7a75] text-[22px] ${groupFocusText} transition-colors`} data-icon="lock">
                    lock
                  </span>
                </div>
                <input
                  className={`block w-full pl-12 pr-12 py-3.5 bg-[#f5f5f5] border-2 border-transparent ${focusBorder} focus:bg-white focus:ring-0 rounded-[16px] transition-all text-slate-800 placeholder:text-[#a3938d] font-medium text-[15px] outline-none ${!showConfirmPassword ? 'tracking-widest' : ''}`}
                  placeholder="••••••••"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#8c7a75] hover:text-slate-700 transition-colors"
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Privacy Policy */}
            <div className="flex items-start gap-3 pt-2">
              <input type="checkbox" id="privacy" className={`mt-1 w-4 h-4 bg-gray-100 border-gray-300 rounded ${ringFocusBorder} transition-colors duration-300`} required />
              <label htmlFor="privacy" className="text-[13px] font-medium text-slate-600">
                Saya menyetujui <a href="#" className={`${primaryText} hover:underline transition-colors duration-300`}>Syarat & Ketentuan</a> serta <a href="#" className={`${primaryText} hover:underline transition-colors duration-300`}>Kebijakan Privasi</a>.
              </label>
            </div>

            {/* Submit Button */}
            <button
              className={`w-full py-[18px] px-6 ${primaryBg} ${primaryHoverBg} ${primaryActiveBg} text-white font-bold rounded-[20px] ${primaryShadow} active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 text-[16px] mt-2`}
              type="submit"
            >
              <span className="material-symbols-outlined text-[20px]" data-icon="app_registration">
                app_registration
              </span>
              Daftar Sekarang
            </button>
          </form>
        </div>

        {/* Footer Help */}
        <div className="text-center mt-2">
          <p className="text-slate-600 text-[14px] font-medium">
            Sudah punya akun?{" "}
            <Link to="/login" className={`${primaryText} font-bold hover:underline transition-colors duration-300`}>
              Masuk di sini!
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
