import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authClient } from "../lib/auth-client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("error") === "INVALID_TOKEN") {
      setError("Link reset password tidak valid atau sudah kedaluwarsa. Silakan request link baru.");
    }
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Password tidak sama");
      return;
    }
    if (password.length < 8) {
      setError("Password minimal 8 karakter");
      return;
    }

    // Ambil token langsung dari URL untuk berjaga-jaga
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("token");

    if (!token) {
      setError("Token tidak ditemukan di URL. Pastikan Anda membuka link dari email terbaru.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: password,
        token: token,
      });

      if (resetError) {
        setError(resetError.message || "Gagal mereset password. Token mungkin tidak valid atau kedaluwarsa.");
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError("Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-body">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-xl border border-slate-100">
        <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-orange-500 !text-[32px]">lock_reset</span>
        </div>
        
        <h2 className="text-2xl font-headline font-extrabold text-slate-900 text-center mb-2">Buat Sandi Baru</h2>
        
        {success ? (
          <div className="text-center space-y-4">
            <p className="text-slate-500 mb-6">Sandi Anda berhasil diperbarui! Silakan login dengan sandi baru Anda.</p>
            <button 
              onClick={() => navigate('/login')}
              className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl active:scale-95 transition-all"
            >
              Kembali ke Halaman Login
            </button>
          </div>
        ) : (
          <>
            <p className="text-slate-500 text-center text-sm mb-6">Silakan ketik password baru untuk akun Anda.</p>
            {error && (
              <div className="bg-red-50 text-red-600 p-4 text-sm rounded-xl border border-red-200 mb-6">
                {error}
              </div>
            )}
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <input 
                  type="password" 
                  required 
                  placeholder="Password Baru"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-xl p-4 outline-none text-slate-800 font-medium"
                />
              </div>
              <div>
                <input 
                  type="password" 
                  required 
                  placeholder="Ulangi Password Baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-xl p-4 outline-none text-slate-800 font-medium"
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-400 text-white font-bold rounded-2xl active:scale-95 transition-all flex justify-center items-center gap-2 mt-4"
              >
                {loading ? 'Menyimpan...' : 'Simpan Sandi Baru'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
