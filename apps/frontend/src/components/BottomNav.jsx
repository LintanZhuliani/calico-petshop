import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const role = location.state?.role || 'kasir';
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
    return () => window.removeEventListener('toggle-sidebar', handleExternalToggle);
  }, []);

  const allMenus = [];
  
  if (isAdmin) {
    allMenus.push({ path: '/dashboard', icon: 'home', label: 'Home' });
    allMenus.push({ path: '/kasir', icon: 'shopping_cart_checkout', label: 'Checkout' });
    allMenus.push({ path: '/penjualan', icon: 'bar_chart', label: 'Penjualan' });
    allMenus.push({ path: '/transfer', icon: 'swap_horiz', label: 'Transfer' });
    allMenus.push({ path: '/products', icon: 'inventory_2', label: 'Kelola Produk' });
    allMenus.push({ path: '/riwayat', icon: 'receipt_long', label: 'Riwayat' });
    allMenus.push({ path: '/rekap', icon: 'point_of_sale', label: 'Tutup Kasir' });
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
        className="flex fixed top-4 left-4 z-[55] p-2 rounded-xl text-slate-700 active:scale-95 transition-all md:bg-white md:border md:border-slate-200 md:shadow-md md:hover:bg-slate-50"
      >
        <span className="material-symbols-outlined !text-[22px]">menu</span>
      </button>

      {/* Mobile Backdrop for Sidebar */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 z-[45] bg-black/40 animate-[fadeIn_0.2s_ease]" 
          onClick={() => setIsOpen(false)} 
        />
      )}

      {/* Navbar Container (Sidebar) */}
      <nav className={`fixed top-0 left-0 h-screen bg-white border-r border-slate-100 shadow-[4px_0_24px_rgba(0,0,0,0.06)] z-[50] transition-all duration-300 flex flex-col py-6 px-4 ${
        isOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-64 overflow-hidden px-0'
      }`}>
        {/* Brand logo for sidebar */}
        <div className="flex flex-col items-center mb-8 px-2 relative">
          <span className="material-symbols-outlined text-4xl text-slate-800 mb-1">pets</span>
          <span className="font-extrabold text-lg tracking-tight text-slate-800 text-center">Calico's Pet Care</span>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-0.5">
            {role === 'admin' ? 'Admin Panel' : 'Kasir Panel'}
          </span>
        </div>

        {/* ── NAVIGATION (Universal) ── */}
        <div className="flex flex-col h-auto w-full gap-2 items-stretch overflow-y-auto overflow-x-hidden scrollbar-hide">
          {allMenus.map(({ path, icon, label }) => {
            const active = isActive(path);
            return (
              <Link
                key={path}
                to={path}
                state={safeState}
                onClick={() => { if(window.innerWidth < 768) setIsOpen(false); }}
                className={`relative flex items-center px-4 py-3.5 rounded-xl gap-3 transition-all duration-200 flex-none ${
                  active 
                    ? `${primaryText} ${activeBg} text-white shadow-md` 
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
      </nav>
    </>
  );
}
