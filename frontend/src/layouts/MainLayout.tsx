import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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
  MessageSquare
} from 'lucide-react';
import { checkSession } from '../utils/auth';

export default function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const navigate = useNavigate();
  
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
    <div className="flex h-screen bg-[#EDE9FE] overflow-hidden font-sans">
      {/* Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[150] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 bg-[#F5F3FF] border-r border-[#7C3AED]/10 z-[200] transition-transform duration-300 lg:translate-x-0 lg:static
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg shadow-[#7C3AED]/20 overflow-hidden">
                <img src="/logo.png" alt="FlowSync" className="w-6 h-6 object-contain" />
              </div>
              <span className="text-xl font-black tracking-tight text-[#1E184B] font-display">
                FlowSync
              </span>
            </div>
            <button className="lg:hidden p-2 text-[#4C1D95]" onClick={() => setIsSidebarOpen(false)}>
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
                    ${isActive ? 'bg-[#7C3AED] text-white shadow-lg' : 'text-[#4C1D95] hover:bg-[#7C3AED]/10 hover:text-[#7C3AED]'}
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Institutional Status */}
          <div className="p-6 border-t border-[#7C3AED]/10">
            <div className="p-4 rounded-2xl bg-white border border-[#7C3AED]/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-[#1E184B]/40 uppercase tracking-widest">Core Engine</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#7C3AED] w-[94%]" />
              </div>
              <p className="text-[10px] font-bold text-[#1E184B]/60 text-center uppercase tracking-tighter">Sync Integrity: 94%</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-20 bg-[#EDE9FE] border-b border-[#7C3AED]/10 sticky top-0 z-[100] px-6 md:px-10 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              className="lg:hidden p-2.5 rounded-xl bg-white text-[#1E184B] shadow-sm border border-[#7C3AED]/10"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:flex relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4C1D95] opacity-30" />
              <input 
                type="text" 
                placeholder="Find records..." 
                className="pl-12 pr-6 py-2.5 bg-white border border-[#7C3AED]/10 rounded-xl text-sm font-medium focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/5 transition-all w-80 text-[#1E184B] placeholder:text-[#1E184B]/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Notifications Panel */}
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsProfileOpen(false);
                }}
                className={`p-2.5 rounded-xl transition-all relative border bg-white cursor-pointer z-50 ${isNotificationsOpen ? 'border-[#7C3AED] text-[#7C3AED]' : 'border-[#7C3AED]/10 text-[#4C1D95] hover:border-[#7C3AED]/30'}`}
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-[#7C3AED] rounded-full border-2 border-[#EDE9FE]"></span>
              </button>

              {isNotificationsOpen && (
                <div className="fixed inset-x-4 top-24 md:absolute md:inset-auto md:right-0 md:mt-3 md:w-80 bg-white rounded-2xl shadow-2xl border border-[#7C3AED]/10 overflow-hidden z-[110]">
                  <div className="p-4 bg-slate-50 border-b border-[#7C3AED]/5 flex items-center justify-between">
                    <h4 className="text-xs font-black text-[#1E184B] uppercase tracking-widest">Activity Feed</h4>
                    <span className="pill bg-[#7C3AED]/10 text-[#7C3AED]">3 Alerts</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-all cursor-pointer group">
                        <p className="text-xs font-bold text-[#1E184B] group-hover:text-[#7C3AED]">System Protocol Update • v2.4</p>
                        <p className="text-[10px] text-[#4C1D95] mt-1 opacity-70">Infrastructure core successfully synchronized.</p>
                        <p className="text-[9px] font-black text-[#7C3AED] mt-2 uppercase">Just now</p>
                      </div>
                    ))}
                  </div>
                  <button className="w-full py-3 bg-slate-50 text-[10px] font-black text-[#7C3AED] uppercase tracking-widest hover:bg-slate-100 transition-all">
                    View Comprehensive Log
                  </button>
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-[#7C3AED]/10 mx-1" />

            {/* User Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsProfileOpen(!isProfileOpen);
                  setIsNotificationsOpen(false);
                }}
                className="flex items-center gap-3 p-1.5 pl-4 rounded-2xl bg-white border border-[#7C3AED]/10 hover:border-[#7C3AED]/30 transition-all shadow-sm cursor-pointer z-50"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-black text-[#1E184B] tracking-tight">{user.name}</p>
                  <p className="text-[9px] font-black text-[#7C3AED] uppercase tracking-widest opacity-60">{user.role}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-[#7C3AED]/20">
                  {initials}
                </div>
              </button>

              {isProfileOpen && (
                <div className="fixed inset-x-4 top-24 md:absolute md:inset-auto md:right-0 md:mt-3 md:w-64 bg-white rounded-2xl shadow-2xl border border-[#7C3AED]/10 overflow-hidden z-[110] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-5 bg-slate-50 border-b border-[#7C3AED]/5">
                    <p className="text-xs font-black text-[#1E184B] uppercase tracking-widest">{user.name}</p>
                    <p className="text-[10px] text-[#4C1D95] mt-1 font-bold">Authenticated User</p>
                  </div>
                  <div className="p-2">
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-[#1E184B] hover:bg-[#7C3AED]/5 hover:text-[#7C3AED] transition-all">
                      <User className="w-4 h-4" />
                      Institutional Profile
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-[#1E184B] hover:bg-[#7C3AED]/5 hover:text-[#7C3AED] transition-all">
                      <Settings className="w-4 h-4" />
                      Security Settings
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-[#1E184B] hover:bg-[#7C3AED]/5 hover:text-[#7C3AED] transition-all">
                      <History className="w-4 h-4" />
                      Audit History
                    </button>
                    <div className="h-px bg-slate-100 my-2" />
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
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-10 min-h-full flex flex-col">
            <div className="flex-1">
              <Outlet />
            </div>

            {/* Footer Credit */}
            <footer className="mt-20 pt-12 pb-12 border-t border-[#7C3AED]/10 text-center">
              <div className="flex flex-col items-center gap-6">
                <div className="flex items-center gap-3 opacity-20 grayscale brightness-0 mb-2">
                  <LayoutGrid className="w-5 h-5" />
                  <span className="text-sm font-black tracking-[0.3em] uppercase text-[#1E184B]">FlowSync</span>
                </div>
                
                <div className="space-y-3">
                  <p className="text-[11px] font-black text-[#1E184B]/60 uppercase tracking-[0.15em]">
                    Made with <span className="text-rose-500 animate-pulse mx-1">❤️</span> by 
                    <span className="ml-1.5 space-x-1">
                      <a href="https://mayank.neodyit.in/" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:text-[#6D28D9] transition-colors">Mayank Tiwari</a>,
                      <a href="https://saurabhupadhyay.com" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:text-[#6D28D9] transition-colors">Saurabh Upadhyay</a>
                    </span>
                  </p>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mt-1 text-[10px] font-bold text-slate-400">
                    <p className="tracking-wide">
                      Created and Managed by <a href="https://neodyit.in" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:text-[#6D28D9] transition-colors font-black">Neody IT</a>
                    </p>
                    <span className="hidden sm:inline text-slate-300">|</span>
                    <p className="tracking-wide">
                      Powered by <a href="https://www.readynestcorp.com" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:text-[#6D28D9] transition-colors font-black">ReadyNest Corp.</a>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 mt-2">
                  <span className="text-[9px] font-bold text-[#7C3AED]/40 uppercase tracking-widest cursor-pointer hover:text-[#7C3AED] transition-colors">Privacy Protocol</span>
                  <span className="text-[9px] font-bold text-[#7C3AED]/40 uppercase tracking-widest cursor-pointer hover:text-[#7C3AED] transition-colors">Compliance Standards</span>
                  <span className="text-[9px] font-bold text-[#7C3AED]/40 uppercase tracking-widest cursor-pointer hover:text-[#7C3AED] transition-colors">System Support</span>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
