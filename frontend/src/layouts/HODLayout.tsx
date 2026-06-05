import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutGrid, 
  Users, 
  Layers,
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  Search,
  CheckSquare,
  Building2,
  Trophy,
  User,
  History,
  Trash2,
  MessageSquare,
  BarChart3,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Sun,
  Moon
} from 'lucide-react';
import { checkSession } from '../utils/auth';
import { cn, formatDate } from "@/lib/utils";
import Swal from 'sweetalert2';
import { useTheme } from '../components/ThemeProvider';
import { AnimatePresence, motion } from 'framer-motion';

export default function HODLayout() {
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
          
          // Read cookie
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
  
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : { name: 'HOD User', role: 'Head of Department', role_id: 2, features: {} };
  });
  const [showOnboarding, setShowOnboarding] = useState(false);

  const fetchUserData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/profile.php`, {
        credentials: 'include'
      });
      const result = await response.json();
      if (result.status === 'success') {
        const updatedUser = {
          ...user,
          name: result.data.name,
          profile_pic: result.data.profile_pic
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));

        // Check completeness: name, designation, phone, profile_pic
        const p = result.data;
        const isIncomplete = !p.name || p.name.trim() === '' || 
                             p.name.trim() === 'HOD User' || p.name.trim() === 'HOD Member' || 
                             !p.designation || p.designation.trim() === '' || 
                             !p.phone || p.phone.trim() === '' || 
                             !p.profile_pic;

        if (isIncomplete && !location.pathname.includes('/profile')) {
          setShowOnboarding(true);
        } else {
          setShowOnboarding(false);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  useEffect(() => {
    fetchUserData();
    // Listen for custom profile update events
    const handleUpdate = () => fetchUserData();
    window.addEventListener('profile-updated', handleUpdate);
    return () => window.removeEventListener('profile-updated', handleUpdate);
  }, [location.pathname]);
  
  const navigation = [
    { name: 'Dashboard', icon: LayoutGrid, path: '/hod/dashboard' },
    { name: 'My Department', icon: Building2, path: '/hod/department' },
    { name: 'Faculty Members', icon: Users, path: '/hod/faculty' },
    { name: 'Faculty Groups', icon: Layers, path: '/hod/groups' },
    { name: 'Tasks & Projects', icon: CheckSquare, path: '/hod/tasks' },
    { name: 'Notifications', icon: Bell, path: '/hod/notifications' },
    { name: 'Leaderboard', icon: Trophy, path: '/hod/leaderboard' },
    { name: 'Reports', icon: BarChart3, path: '/hod/reports' },
    { name: 'Settings', icon: Settings, path: '/hod/settings' },
    { name: 'Feedback', icon: MessageSquare, path: '/hod/feedback' },
  ].filter(item => {
    if (item.name === 'Faculty Groups') {
      return user.features ? (user.features.task_group !== false) : true;
    }
    if (item.name === 'Leaderboard') {
      return user.features ? (user.features.leaderboard_faculty !== false || user.features.leaderboard_department !== false) : true;
    }
    if (item.name === 'Reports') {
      return user.features ? (
        user.features.reporting_personalized_faculty !== false ||
        user.features.reporting_department !== false ||
        user.features.reporting_institution !== false ||
        user.features.reporting_historical !== false ||
        user.features.reporting_performance_analytics !== false
      ) : true;
    }
    return true;
  });

  const initials = (user.name || 'User')
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'H';

  useEffect(() => {
    const validate = async () => {
      const sessionData = await checkSession();
      if (sessionData?.session?.maintenance) {
        navigate('/maintenance', { replace: true });
      }
      if (sessionData && sessionData.features) {
        const raw = localStorage.getItem('user');
        if (raw) {
          const userObj = JSON.parse(raw);
          userObj.features = sessionData.features;
          localStorage.setItem('user', JSON.stringify(userObj));
          setUser(userObj);
        }
      }
    };
    validate();
    const interval = setInterval(validate, 60000);
    return () => clearInterval(interval);
  }, [navigate]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadCount = useRef(0);
  const isFirstLoad = useRef(true);
  const [activeTask, setActiveTask] = useState<any>(null);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/notifications.php`, {
        credentials: 'include'
      });
      const result = await response.json();
      if (result.status === 'success') {
        setNotifications(result.data.notifications);
        
        // Handle popup notifications broadcasted from administrators
        const popups = (result.data.notifications || []).filter((n: any) => n.type === 'POPUP' && n.is_read == 0);
        if (popups.length > 0) {
          popups.forEach((popup: any) => {
            Swal.fire({
              title: popup.title || 'Broadcast Alert',
              text: popup.message,
              icon: 'info',
              confirmButtonText: 'Acknowledge',
              confirmButtonColor: '#7C3AED',
              customClass: {
                popup: 'rounded-3xl border border-[#7C3AED]/10 dark:border-violet-500/20 bg-white dark:bg-[#110A24] text-[#1E184B] dark:text-indigo-100 shadow-2xl',
                title: 'font-black text-xl text-[#1E184B] dark:text-indigo-100',
                confirmButton: 'rounded-xl px-10 py-3 font-black uppercase tracking-widest text-xs'
              }
            }).then(() => {
              toggleReadStatus(popup.id, false);
            });
          });
        }
        
        // Check notification settings and quiet hours
        let playSound = true;
        let showDesktopNotification = true;
        
        if (result.data.settings) {
          const settingsObj = result.data.settings;
          let notifSettings = settingsObj.notification_settings;
          if (typeof notifSettings === 'string') {
            try {
              notifSettings = JSON.parse(notifSettings);
            } catch (e) {}
          }
          
          if (notifSettings) {
            if (notifSettings.browser_alerts === false) {
              playSound = false;
              showDesktopNotification = false;
            }
          }
          
          // Quiet hours check
          const start = settingsObj.quiet_hours_start;
          const end = settingsObj.quiet_hours_end;
          if (start && end) {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            
            const [sH, sM] = start.split(':').map(Number);
            const [eH, eM] = end.split(':').map(Number);
            const startTime = sH * 60 + sM;
            const endTime = eH * 60 + eM;
            
            let isQuiet = false;
            if (startTime > endTime) {
              // Over midnight
              if (currentTime >= startTime || currentTime <= endTime) {
                isQuiet = true;
              }
            } else {
              if (currentTime >= startTime && currentTime <= endTime) {
                isQuiet = true;
              }
            }
            
            if (isQuiet) {
              playSound = false;
              showDesktopNotification = false;
              console.log('Suppressing notification audio/alert due to Active Quiet Hours settings.');
            }
          }
        }

        const isFirst = isFirstLoad.current;
        isFirstLoad.current = false;

        // Play sound and show desktop notification if unread count increases
        if (!isFirst && result.data.unread_count > prevUnreadCount.current) {
          if (playSound) {
            const audio = new Audio('/pop.mp3');
            audio.play().catch(e => console.log('Audio play failed:', e));
          }

          const latestNotif = result.data.notifications && result.data.notifications[0];
          if (latestNotif) {
            if (latestNotif.type === 'System Announcement') {
              Swal.fire({
                title: 'SYSTEM BROADCAST',
                html: `<div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left text-sm font-bold text-[#1E184B] shadow-inner">${latestNotif.message}</div>`,
                icon: 'info',
                background: '#ffffff',
                confirmButtonColor: '#1E184B',
                confirmButtonText: 'Acknowledge',
                customClass: {
                  popup: 'rounded-[2.5rem] border-4 border-[#1E184B] shadow-2xl',
                  title: 'font-black text-xl text-[#1E184B] tracking-widest',
                  confirmButton: 'rounded-xl px-10 py-4 font-black uppercase tracking-widest text-[10px]'
                },
                backdrop: `rgba(30, 24, 75, 0.4)`
              }).then(() => {
                toggleReadStatus(latestNotif.id, false);
              });
            } else {
              // Show premium brand-themed toast notification inside the app
              Swal.fire({
                title: 'FlowSync Alert',
                text: latestNotif.message,
                icon: 'info',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 5000,
                timerProgressBar: true,
                background: '#ffffff',
                color: '#1E184B',
                iconColor: '#7C3AED',
                customClass: {
                  popup: 'rounded-[20px] border border-[#7C3AED]/10 shadow-2xl animate-in slide-in-from-right-5 duration-300'
                }
              });
            }

            // Show native desktop notification if allowed and granted (HTTPS secure context required)
            if (showDesktopNotification && 'Notification' in window && Notification.permission === 'granted') {
              new Notification("FlowSync Alert", {
                body: latestNotif.message,
                icon: '/logo.png'
              });
            }
          }
        }
        
        setUnreadCount(result.data.unread_count);
        prevUnreadCount.current = result.data.unread_count;
        setActiveTask(result.data.active_task);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/notifications.php`, {
        method: 'PUT',
        credentials: 'include',
        body: JSON.stringify({ is_read: 1 })
      });
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const toggleReadStatus = async (id: number, currentRead: boolean) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/notifications.php`, {
        method: 'PUT',
        credentials: 'include',
        body: JSON.stringify({ id, is_read: currentRead ? 0 : 1 })
      });
      fetchNotifications();
    } catch (error) {
      console.error('Failed to toggle read status:', error);
    }
  };

  const deleteNotification = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/notifications.php?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      fetchNotifications();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const deleteAllNotifications = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/notifications.php?all=1`, {
        method: 'DELETE',
        credentials: 'include'
      });
      fetchNotifications();
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000); // Every 5s for real-time feel
    
    // Listen for custom refresh events from other components
    const handleRefresh = () => fetchNotifications();
    window.addEventListener('refresh-notifications', handleRefresh);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('refresh-notifications', handleRefresh);
    };
  }, []);

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

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'TASK_ACCEPTED': return { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50 border-emerald-100' };
      case 'TASK_SUBMITTED': return { icon: ArrowRight, color: 'text-blue-500 bg-blue-50 border-blue-100' };
      case 'TASK_DECLINED': return { icon: AlertCircle, color: 'text-rose-500 bg-rose-50 border-rose-100' };
      case 'TASK_UPDATED': return { icon: Clock, color: 'text-amber-500 bg-amber-50 border-amber-100' };
      case 'TASK_COMMENT': return { icon: MessageSquare, color: 'text-indigo-500 bg-indigo-50 border-indigo-100' };
      case 'EXTENSION_REQUESTED': return { icon: Clock, color: 'text-pink-500 bg-pink-50 border-pink-100' };
      default: return { icon: Bell, color: 'text-[#7C3AED] bg-[#7C3AED]/10 border-[#7C3AED]/20' };
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#090514] overflow-hidden font-sans">
      {/* Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 dark:bg-black/40 backdrop-blur-sm z-[150] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 bg-white/20 dark:bg-[#110A24]/10 backdrop-blur-md border-r border-[#7C3AED]/10 dark:border-[#8B5CF6]/10 z-[200] transition-transform duration-300 lg:translate-x-0 lg:static shadow-xl shadow-slate-900/5 dark:shadow-2xl dark:shadow-violet-950/20
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white dark:bg-[#1A1235] border border-[#7C3AED]/15 dark:border-[#8B5CF6]/20 rounded-xl flex items-center justify-center shadow-md overflow-hidden">
                <img src="/logo.png" alt="FlowSync" className="w-8 h-8 object-contain" />
              </div>
              <span className="text-xl font-black tracking-tight text-[#1E184B] dark:text-white font-display">
                FlowSync <span className="text-xs font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-widest block -mt-1 opacity-60">HOD Portal</span>
              </span>
            </div>
            <button className="lg:hidden p-2 text-[#1E184B]" onClick={() => setIsSidebarOpen(false)}>
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
                    flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all relative
                    ${isActive ? 'bg-[#7C3AED] dark:bg-[#8B5CF6] text-white shadow-lg shadow-[#7C3AED]/20 dark:shadow-[#8B5CF6]/20' : 'text-[#1E184B]/60 dark:text-white/60 hover:bg-[#7C3AED]/10 dark:hover:bg-[#8B5CF6]/10 hover:text-[#7C3AED] dark:hover:text-[#A78BFA]'}
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                  {item.name === 'Notifications' && unreadCount > 0 && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full shadow-lg shadow-rose-500/20">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="p-6 border-t border-[#7C3AED]/10 dark:border-[#8B5CF6]/10">
            <div className="p-4 rounded-2xl bg-[#7C3AED]/5 dark:bg-[#8B5CF6]/5 border border-[#7C3AED]/10 dark:border-[#8B5CF6]/15 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-[#1E184B]/40 dark:text-white/40 uppercase tracking-widest">Dept Status</span>
                <span className={cn("w-2 h-2 rounded-full", activeTask ? "bg-emerald-500 animate-pulse" : "bg-slate-300 dark:bg-slate-700")} />
              </div>
              {activeTask ? (
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-[#1E184B] dark:text-white truncate">{activeTask.title}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-tighter">{activeTask.status}</p>
                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Due: {formatDate(activeTask.deadline)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] font-bold text-[#1E184B]/60 dark:text-white/60 uppercase tracking-tighter">All systems nominal</p>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-20 bg-white/80 dark:bg-[#090514]/80 backdrop-blur-md border-b border-[#7C3AED]/10 dark:border-[#8B5CF6]/10 sticky top-0 z-[100] px-6 md:px-10 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              className="lg:hidden p-2.5 rounded-xl bg-white dark:bg-[#110A24] text-[#1E184B] dark:text-white shadow-sm border border-[#7C3AED]/10 dark:border-[#8B5CF6]/10"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:flex relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1E184B]/30 dark:text-white/30" />
              <input 
                type="text" 
                placeholder="Search department..." 
                className="pl-12 pr-6 py-2.5 bg-[#7C3AED]/5 dark:bg-[#8B5CF6]/5 border border-[#7C3AED]/10 dark:border-[#8B5CF6]/15 rounded-xl text-sm font-medium focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-[#8B5CF6] focus:ring-4 focus:ring-[#7C3AED]/5 focus:ring-[#8B5CF6]/5 transition-all w-80 text-[#1E184B] dark:text-white outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-[#7C3AED]/10 dark:border-[#8B5CF6]/20 text-[#1E184B]/40 dark:text-[#A78BFA] hover:text-[#7C3AED] dark:hover:text-[#8B5CF6] hover:border-[#7C3AED]/20 dark:hover:border-[#8B5CF6]/30 transition-all cursor-pointer bg-white dark:bg-[#110A24]"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 animate-pulse text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-indigo-600" />
              )}
            </button>

            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsProfileOpen(false);
                }}
                className="p-2.5 rounded-xl border border-[#7C3AED]/10 dark:border-[#8B5CF6]/20 text-[#1E184B]/40 dark:text-[#A78BFA] hover:text-[#7C3AED] dark:hover:text-[#8B5CF6] hover:border-[#7C3AED]/20 dark:hover:border-[#8B5CF6]/30 transition-all bg-white dark:bg-[#110A24] relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-[#110A24] animate-pulse"></span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="fixed inset-x-4 top-24 md:absolute md:inset-auto md:right-0 md:mt-3 md:w-80 bg-white rounded-3xl shadow-2xl border border-[#7C3AED]/10 overflow-hidden z-[110] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-5 bg-[#7C3AED]/5 border-b border-[#7C3AED]/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-[#1E184B] uppercase tracking-widest">Inbox</p>
                      <p className="text-[10px] text-[#7C3AED] font-bold">{unreadCount} Unread Alerts</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-[9px] font-black text-[#7C3AED] hover:underline uppercase tracking-widest">Mark All Read</button>
                      )}
                      {notifications.length > 0 && (
                        <button onClick={deleteAllNotifications} className="text-[9px] font-black text-rose-500 hover:underline uppercase tracking-widest flex items-center gap-1">
                          <Trash2 className="w-3 h-3" />
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-10 text-center">
                        <Bell className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                        <p className="text-xs font-bold text-slate-400">All caught up!</p>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const config = getTypeConfig(notif.type);
                        const Icon = config.icon;
                        return (
                          <div 
                            key={notif.id} 
                            onClick={(e) => { e.stopPropagation(); toggleReadStatus(notif.id, notif.is_read == 1); }}
                            className={cn(
                              "p-4 border-b border-[#7C3AED]/5 flex gap-3 hover:bg-slate-50 transition-colors cursor-pointer relative group",
                              notif.is_read != 1 && "bg-[#7C3AED]/[0.02]"
                            )}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-full shrink-0 flex items-center justify-center border shadow-sm",
                              notif.is_read == 1 ? "bg-slate-100 text-slate-400 border-slate-200" : config.color
                            )}>
                              <Icon className="w-4 h-4" />
                            </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-[11px] leading-relaxed line-clamp-2", notif.is_read == 1 ? "text-slate-500 font-medium" : "text-[#1E184B] font-bold")}>
                              {notif.message}
                            </p>
                            <p className="text-[9px] font-medium text-slate-400 mt-1">
                              {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-col items-center gap-2">
                            {notif.is_read != 1 && <div className="w-2 h-2 rounded-full bg-[#7C3AED] shadow-sm shadow-[#7C3AED]/40" />}
                            <button 
                              onClick={(e) => deleteNotification(e, notif.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-50 hover:text-rose-500 rounded-lg transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                    )}
                  </div>
                  <button 
                    onClick={() => navigate('/hod/notifications')}
                    className="w-full py-3 bg-[#7C3AED] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#6D28D9] transition-all"
                  >
                    View All Notifications
                  </button>
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-[#7C3AED]/10 mx-1" />

            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsProfileOpen(!isProfileOpen);
                }}
                className="flex items-center gap-3 p-0 sm:p-1.5 sm:pl-4 rounded-2xl bg-transparent sm:bg-[#7C3AED]/5 border-0 sm:border sm:border-[#7C3AED]/10 hover:border-[#7C3AED]/30 transition-all"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-black text-[#1E184B] tracking-tight">{user.name}</p>
                  <p className="text-[9px] font-black text-[#7C3AED] uppercase tracking-widest opacity-60">HOD</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-white overflow-hidden flex items-center justify-center font-bold text-sm">
                  {user.profile_pic ? (
                    <img src={`${import.meta.env.VITE_API_URL}/${user.profile_pic}`} className="w-full h-full object-cover" alt="" />
                  ) : (
                    initials
                  )}
                </div>
              </button>

              {isProfileOpen && (
                <div className="fixed inset-x-4 top-24 md:absolute md:inset-auto md:right-0 md:mt-3 md:w-64 bg-white rounded-2xl shadow-2xl border border-[#7C3AED]/10 overflow-hidden z-[110]">
                  <div className="p-5 bg-[#7C3AED]/5 border-b border-[#7C3AED]/10">
                    <p className="text-xs font-black text-[#1E184B] uppercase tracking-widest">{user.name}</p>
                    <p className="text-[10px] text-[#7C3AED] mt-1 font-bold">Department Authority</p>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={() => navigate('/hod/profile')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-[#1E184B] hover:bg-[#7C3AED]/5 transition-all"
                    >
                      <User className="w-4 h-4 text-[#7C3AED]" />
                      Mission Profile
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-[#1E184B] hover:bg-[#7C3AED]/5 transition-all">
                      <Settings className="w-4 h-4 text-[#7C3AED]" />
                      Portal Settings
                    </button>
                    <div className="h-px bg-[#7C3AED]/5 my-2" />
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 transition-all"
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

        <div ref={mainContentRef} className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-10 min-h-full flex flex-col">
            <div className="flex-1">
              <Outlet />
            </div>
            
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
                      <a className="text-[#7C3AED] dark:text-indigo-400 hover:text-[#6D28D9] dark:hover:text-indigo-300 transition-colors">Saurabh Upadhyay</a>
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

                {/* <div className="mt-2">
                  <NavLink 
                    to="/hod/feedback" 
                    className="text-[10px] font-black text-[#7C3AED]/50 hover:text-[#7C3AED] uppercase tracking-[0.2em] transition-all flex items-center gap-2 group"
                  >
                    <span className="h-px w-4 bg-[#7C3AED]/20 group-hover:w-6 transition-all" />
                    Submit Protocol Feedback
                    <span className="h-px w-4 bg-[#7C3AED]/20 group-hover:w-6 transition-all" />
                  </NavLink>
                </div> */}

                <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-2">
                  <span className="text-[9px] font-bold text-[#7C3AED]/40 dark:text-indigo-400/40 uppercase tracking-widest cursor-pointer hover:text-[#7C3AED] dark:hover:text-indigo-300 transition-colors">Privacy Protocol</span>
                  <span className="text-[9px] font-bold text-[#7C3AED]/40 dark:text-indigo-400/40 uppercase tracking-widest cursor-pointer hover:text-[#7C3AED] dark:hover:text-indigo-300 transition-colors">Compliance Standards</span>
                  <span className="text-[9px] font-bold text-[#7C3AED]/40 dark:text-indigo-400/40 uppercase tracking-widest cursor-pointer hover:text-[#7C3AED] dark:hover:text-indigo-300 transition-colors">System Support</span>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>
      
      {/* Onboarding Full-Screen Modal */}
      <AnimatePresence>
        {showOnboarding && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-[#0B061A]/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative bg-white dark:bg-[#110A24] w-full max-w-lg rounded-[3rem] p-8 md:p-10 shadow-2xl border border-[#7C3AED]/15 dark:border-violet-500/20 text-center overflow-hidden flex flex-col items-center gap-6"
            >
              <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-violet-500 via-purple-600 to-indigo-600" />
              
              {/* Premium Icon Badge */}
              <div className="w-20 h-20 bg-[#7C3AED]/10 dark:bg-violet-950/40 rounded-[2rem] flex items-center justify-center text-[#7C3AED] dark:text-violet-400 border border-[#7C3AED]/20 animate-bounce">
                <User className="w-10 h-10" />
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl font-black text-[#1E1B4B] dark:text-indigo-100 tracking-tight">
                  Authenticity & Professionalization
                </h2>
                <p className="text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest text-[9px] font-black leading-none">
                  Institutional Profile Protocol
                </p>
              </div>

              <p className="text-slate-500 dark:text-indigo-200/70 text-sm font-semibold leading-relaxed">
                To maintain transparency, security, and the highest standards of professional collaboration on FlowSync, you are required to complete your onboarding protocol. Please update your profile picture, designation, and contact phone line. Also pdate your password from  <b> flowsync </b> to something more secure to prevent unauthorized access to your account
              </p>

              <button
                onClick={() => {
                  setShowOnboarding(false);
                  navigate('/hod/profile');
                }}
                className="w-full py-4.5 bg-gradient-to-r from-[#7C3AED] to-purple-600 hover:from-purple-600 hover:to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-purple-500/20 active:scale-95 cursor-pointer mt-4"
              >
                Complete Profile Setup
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
