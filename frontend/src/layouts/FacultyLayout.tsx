import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, 
  Building2, 
  CheckSquare, 
  ListTodo, 
  Bell, 
  Trophy, 
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  User,
  History,
  Trash2,
  MessageSquare
} from 'lucide-react';
import { checkSession } from '../utils/auth';
import { cn, formatDate } from "@/lib/utils";
import Swal from 'sweetalert2';

export default function FacultyLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [lastPopupId, setLastPopupId] = useState<number | null>(null);
  const navigate = useNavigate();
  
  // Get user from localStorage
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : { name: 'Faculty Member', role: 'Faculty', role_id: 3 };
  });

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
  }, []);
  
  const navigation = [
    { name: 'Dashboard', icon: LayoutGrid, path: '/faculty/dashboard' },
    { name: 'My Department', icon: Building2, path: '/faculty/department' },
    { name: 'Tasks & Projects', icon: CheckSquare, path: '/faculty/tasks' },
    { name: 'My Tasks', icon: ListTodo, path: '/faculty/my-tasks' },
    { name: 'Notifications', icon: Bell, path: '/faculty/notifications' },
    { name: 'Leaderboard', icon: Trophy, path: '/faculty/leaderboard' },
    { name: 'Settings', icon: Settings, path: '/faculty/settings' },
    { name: 'Feedback', icon: MessageSquare, path: '/faculty/feedback' },
  ];

  const initials = (user.name || 'User')
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'F';

  useEffect(() => {
    const validate = async () => {
      await checkSession();
    };
    validate();
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
            // Show premium brand-themed toast notification inside the app (perfect secure/insecure local HTTP fallback)
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

  useEffect(() => {
    // Check if the latest notification is a Reminder or Warning
    const latest = notifications[0];
    if (latest && !latest.is_read && latest.id !== lastPopupId) {
      if (latest.message.includes('[Reminder]') || latest.message.includes('[Warning]')) {
        setLastPopupId(latest.id);
        const isWarning = latest.message.includes('[Warning]');
        
        Swal.fire({
          title: isWarning ? 'MISSION WARNING' : 'MISSION REMINDER',
          text: latest.message.replace(/\[.*?\]\s*/, ''),
          icon: isWarning ? 'error' : 'warning',
          background: '#ffffff',
          confirmButtonColor: isWarning ? '#f43f5e' : '#fbbf24',
          confirmButtonText: 'I Understand',
          customClass: {
            popup: `rounded-[2.5rem] border-4 ${isWarning ? 'border-rose-500' : 'border-amber-400'} shadow-2xl`,
            title: `font-black text-xl ${isWarning ? 'text-rose-600' : 'text-amber-600'}`,
            confirmButton: 'rounded-xl px-10 py-4 font-black uppercase tracking-widest text-[10px]'
          },
          backdrop: `rgba(${isWarning ? '244, 63, 94, 0.2' : '251, 191, 36, 0.1'})`
        }).then(() => {
          toggleReadStatus(latest.id, false);
        });
      }
    }
  }, [notifications, lastPopupId]);

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
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      {/* Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[150] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 bg-white border-r border-[#7C3AED]/10 z-[200] transition-transform duration-300 lg:translate-x-0 lg:static
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
                FlowSync <span className="text-xs font-bold text-[#7C3AED] uppercase tracking-widest block -mt-1 opacity-60">Faculty Portal</span>
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
                    ${isActive ? 'bg-[#7C3AED] text-white shadow-lg' : 'text-[#1E184B]/60 hover:bg-[#7C3AED]/10 hover:text-[#7C3AED]'}
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

          <div className="p-6 border-t border-[#7C3AED]/10">
            <div className="p-4 rounded-2xl bg-[#7C3AED]/5 border border-[#7C3AED]/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-[#1E184B]/40 uppercase tracking-widest">Task Status</span>
                <span className={cn("w-2 h-2 rounded-full", activeTask ? "bg-[#7C3AED] animate-pulse" : "bg-slate-300")} />
              </div>
              {activeTask ? (
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-[#1E184B] truncate">{activeTask.title}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-bold text-[#7C3AED] uppercase tracking-tighter">{activeTask.status}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Due: {formatDate(activeTask.deadline)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] font-bold text-[#1E184B]/60 uppercase tracking-tighter">No active missions</p>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-[#7C3AED]/10 sticky top-0 z-[100] px-6 md:px-10 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              className="lg:hidden p-2.5 rounded-xl bg-white text-[#1E184B] shadow-sm border border-[#7C3AED]/10"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:flex relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1E184B]/30" />
              <input 
                type="text" 
                placeholder="Search resources..." 
                className="pl-12 pr-6 py-2.5 bg-[#7C3AED]/5 border border-[#7C3AED]/10 rounded-xl text-sm font-medium focus:bg-white focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/5 transition-all w-80 text-[#1E184B]"
              />
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsProfileOpen(false);
                }}
                className="p-2.5 rounded-xl border border-[#7C3AED]/10 text-[#1E184B]/40 hover:text-[#7C3AED] hover:border-[#7C3AED]/20 transition-all relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
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
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          onClick={(e) => { e.stopPropagation(); toggleReadStatus(notif.id, notif.is_read == 1); }}
                          className={cn(
                            "p-4 border-b border-[#7C3AED]/5 flex gap-3 hover:bg-slate-50 transition-colors cursor-pointer relative group",
                            notif.is_read != 1 && "bg-[#7C3AED]/[0.02]"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-full shrink-0 flex items-center justify-center",
                            notif.is_read == 1 ? "bg-slate-100 text-slate-400" : "bg-[#7C3AED]/10 text-[#7C3AED]"
                          )}>
                            <Bell className="w-4 h-4" />
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
                      ))
                    )}
                  </div>
                  <button 
                    onClick={() => navigate('/faculty/notifications')}
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
                className="flex items-center gap-3 p-1.5 pl-4 rounded-2xl bg-[#7C3AED]/5 border border-[#7C3AED]/10 hover:border-[#7C3AED]/30 transition-all"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-black text-[#1E184B] tracking-tight">{user.name}</p>
                  <p className="text-[9px] font-black text-[#7C3AED] uppercase tracking-widest opacity-60">Faculty</p>
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
                    <p className="text-[10px] text-[#7C3AED] mt-1 font-bold">Academic Member</p>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={() => navigate('/faculty/profile')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-[#1E184B] hover:bg-[#7C3AED]/5 transition-all"
                    >
                      <User className="w-4 h-4 text-[#7C3AED]" />
                      Mission Profile
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-[#1E184B] hover:bg-[#7C3AED]/5 transition-all">
                      <History className="w-4 h-4 text-[#7C3AED]" />
                      Activity Log
                    </button>
                    <div className="h-px bg-[#7C3AED]/5 my-2" />
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-10 min-h-full flex flex-col">
            <div className="flex-1">
              <Outlet />
            </div>
            
            <footer className="mt-20 pt-12 pb-12 border-t border-[#7C3AED]/10 text-center">
              <div className="flex flex-col items-center gap-6">
                {/* Branding Mark */}
                <div className="flex items-center gap-3 opacity-20 grayscale brightness-0 mb-2">
                  <LayoutGrid className="w-5 h-5" />
                  <span className="text-sm font-black tracking-[0.3em] uppercase text-[#1E184B]">FlowSync</span>
                </div>
                
                {/* Credits Section */}
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

                {/* Feedback Action */}
                <div className="mt-2">
                  <NavLink 
                    to="/faculty/feedback" 
                    className="text-[10px] font-black text-[#7C3AED]/50 hover:text-[#7C3AED] uppercase tracking-[0.2em] transition-all flex items-center gap-2 group"
                  >
                    <span className="h-px w-4 bg-[#7C3AED]/20 group-hover:w-6 transition-all" />
                    Submit Protocol Feedback
                    <span className="h-px w-4 bg-[#7C3AED]/20 group-hover:w-6 transition-all" />
                  </NavLink>
                </div>

                {/* Protocol Links */}
                <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-2">
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
