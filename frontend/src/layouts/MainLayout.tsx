import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutGrid, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  Search,
  CheckSquare,
  FileText,
  Calendar,
  User,
  History,
  ShieldCheck,
  Building2,
  Trophy,
  MessageSquare,
  Activity,
  Sun,
  Moon
} from 'lucide-react';
import { checkSession } from '../utils/auth';
import { useTheme } from '../components/ThemeProvider';
import { AnimatePresence, motion } from 'framer-motion';

export default function MainLayout() {
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);
  
  // Get user from localStorage with robust parsing
  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : { name: 'Admin', role: 'Super Admin', role_id: 1 };
  
  const navigation = [
    { name: 'Dashboard', icon: LayoutGrid, path: '/admin/dashboard' },
    { name: 'Institution Management', icon: Building2, path: '/admin/institution' },
    { name: 'Users', icon: Users, path: '/admin/users' },
    { name: 'Tasks', icon: CheckSquare, path: '/admin/tasks' },
    { name: 'Notifications', icon: Bell, path: '/admin/notifications' },
    { name: 'Leaderboard', icon: Trophy, path: '/admin/leaderboard' },
    { name: 'Audit Logs', icon: History, path: '/admin/audit' },
    { name: 'Feedbacks', icon: MessageSquare, path: '/admin/feedbacks' },
    { name: 'Engagement Tracker', icon: Activity, path: '/admin/engagement' },
    { name: 'System Controls', icon: Settings, path: '/admin/controls' },
  ];

  const initials = (user.name || 'User')
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  useEffect(() => {
    const validate = async () => {
      const sessionData = await checkSession();
      // Only logout if checkSession explicitly cleared auth or if we're sure it's invalid
      // If it's just a network error (sessionData === null), we stay on the page
    };
    validate();
    const interval = setInterval(validate, 60000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/logout.php`, {
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    }
    localStorage.removeItem('user');
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setIsProfileOpen(false);
      setIsNotificationsOpen(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="flex h-screen bg-[#EDE9FE] dark:bg-[#0E0820] overflow-hidden font-sans transition-colors duration-200">
      {/* Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[150] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 bg-[#F5F3FF]/10 dark:bg-[#110A24]/10 backdrop-blur-md border-r border-[#7C3AED]/10 dark:border-violet-500/10 z-[200] transition-transform duration-300 lg:translate-x-0 lg:static shadow-xl shadow-slate-900/5
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white dark:bg-[#110A24] border border-[#7C3AED]/15 dark:border-violet-500/20 rounded-xl flex items-center justify-center shadow-md overflow-hidden">
                <img src="/logo.png" alt="FlowSync" className="w-8 h-8 object-contain" />
              </div>
              <span className="text-xl font-black tracking-tight text-[#1E184B] dark:text-indigo-100 font-display">
                FlowSync
              </span>
            </div>
            <button className="lg:hidden p-2 text-[#4C1D95] dark:text-violet-400" onClick={() => setIsSidebarOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all
                    ${isActive ? 'bg-[#7C3AED] text-white shadow-lg' : 'text-[#4C1D95] dark:text-violet-400/80 hover:bg-[#7C3AED]/10 dark:hover:bg-violet-950/30 hover:text-[#7C3AED] dark:hover:text-violet-300'}
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Institutional Status */}
          <div className="p-6 border-t border-[#7C3AED]/10 dark:border-violet-500/10">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#1A0F35]/25 border border-[#7C3AED]/10 dark:border-violet-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-[#1E184B]/40 dark:text-indigo-100/40 uppercase tracking-widest">Core Engine</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-[#7C3AED] w-[94%]" />
              </div>
              <p className="text-[10px] font-bold text-[#1E184B]/60 dark:text-indigo-200/60 text-center uppercase tracking-tighter">Sync Integrity: 94%</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-20 bg-[#EDE9FE]/80 dark:bg-[#0E0820]/80 backdrop-blur-md border-b border-[#7C3AED]/10 dark:border-violet-500/10 sticky top-0 z-[100] px-6 md:px-10 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              className="lg:hidden p-2.5 rounded-xl bg-white dark:bg-[#110A24] text-[#1E184B] dark:text-indigo-100 shadow-sm border border-[#7C3AED]/10 dark:border-violet-500/10"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:flex relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4C1D95] dark:text-violet-400/40 opacity-30" />
              <input 
                type="text" 
                placeholder="Find records..." 
                className="pl-12 pr-6 py-2.5 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-xl text-sm font-medium focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all w-80 text-[#1E184B] dark:text-indigo-100 placeholder:text-[#1E184B]/20 dark:placeholder:text-indigo-100/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Theme Toggle Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleTheme();
              }}
              className="p-2.5 rounded-xl border border-[#7C3AED]/10 dark:border-violet-500/20 text-[#1E184B]/40 dark:text-violet-400/60 hover:text-[#7C3AED] dark:hover:text-violet-400 hover:border-[#7C3AED]/20 dark:hover:border-violet-500/40 transition-all cursor-pointer bg-white dark:bg-[#110A24]"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 animate-pulse text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-indigo-600" />
              )}
            </button>

            {/* Notifications Panel */}
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsProfileOpen(false);
                }}
                className={`p-2.5 rounded-xl transition-all relative border cursor-pointer z-50 bg-white dark:bg-[#110A24] ${isNotificationsOpen ? 'border-[#7C3AED] text-[#7C3AED] dark:border-violet-400 dark:text-violet-400' : 'border-[#7C3AED]/10 dark:border-violet-500/20 text-[#4C1D95] dark:text-violet-400/80 hover:border-[#7C3AED]/30 dark:hover:border-violet-500/40'}`}
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-[#7C3AED] dark:bg-violet-500 rounded-full border-2 border-[#EDE9FE] dark:border-[#110A24]"></span>
              </button>

              {isNotificationsOpen && (
                <div className="fixed inset-x-4 top-24 md:absolute md:inset-auto md:right-0 md:mt-3 md:w-80 bg-white/95 dark:bg-[#1A0F35]/95   rounded-3xl shadow-2xl border border-[#7C3AED]/10 dark:border-violet-500/20 overflow-hidden z-[110] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 bg-[#7C3AED]/5 dark:bg-violet-950/30 border-b border-[#7C3AED]/10 dark:border-violet-500/20 flex items-center justify-between">
                    <h4 className="text-xs font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest">Activity Feed</h4>
                    <span className="pill bg-[#7C3AED]/10 dark:bg-violet-500/20 text-[#7C3AED] dark:text-violet-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">3 Alerts</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-4 border-b border-[#7C3AED]/5 dark:border-violet-500/5 hover:bg-[#7C3AED]/5 dark:hover:bg-violet-950/30 transition-all cursor-pointer group">
                        <p className="text-xs font-bold text-[#1E184B] dark:text-indigo-100 group-hover:text-[#7C3AED] dark:group-hover:text-violet-400">System Protocol Update • v2.4</p>
                        <p className="text-[10px] text-[#4C1D95] dark:text-indigo-200/70 mt-1 opacity-70">Infrastructure core successfully synchronized.</p>
                        <p className="text-[9px] font-black text-[#7C3AED] dark:text-violet-400 mt-2 uppercase">Just now</p>
                      </div>
                    ))}
                  </div>
                  <button className="w-full py-3 bg-[#7C3AED]/10 dark:bg-violet-600 text-[10px] font-black text-[#7C3AED] dark:text-white uppercase tracking-widest hover:bg-[#7C3AED]/20 dark:hover:bg-violet-700 transition-all">
                    View Comprehensive Log
                  </button>
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-[#7C3AED]/10 dark:bg-violet-500/10 mx-1" />
            {/* User Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsProfileOpen(!isProfileOpen);
                  setIsNotificationsOpen(false);
                }}
                className="flex items-center justify-center sm:justify-start gap-3 w-[52px] h-[52px] sm:w-auto sm:h-auto p-1.5 sm:pl-4 rounded-2xl bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 hover:border-[#7C3AED]/30 dark:hover:border-violet-500/40 transition-all shadow-sm cursor-pointer z-50"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-black text-[#1E1B4B] dark:text-indigo-100 tracking-tight">{user.name}</p>
                  <p className="text-[9px] font-black text-[#7C3AED] dark:text-violet-400 uppercase tracking-widest opacity-60">{user.role}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-[#7C3AED]/20">
                  {initials}
                </div>
              </button>

              {isProfileOpen && (
                <div className="fixed inset-x-4 top-24 md:absolute md:inset-auto md:right-0 md:mt-3 md:w-64 bg-white/90 dark:bg-[#1A0F35]/90 backdrop-blur-3x1 rounded-2xl shadow-2xl border border-[#7C3AED]/10 dark:border-violet-500/20 overflow-hidden z-[110] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-5 bg-slate-50 dark:bg-violet-950/30 border-b border-[#7C3AED]/5 dark:border-violet-500/20">
                    <p className="text-xs font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest">{user.name}</p>
                    <p className="text-[10px] text-[#4C1D95] dark:text-violet-400 mt-1 font-bold">Authenticated User</p>
                  </div>
                  <div className="p-2">
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-[#1E184B] dark:text-indigo-200 hover:bg-[#7C3AED]/5 dark:hover:bg-violet-950/20 hover:text-[#7C3AED] dark:hover:text-violet-400 transition-all">
                      <User className="w-4 h-4 text-[#7C3AED] dark:text-violet-400" />
                      Institutional Profile
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-[#1E184B] dark:text-indigo-200 hover:bg-[#7C3AED]/5 dark:hover:bg-violet-950/20 hover:text-[#7C3AED] dark:hover:text-violet-400 transition-all">
                      <Settings className="w-4 h-4 text-[#7C3AED] dark:text-violet-400" />
                      Security Settings
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-[#1E184B] dark:text-indigo-200 hover:bg-[#7C3AED]/5 dark:hover:bg-violet-950/20 hover:text-[#7C3AED] dark:hover:text-violet-400 transition-all">
                      <History className="w-4 h-4 text-[#7C3AED] dark:text-violet-400" />
                      Audit History
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-violet-500/10 my-2" />
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/5 transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      Terminate Session
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div ref={mainContentRef} className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-10 min-h-full flex flex-col">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex-1"
            >
              <Outlet />
            </motion.div>

            {/* Footer Credit */}
            <footer className="mt-20 pt-12 pb-12 border-t border-[#7C3AED]/10 text-center">
              <div className="flex flex-col items-center gap-6">
                <div className="flex items-center gap-3 opacity-25 grayscale brightness-0 mb-2 dark:opacity-60 dark:grayscale-0 dark:brightness-100 text-[#1E184B] dark:text-indigo-300">
                  <LayoutGrid className="w-5 h-5" />
                  <span className="text-sm font-black tracking-[0.3em] uppercase">FlowSync</span>
                </div>
                
                <div className="space-y-3">
                  <p className="text-[11px] font-black text-[#1E184B]/60 dark:text-indigo-200/60 uppercase tracking-[0.15em]">
                    Made with <span className="text-rose-500 animate-pulse mx-1">❤️</span> by 
                    <span className="ml-1.5 space-x-1">
                      <a href="https://mayank.neodyit.in/" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] dark:text-indigo-400 hover:text-[#6D28D9] dark:hover:text-indigo-300 transition-colors">Mayank Tiwari</a>,
                      <a href="https://saurabhupadhyay.com" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] dark:text-indigo-400 hover:text-[#6D28D9] dark:hover:text-indigo-300 transition-colors">Saurabh Upadhyay</a>
                    </span>
                  </p>
                  
                  {/* <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mt-1 text-[10px] font-bold text-slate-400">
                    <p className="tracking-wide">
                      Created and Managed by <a href="https://neodyit.in" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:text-[#6D28D9] transition-colors font-black">Neody IT</a>
                    </p>
                    <span className="hidden sm:inline text-slate-300">|</span>
                    <p className="tracking-wide">
                      Powered by <a href="https://www.readynestcorp.com" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:text-[#6D28D9] transition-colors font-black">ReadyNest Corp.</a>
                    </p>
                  </div> */}
                </div>

                <div className="flex items-center gap-6 mt-2">
                  <span className="text-[9px] font-bold text-[#7C3AED]/40 dark:text-indigo-400/40 uppercase tracking-widest cursor-pointer hover:text-[#7C3AED] dark:hover:text-indigo-300 transition-colors">Privacy Protocol</span>
                  <span className="text-[9px] font-bold text-[#7C3AED]/40 dark:text-indigo-400/40 uppercase tracking-widest cursor-pointer hover:text-[#7C3AED] dark:hover:text-indigo-300 transition-colors">Compliance Standards</span>
                  <span className="text-[9px] font-bold text-[#7C3AED]/40 dark:text-indigo-400/40 uppercase tracking-widest cursor-pointer hover:text-[#7C3AED] dark:hover:text-indigo-300 transition-colors">System Support</span>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
