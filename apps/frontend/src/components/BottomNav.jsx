import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../lib/useSession';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useSession();
  const isAdmin = role === 'admin';

  // Toggle state for sidebar on desktop
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('calico_sidebar_open');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(prev => {
      const next = !prev;
      localStorage.setItem('calico_sidebar_open', JSON.stringify(next));
      window.dispatchEvent(new Event('sidebar-toggle'));
      return next;
    });
  };

  useEffect(() => {
    const handleExternalToggle = () => {
      setIsOpen(prev => {
        const next = !prev;
        localStorage.setItem('calico_sidebar_open', JSON.stringify(next));
        window.dispatchEvent(new Event('sidebar-toggle'));
        return next;
      });
    };
    window.addEventListener('toggle-sidebar', handleExternalToggle);
    
    const handleMobileToggle = () => setIsMoreOpen(true);
    window.addEventListener('mobile-drawer-toggle', handleMobileToggle);
    
    return () => {
      window.removeEventListener('toggle-sidebar', handleExternalToggle);
      window.removeEventListener('mobile-drawer-toggle', handleMobileToggle);
    };
  }, []);

  const allMenus = [];
  
  if (isAdmin) {
    allMenus.push({ path: '/dashboard', icon: 'home', label: 'Home' });
    allMenus.push({ path: '/kasir', icon: 'shopping_cart_checkout', label: 'Checkout' });
    allMenus.push({ path: '/penjualan', icon: 'bar_chart', label: 'Penjualan' });
    allMenus.push({ path: '/transfer', icon: 'swap_horiz', label: 'Transfer' });
    allMenus.push({ path: '/products', icon: 'inventory_2', label: 'Kelola Produk' });
    allMenus.push({ path: '/riwayat', icon: 'receipt_long', label: 'Riwayat' });
    allMenus.push({ path: '/profile', icon: 'person', label: 'Profil' });
  } else {
    allMenus.push({ path: '/dashboard', icon: 'home', label: 'Home' });
    allMenus.push({ path: '/products', icon: 'inventory_2', label: 'Produk' });
    allMenus.push({ path: '/penjualan', icon: 'bar_chart', label: 'Penjualan' });
    allMenus.push({ path: '/transfer', icon: 'swap_horiz', label: 'Transfer' });
    allMenus.push({ path: '/rekap', icon: 'point_of_sale', label: 'Tutup Kasir' });
    allMenus.push({ path: '/riwayat', icon: 'receipt_long', label: 'Riwayat' });
    allMenus.push({ path: '/profile', icon: 'person', label: 'Profil' });
  }

  const mainMenus = allMenus.slice(0, 4);
  const otherMenus = allMenus.slice(4);

  const primaryText = isAdmin ? 'text-[#D35400] md:text-white' : 'text-[#C0392B] md:text-white';
  const activeBg = isAdmin ? 'md:bg-[#D35400]' : 'md:bg-[#C0392B]';
  const indicatorBg = isAdmin ? 'bg-[#D35400]' : 'bg-[#C0392B]';
  const popupBg = isAdmin ? 'bg-[#D35400]' : 'bg-[#C0392B]';
  const popupTextHover = isAdmin ? 'hover:text-[#D35400]' : 'hover:text-[#C0392B]';

  const isActive = (path) => location.pathname === path;

  const { autoOpenLatest, autoOpenReceipt, ...safeState } = location.state || {};

  // Handle click on a menu item in the mobile popup
  const handleOtherMenuClick = (path) => {
    setIsMoreOpen(false);
    navigate(path, { state: safeState });
  };

  return (
    <>
      {/* Floating Toggle Button for collapsed desktop view & mobile top-left menu */}
      <button
        onClick={() => {
          if (window.innerWidth < 768) setIsMoreOpen(true);
          else toggleSidebar();
        }}
        className="hidden md:flex fixed top-4 left-4 z-[55] p-2 rounded-xl text-slate-700 active:scale-95 transition-all bg-white border border-slate-200 shadow-md hover:bg-slate-50"
      >
        <span className="material-symbols-outlined !text-[22px]">menu</span>
      </button>

      {/* Mobile "Lainnya" Overlay & Drawer */}
      <div className={`md:hidden fixed inset-0 z-[60] transition-opacity duration-300 ${isMoreOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40" onClick={() => setIsMoreOpen(false)} />
        
        {/* Drawer (Sliding from left) */}
        <div className={`absolute top-0 left-0 w-64 h-full bg-white shadow-2xl flex flex-col pt-6 pb-20 px-4 transition-transform duration-300 ${isMoreOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex justify-between items-center mb-8 px-2">
            <h3 className="font-headline font-extrabold text-xl text-slate-900">Menu Lainnya</h3>
            <button onClick={() => setIsMoreOpen(false)} className="p-2 rounded-xl bg-slate-100 active:scale-95 transition-transform text-slate-500">
              <span className="material-symbols-outlined !text-[20px]">close</span>
            </button>
          </div>
          
          <div className="flex flex-col gap-2 overflow-y-auto overflow-x-hidden scrollbar-hide">
            {otherMenus.map((menu) => {
              const active = isActive(menu.path);
              return (
                <Link
                  key={menu.path}
                  to={menu.path}
                  state={safeState}
                  onClick={() => setIsMoreOpen(false)}
                  className={`relative flex items-center px-4 py-3.5 rounded-xl gap-3 transition-all duration-200 flex-none ${
                    active 
                      ? `${popupBg} text-white shadow-md` 
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className="material-symbols-outlined !text-[22px] transition-all duration-200"
                    style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {menu.icon}
                  </span>
                  <span className={`text-sm font-bold tracking-wider transition-all duration-200 shrink-0 ${active ? 'opacity-100 text-white' : 'opacity-70 text-slate-600'}`}>
                    {menu.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navbar Container */}
      <nav className={`fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] z-[50] transition-all duration-300 md:bottom-auto md:top-0 md:h-screen md:border-r md:border-t-0 md:flex md:flex-col md:py-6 md:px-4 ${
        isOpen ? 'md:w-64 md:translate-x-0' : 'md:w-0 md:-translate-x-64'
      }`}>
        {/* Brand logo for desktop sidebar */}
        <div className="hidden md:flex flex-col items-center mb-8 px-2 relative">
          <span className="material-symbols-outlined text-4xl text-slate-800 mb-1">pets</span>
          <span className="font-extrabold text-lg tracking-tight text-slate-800 text-center">Calico's Pet Care</span>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-0.5">
            {role === 'admin' ? 'Admin Panel' : 'Kasir Panel'}
          </span>
        </div>

        {/* ── DESKTOP NAVIGATION (Shows all menus) ── */}
        <div className="hidden md:flex md:flex-col md:h-auto md:w-full md:gap-2 md:items-stretch overflow-y-auto overflow-x-hidden scrollbar-hide">
          {allMenus.map(({ path, icon, label }) => {
            const active = isActive(path);
            return (
              <Link
                key={path}
                to={path}
                state={safeState}
                className={`relative flex items-center px-4 py-3.5 rounded-xl gap-3 transition-all duration-200 flex-none ${
                  active 
                    ? `${primaryText} ${activeBg}` 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span
                  className="material-symbols-outlined !text-[22px] transition-all duration-200"
                  style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {icon}
                </span>
                <span className={`text-sm font-bold tracking-wider transition-all duration-200 shrink-0 ${active ? 'opacity-100 text-white' : 'opacity-70 text-slate-600'}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* ── MOBILE NAVIGATION (Shows 4 main menus only, menu is now at top left) ── */}
        <div className="flex md:hidden justify-around items-center h-16 px-2 w-full">

          {mainMenus.map(({ path, icon, label }) => {
            const active = isActive(path);
            return (
              <Link
                key={path}
                to={path}
                state={safeState}
                className={`relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 ${
                  active 
                    ? `${primaryText}` 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {active && (
                  <span className={`absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 ${indicatorBg} rounded-b-full`} />
                )}
                <span
                  className="material-symbols-outlined !text-[26px] transition-all duration-200"
                  style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {icon}
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-wider transition-all duration-200 shrink-0 ${active ? 'opacity-100' : 'opacity-70'}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
