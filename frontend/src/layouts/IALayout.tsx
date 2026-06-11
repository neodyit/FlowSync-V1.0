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
  Building2, 
  Trophy, 
  MessageSquare, 
  Sun, 
  Moon,
  ChevronDown,
  Check
} from 'lucide-react';
import { checkSession } from '../utils/auth';
import { useTheme } from '../components/ThemeProvider';
import { AnimatePresence, motion } from 'framer-motion';

interface CustomSelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: { value: string | number; label: string }[];
  className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ 
  value, onChange, options, className 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value.toString() === value.toString());

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between gap-3 px-4 py-2.5 bg-white dark:bg-[#110A24] border rounded-2xl transition-all text-xs font-black text-[#1E1B4B] dark:text-[#A78BFA] cursor-pointer
          ${isOpen ? 'border-[#7C3AED] dark:border-violet-400 ring-4 ring-[#7C3AED]/5 dark:ring-violet-400/5' : 'border-[#7C3AED]/10 dark:border-violet-500/20 hover:border-[#7C3AED]/30 dark:hover:border-violet-400/40'}
        `}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : 'Select...'}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#7C3AED] dark:text-violet-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full right-0 w-56 mt-2 bg-white dark:bg-[#110A24] rounded-2xl border border-[#7C3AED]/10 dark:border-violet-500/20 shadow-2xl z-[150] overflow-hidden py-2"
          >
            <div className="max-h-60 overflow-y-auto">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full px-5 py-3 text-left text-xs font-black transition-all flex items-center justify-between cursor-pointer
                    ${opt.value.toString() === value.toString() ? 'bg-[#7C3AED] dark:bg-violet-600 text-white' : 'text-[#1E1B4B] dark:text-indigo-200 hover:bg-[#7C3AED]/5 dark:hover:bg-violet-950/40 hover:text-[#7C3AED] dark:hover:text-violet-300'}
                  `}
                >
                  {opt.label}
                  {opt.value.toString() === value.toString() && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function IALayout() {
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const mainContentRef = useRef<HTMLDivElement>(null);

  const [seasons, setSeasons] = useState<any[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);

  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/academic_seasons.php`, { credentials: 'include' });
        const data = await res.json();
        if (data.status === 'success') {
          setSeasons(data.data);
          
          const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
            return null;
          };
          const cookieVal = getCookie('active_season_id');
          if (cookieVal) {
            setActiveSeasonId(parseInt(cookieVal));
          } else {
            const defaultSeason = data.data.find((s: any) => s.is_default === 1);
            if (defaultSeason) {
              setActiveSeasonId(defaultSeason.id);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching seasons for switcher:', err);
      }
    };
    fetchSeasons();
  }, []);

  const handleSeasonChange = (id: number) => {
    document.cookie = `active_season_id=${id}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  };

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);
  
  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : { name: 'Institution Admin', role: 'INSTITUTION_ADMIN', role_id: 4 };
  
  const navigation = [
    { name: 'Dashboard', icon: LayoutGrid, path: '/ia/dashboard' },
    { name: 'Users', icon: Users, path: '/ia/users' },
    { name: 'Departments', icon: Building2, path: '/ia/departments' },
    { name: 'Tasks', icon: CheckSquare, path: '/ia/tasks' },
    { name: 'Notices', icon: Bell, path: '/ia/notices' },
    { name: 'Reports', icon: FileText, path: '/ia/reports' },
    { name: 'Activity Center', icon: History, path: '/ia/activity' },
    { name: 'Settings', icon: Settings, path: '/ia/settings' },
  ];

  const initials = (user.name || 'User')
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'IA';

  useEffect(() => {
    const validate = async () => {
      await checkSession();
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
                FlowSync <span className="text-xs text-[#7C3AED] dark:text-violet-400">IA</span>
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

          {/* Academic Season Switcher */}
          {seasons.length > 0 && activeSeasonId !== null && (
            <div className="px-6 py-4 border-t border-[#7C3AED]/10 dark:border-violet-500/10">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black text-[#1E184B]/40 dark:text-indigo-100/40 uppercase tracking-widest">Active Season</span>
                <CustomSelect
                  value={activeSeasonId}
                  onChange={(val) => handleSeasonChange(val as number)}
                  options={seasons.map(s => ({ value: s.id, label: s.name }))}
                  className="w-full"
                />
              </div>
            </div>
          )}
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
                placeholder="Search..." 
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

            {/* Profile Dropdown */}
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
                  <p className="text-[9px] font-black text-[#7C3AED] dark:text-violet-400 uppercase tracking-widest opacity-60">IA Admin</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-[#7C3AED]/20">
                  {initials}
                </div>
              </button>

              {isProfileOpen && (
                <div className="fixed inset-x-4 top-24 md:absolute md:inset-auto md:right-0 md:mt-3 md:w-64 bg-white/90 dark:bg-[#1A0F35]/90 backdrop-blur-3x1 rounded-2xl shadow-2xl border border-[#7C3AED]/10 dark:border-violet-500/20 overflow-hidden z-[110] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-5 bg-slate-50 dark:bg-violet-950/30 border-b border-[#7C3AED]/5 dark:border-violet-500/20">
                    <p className="text-xs font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest">{user.name}</p>
                    <p className="text-[10px] text-[#4C1D95] dark:text-violet-400 mt-1 font-bold">Institution Administrator</p>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={() => navigate('/ia/profile')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-[#1E184B] dark:text-indigo-200 hover:bg-[#7C3AED]/5 dark:hover:bg-violet-950/20 hover:text-[#7C3AED] dark:hover:text-violet-400 transition-all text-left"
                    >
                      <User className="w-4 h-4 text-[#7C3AED] dark:text-violet-400" />
                      Institutional Profile
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-violet-500/10 my-2" />
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/5 transition-all text-left"
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

            {/* Footer */}
            <footer className="mt-20 pt-12 pb-12 border-t border-[#7C3AED]/10 text-center">
              <div className="flex flex-col items-center gap-6">
                <div className="flex items-center gap-3 opacity-25 grayscale brightness-0 mb-2 dark:opacity-60 dark:grayscale-0 dark:brightness-100 text-[#1E184B] dark:text-indigo-300">
                  <LayoutGrid className="w-5 h-5" />
                  <span className="text-sm font-black tracking-[0.3em] uppercase">FlowSync</span>
                </div>
                <p className="text-[11px] font-black text-[#1E184B]/60 dark:text-indigo-200/60 uppercase tracking-[0.15em]">
                  Institution Admin Dashboard Protocol
                </p>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
