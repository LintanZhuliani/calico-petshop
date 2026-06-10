import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function BottomNav() {
  const location = useLocation();
  const role = location.state?.role || 'kasir';
  const isAdmin = role === 'admin';

  const NAV_ITEMS = [
    { path: '/dashboard', icon: 'home', label: 'Home' },
    { path: '/products', icon: 'inventory_2', label: 'Produk' },
    ...(isAdmin ? [{ path: '/penjualan', icon: 'bar_chart', label: 'Penjualan' }] : []),
    { path: '/transfer', icon: 'swap_horiz', label: 'Transfer' },
    { path: '/profile', icon: 'person', label: 'Profil' },
  ];
  const primaryText = isAdmin ? 'text-[#D35400] md:text-white' : 'text-[#C0392B] md:text-white';
  const activeBg = isAdmin ? 'md:bg-[#D35400]' : 'md:bg-[#C0392B]';
  const indicatorBg = isAdmin ? 'bg-[#D35400]' : 'bg-[#C0392B]';

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] z-50 md:bottom-auto md:top-0 md:w-64 md:h-screen md:border-r md:border-t-0 md:flex md:flex-col md:py-6 md:px-4">
      {/* Brand logo for desktop sidebar */}
      <div className="hidden md:flex flex-col items-center mb-8 px-2">
        <span className="material-symbols-outlined text-4xl text-slate-800 mb-1">pets</span>
        <span className="font-extrabold text-lg tracking-tight text-slate-800">Calico's Pet Care</span>
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-0.5">
          {role === 'admin' ? 'Admin Panel' : 'Kasir Panel'}
        </span>
      </div>

      <div className="flex justify-around items-center h-16 px-2 md:flex-col md:h-auto md:w-full md:gap-2 md:items-stretch">
        {NAV_ITEMS.map(({ path, icon, label }) => {
          const active = isActive(path);
          return (
            <Link
              key={path}
              to={path}
              state={location.state}
              className={`relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 md:flex-row md:justify-start md:px-4 md:py-3.5 md:rounded-xl md:gap-3 md:h-auto md:flex-none ${
                active 
                  ? `${primaryText} ${activeBg}` 
                  : 'text-slate-400 hover:text-slate-600 md:hover:bg-slate-50'
              }`}
            >
              {active && (
                <span
                  className={`absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 ${indicatorBg} rounded-b-full md:hidden`}
                />
              )}
              <span
                className="material-symbols-outlined !text-[26px] md:!text-[22px] transition-all duration-200"
                style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
              >
                {icon}
              </span>
              <span className={`text-[9px] md:text-sm font-bold uppercase md:capitalize tracking-wider transition-all duration-200 ${active ? 'opacity-100 md:text-white' : 'opacity-70 md:text-slate-600'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

