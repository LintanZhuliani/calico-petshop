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
  const primaryText = isAdmin ? 'text-[#D35400]' : 'text-[#C0392B]';
  const indicatorBg = isAdmin ? 'bg-[#D35400]' : 'bg-[#C0392B]';

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {NAV_ITEMS.map(({ path, icon, label }) => {
          const active = isActive(path);
          return (
            <Link
              key={path}
              to={path}
              state={location.state}
              className={`relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors duration-200 ${
                active ? primaryText : 'text-slate-400 hover:text-slate-500'
              }`}
            >
              {active && (
                <span
                  className={`absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 ${indicatorBg} rounded-b-full`}
                />
              )}
              <span
                className="material-symbols-outlined !text-[26px] transition-all duration-200"
                style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
              >
                {icon}
              </span>
              <span className={`text-[9px] font-bold uppercase tracking-wider transition-all duration-200 ${active ? 'opacity-100' : 'opacity-70'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
