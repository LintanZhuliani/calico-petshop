import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import ScanPage from "./pages/ScanPage";
import TransferPage from "./pages/TransferPage";
import ProfilePage from "./pages/ProfilePage";
import PenjualanPage from "./pages/PenjualanPage";

import RekapHarianPage from "./pages/RekapHarianPage";

import NotifikasiPage from "./pages/NotifikasiPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/transfer" element={<TransferPage />} />
        <Route path="/penjualan" element={<PenjualanPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/notifikasi" element={<NotifikasiPage />} />
        <Route path="/rekap" element={<RekapHarianPage />} />
      </Routes>
    </BrowserRouter>
  );
}