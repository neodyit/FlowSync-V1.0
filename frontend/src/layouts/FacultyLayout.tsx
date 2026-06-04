import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
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
  MessageSquare,
  Sun,
  Moon
} from 'lucide-react';
import { checkSession } from '../utils/auth';
import { cn, formatDate } from "@/lib/utils";
import Swal from 'sweetalert2';
import { useTheme } from '../components/ThemeProvider';

export default function FacultyLayout() {
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [lastPopupId, setLastPopupId] = useState<number | null>(null);
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
      const sessionData = await checkSession();
      if (sessionData?.session?.maintenance) {
        navigate('/maintenance', { replace: true });
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
              allowOutsideClick: false,
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
      if (latest.type === 'HOD_PUSH' && !latest.is_actioned) {
        setLastPopupId(latest.id);
        
        Swal.fire({
          title: latest.title || 'HOD NOTIFICATION',
          html: `
            <div class="text-left mt-4 mb-6">
              <p class="text-sm font-bold text-[#1E184B] mb-6">${latest.message}</p>
              ${latest.points > 0 ? `
              <div class="bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-2xl p-4 flex items-center justify-between mb-6">
                <div>
                  <p class="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest">Reward Available</p>
                  <p class="text-xs font-bold text-[#1E184B] mt-1">Claim your points for acknowledging.</p>
                </div>
                <div class="w-12 h-12 bg-[#7C3AED] rounded-full flex items-center justify-center text-white text-xl font-black shadow-lg shadow-[#7C3AED]/30">
                  +${latest.points}
                </div>
              </div>` : ''}
              
              ${latest.attachment_url ? `
                <div class="border-t border-slate-100 pt-6">
                  <p class="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest mb-3 flex items-center gap-2">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                    Attached File Preview
                  </p>
                  ${latest.attachment_url.match(/\.(jpeg|jpg|gif|png)$/i) 
                    ? `<img src="${import.meta.env.VITE_API_URL}${latest.attachment_url}" class="max-w-full max-h-[30vh] object-contain rounded-xl shadow-sm border border-slate-200 mx-auto" />` 
                    : latest.attachment_url.match(/\.pdf$/i)
                      ? `<iframe src="${import.meta.env.VITE_API_URL}${latest.attachment_url}" class="w-full h-[30vh] rounded-xl border border-slate-200"></iframe>`
                      : `<div class="p-4 bg-slate-50 border border-slate-200 rounded-xl w-full text-center">
                           <p class="text-xs font-bold text-slate-500">Preview not available.</p>
                         </div>`
                  }
                  <div class="text-center mt-4">
                    <a href="${import.meta.env.VITE_API_URL}/download.php?file=${encodeURIComponent(latest.attachment_url.replace(/^\//, ''))}" class="inline-flex items-center gap-2 text-[10px] font-black text-[#1E184B] uppercase tracking-widest hover:underline bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-sm">
                      <svg class="w-3.5 h-3.5 text-[#7C3AED]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                      Download Attachment
                    </a>
                  </div>
                </div>
              ` : ''}
            </div>
          `,
          icon: 'info',
          background: '#ffffff',
          showCancelButton: true,
          confirmButtonColor: '#7C3AED',
          cancelButtonColor: '#f1f5f9',
          confirmButtonText: 'Read & Claim Points',
          cancelButtonText: 'Dismiss for now',
          allowOutsideClick: false,
          customClass: {
            popup: 'rounded-[2.5rem] border border-[#7C3AED]/10 shadow-2xl',
            title: 'font-black text-xl text-[#1E184B]',
            confirmButton: 'rounded-xl px-8 py-3 font-black uppercase tracking-widest text-[10px]',
            cancelButton: 'rounded-xl px-8 py-3 font-black uppercase tracking-widest text-[10px] !bg-slate-100 !text-slate-500 hover:!bg-slate-200'
          }
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              const res = await fetch(`${import.meta.env.VITE_API_URL}/notifications.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ id: latest.id, claim_points: true })
              });
              const data = await res.json();
              if (data.status === 'success') {
                Swal.fire({
                  title: 'Points Claimed!',
                  text: data.message,
                  icon: 'success',
                  timer: 2000,
                  showConfirmButton: false,
                  customClass: {
                    popup: 'rounded-[2.5rem]'
                  }
                });
                fetchNotifications();
              }
            } catch (err) {}
          }
        });
      } else if (latest.message.includes('[Reminder]') || latest.message.includes('[Warning]')) {
        setLastPopupId(latest.id);
        const isWarning = latest.message.includes('[Warning]');
        
        Swal.fire({
          title: isWarning ? 'MISSION WARNING' : 'MISSION REMINDER',
          text: latest.message.replace(/\[.*?\]\s*/, ''),
          icon: isWarning ? 'error' : 'warning',
          background: '#ffffff',
          confirmButtonColor: isWarning ? '#f43f5e' : '#fbbf24',
          confirmButtonText: 'I Understand',
          allowOutsideClick: false,
          customClass: {
            popup: `rounded-[2.5rem] border-4 ${isWarning ? 'border-rose-500' : 'border-amber-400'} shadow-2xl`,
            title: `font-black text-xl ${isWarning ? 'text-rose-600' : 'text-amber-600'}`,
            confirmButton: 'rounded-xl px-10 py-4 font-black uppercase tracking-widest text-[10px]'
          },
          backdrop: `rgba(${isWarning ? '244, 63, 94, 0.2' : '251, 191, 36, 0.1'})`
        });
      } else if (latest.type === 'System Announcement') {
        setLastPopupId(latest.id);
        Swal.fire({
          title: 'SYSTEM BROADCAST',
          html: `<div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left text-sm font-bold text-[#1E184B] shadow-inner">${latest.message}</div>`,
          icon: 'info',
          background: '#ffffff',
          confirmButtonColor: '#1E184B',
          confirmButtonText: 'Acknowledge',
          allowOutsideClick: false,
          customClass: {
            popup: 'rounded-[2.5rem] border-4 border-[#1E184B] shadow-2xl',
            title: 'font-black text-xl text-[#1E184B] tracking-widest',
            confirmButton: 'rounded-xl px-10 py-4 font-black uppercase tracking-widest text-[10px]'
          },
          backdrop: `rgba(30, 24, 75, 0.4)`
        });
      }
    }
  }, [notifications, lastPopupId]);

  const checkDeadlines = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/faculty/my_tasks.php`, {
        credentials: 'include'
      });
      const result = await response.json();
      if (result.status === 'success') {
        const tasks = result.data;
        const now = new Date();
        const alertsQueue: any[] = [];

        tasks.forEach((task: any) => {
          if (['Completed', 'Submitted', 'Approved'].includes(task.status)) return;
          if (!task.deadline) return;

          const deadlineDate = new Date(task.deadline);
          const timeDiff = deadlineDate.getTime() - now.getTime();
          
          if (timeDiff < 0) {
            const storageKey = `deadline_missed_${task.id}`;
            if (!localStorage.getItem(storageKey)) {
              alertsQueue.push({ task, type: 'missed', storageKey });
            }
          } else if (timeDiff <= 24 * 60 * 60 * 1000) {
            const storageKey = `deadline_reminder_${task.id}`;
            if (!localStorage.getItem(storageKey)) {
              alertsQueue.push({
                task,
                type: 'reminder',
                storageKey,
                hoursRemaining: Math.max(1, Math.round(timeDiff / (1000 * 60 * 60)))
              });
            }
          }
        });

        if (alertsQueue.length > 0) {
          const showNextAlert = async (index: number) => {
            if (index >= alertsQueue.length) return;
            const alert = alertsQueue[index];
            const { task, type, storageKey, hoursRemaining } = alert;

            let title = '';
            let text = '';
            let confirmButtonColor = '';
            
            if (type === 'missed') {
              title = 'DEADLINE MISSED';
              text = `You have missed the deadline for mission: <strong>${task.title}</strong>.<br/><br/>Original Deadline: ${formatDate(task.deadline)}`;
              confirmButtonColor = '#f43f5e';
            } else {
              title = 'MISSION REMINDER';
              text = `Mission <strong>${task.title}</strong> is due in approx ${hoursRemaining} hours!<br/><br/>Deadline: ${formatDate(task.deadline)}`;
              confirmButtonColor = '#fbbf24';
            }

            const isWarning = type === 'missed';

            const resultPopup = await Swal.fire({
              title,
              html: text,
              icon: isWarning ? 'error' : 'warning',
              background: '#ffffff',
              confirmButtonColor,
              showCancelButton: true,
              cancelButtonText: 'Dismiss',
              confirmButtonText: 'Open Task',
              allowOutsideClick: false,
              customClass: {
                popup: `rounded-[2.5rem] border-4 ${isWarning ? 'border-rose-500' : 'border-amber-400'} shadow-2xl`,
                title: `font-black text-xl ${isWarning ? 'text-rose-600' : 'text-amber-600'}`,
                confirmButton: 'rounded-xl px-8 py-3 font-black uppercase tracking-widest text-[10px]',
                cancelButton: 'rounded-xl px-8 py-3 font-bold uppercase tracking-widest text-[10px] text-slate-500 bg-slate-100 hover:bg-slate-200 border-none'
              },
              backdrop: `rgba(${isWarning ? '244, 63, 94, 0.2' : '251, 191, 36, 0.1'})`
            });

            localStorage.setItem(storageKey, 'true');

            if (resultPopup.isConfirmed) {
              navigate(`/faculty/my-tasks?taskId=${task.id}`);
            } else {
              setTimeout(() => showNextAlert(index + 1), 300);
            }
          };

          showNextAlert(0);
        }
      }
    } catch (error) {
      console.error('Failed to check deadlines:', error);
    }
  };

  useEffect(() => {
    checkDeadlines();
  }, [location.pathname]);

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
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#0E0820] overflow-hidden font-sans">
      {/* Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[150] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 bg-white/20 dark:bg-[#110A24]/10 backdrop-blur-md border-r border-[#7C3AED]/10 dark:border-violet-500/10 z-[200] transition-transform duration-300 lg:translate-x-0 lg:static shadow-xl shadow-slate-900/5 dark:shadow-2xl dark:shadow-violet-950/20
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white border border-[#7C3AED]/15 rounded-xl flex items-center justify-center shadow-md overflow-hidden">
                <img src="/logo.png" alt="FlowSync" className="w-8 h-8 object-contain" />
              </div>
              <span className="text-xl font-black tracking-tight text-[#1E184B] dark:text-indigo-100 font-display">
                FlowSync <span className="text-xs font-bold text-[#7C3AED] dark:text-violet-400 uppercase tracking-widest block -mt-1 opacity-60">Faculty Portal</span>
              </span>
            </div>
            <button className="lg:hidden p-2 text-[#1E184B] dark:text-indigo-100" onClick={() => setIsSidebarOpen(false)}>
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
                    ${isActive ? 'bg-[#7C3AED] text-white shadow-lg dark:shadow-violet-950/20' : 'text-[#1E184B]/60 dark:text-violet-400/60 hover:bg-[#7C3AED]/10 dark:hover:bg-violet-950/30 hover:text-[#7C3AED] dark:hover:text-violet-400'}
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

          <div className="p-6 border-t border-[#7C3AED]/10 dark:border-violet-500/10">
            <div className="p-4 rounded-2xl bg-[#7C3AED]/5 dark:bg-violet-950/30 border border-[#7C3AED]/10 dark:border-violet-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-[#1E184B]/40 dark:text-violet-400/40 uppercase tracking-widest">Task Status</span>
                <span className={cn("w-2 h-2 rounded-full", activeTask ? "bg-[#7C3AED] animate-pulse" : "bg-slate-300")} />
              </div>
              {activeTask ? (
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-[#1E184B] dark:text-indigo-100 truncate">{activeTask.title}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-bold text-[#7C3AED] dark:text-violet-400 uppercase tracking-tighter">{activeTask.status}</p>
                    <p className="text-[9px] font-bold text-slate-400 dark:text-violet-400/40 uppercase tracking-tighter">Due: {formatDate(activeTask.deadline)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] font-bold text-[#1E184B]/60 dark:text-violet-400/40 uppercase tracking-tighter">No active missions</p>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-20 bg-white/80 dark:bg-[#0E0820]/80 backdrop-blur-md border-b border-[#7C3AED]/10 dark:border-violet-500/10 sticky top-0 z-[100] px-6 md:px-10 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              className="lg:hidden p-2.5 rounded-xl bg-white dark:bg-[#110A24] text-[#1E184B] dark:text-indigo-100 shadow-sm border border-[#7C3AED]/10 dark:border-violet-500/10"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:flex relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1E184B]/30 dark:text-violet-400/30" />
              <input 
                type="text" 
                placeholder="Search resources..." 
                className="pl-12 pr-6 py-2.5 bg-[#7C3AED]/5 dark:bg-violet-950/30 border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-xl text-sm font-medium focus:bg-white dark:focus:bg-[#150D2E] focus:border-[#7C3AED] dark:focus:border-violet-500 focus:ring-4 focus:ring-[#7C3AED]/5 dark:focus:ring-violet-500/5 transition-all w-80 text-[#1E184B] dark:text-indigo-100 outline-none"
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
                className="p-2.5 rounded-xl border border-[#7C3AED]/10 dark:border-violet-500/20 text-[#1E184B]/40 dark:text-violet-400/60 hover:text-[#7C3AED] dark:hover:text-violet-400 hover:border-[#7C3AED]/20 dark:hover:border-violet-500/40 transition-all bg-white dark:bg-[#110A24] relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-[#110A24] animate-pulse"></span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="fixed inset-x-4 top-24 md:absolute md:inset-auto md:right-0 md:mt-3 md:w-80 bg-white/99 dark:bg-[#1A0F35]/99 backdrop-blur-md rounded-3xl shadow-2xl border border-[#7C3AED]/10 dark:border-violet-500/20 overflow-hidden z-[110] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-5 bg-[#7C3AED]/5 dark:bg-violet-950/30 border-b border-[#7C3AED]/10 dark:border-violet-500/20 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest">Inbox</p>
                      <p className="text-[10px] text-[#7C3AED] dark:text-violet-400 font-bold">{unreadCount} Unread Alerts</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-[9px] font-black text-[#7C3AED] dark:text-violet-400 hover:underline uppercase tracking-widest">Mark All Read</button>
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
                        <Bell className="w-8 h-8 text-slate-200 dark:text-violet-400/20 mx-auto mb-3" />
                        <p className="text-xs font-bold text-slate-400 dark:text-violet-400/40">All caught up!</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                           key={notif.id} 
                           onClick={(e) => { e.stopPropagation(); toggleReadStatus(notif.id, notif.is_read == 1); }}
                           className={cn(
                             "p-4 border-b border-[#7C3AED]/5 dark:border-violet-500/5 flex gap-3 hover:bg-slate-50 dark:hover:bg-violet-950/30 transition-colors cursor-pointer relative group",
                             notif.is_read != 1 && "bg-[#7C3AED]/[0.02] dark:bg-violet-950/10"
                           )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-full shrink-0 flex items-center justify-center",
                            notif.is_read == 1 ? "bg-slate-100 dark:bg-[#150D2E] text-slate-400 dark:text-violet-400/40" : "bg-[#7C3AED]/10 dark:bg-violet-950/30 text-[#7C3AED] dark:text-violet-400"
                          )}>
                            <Bell className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-[11px] leading-relaxed line-clamp-2", notif.is_read == 1 ? "text-slate-500 dark:text-violet-400/50 font-medium" : "text-[#1E184B] dark:text-indigo-100 font-bold")}>
                              {notif.message}
                            </p>
                            <p className="text-[9px] font-medium text-slate-400 dark:text-violet-400/40 mt-1">
                              {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-col items-center gap-2">
                            {notif.is_read != 1 && <div className="w-2 h-2 rounded-full bg-[#7C3AED] dark:bg-violet-500 shadow-sm shadow-[#7C3AED]/40" />}
                            <button 
                              onClick={(e) => deleteNotification(e, notif.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg transition-all"
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
                    className="w-full py-3 bg-[#7C3AED] dark:bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#6D28D9] dark:hover:bg-violet-700 transition-all"
                  >
                    View All Notifications
                  </button>
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-[#7C3AED]/10 dark:bg-violet-500/10 mx-1" />

            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsProfileOpen(!isProfileOpen);
                }}
                className="flex items-center gap-3 p-0 sm:p-1.5 sm:pl-4 rounded-2xl bg-transparent sm:bg-[#7C3AED]/5 dark:sm:bg-violet-950/30 border-0 sm:border sm:border-[#7C3AED]/10 dark:sm:border-violet-500/20 hover:border-[#7C3AED]/30 dark:hover:border-violet-500/40 transition-all"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-black text-[#1E184B] dark:text-indigo-100 tracking-tight">{user.name}</p>
                  <p className="text-[9px] font-black text-[#7C3AED] dark:text-violet-400 uppercase tracking-widest opacity-60">Faculty</p>
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
                <div className="fixed inset-x-4 top-24 md:absolute md:inset-auto md:right-0 md:mt-3 md:w-64 bg-white dark:bg-[#1A0F35] rounded-2xl shadow-2xl border border-[#7C3AED]/10 dark:border-violet-500/20 overflow-hidden z-[110]">
                  <div className="p-5 bg-[#7C3AED]/5 dark:bg-violet-950/30 border-b border-[#7C3AED]/10 dark:border-violet-500/20">
                    <p className="text-xs font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest">{user.name}</p>
                    <p className="text-[10px] text-[#7C3AED] dark:text-violet-400 mt-1 font-bold">Academic Member</p>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={() => navigate('/faculty/profile')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-[#1E184B] dark:text-indigo-100 hover:bg-[#7C3AED]/5 dark:hover:bg-violet-950/30 transition-all"
                    >
                      <User className="w-4 h-4 text-[#7C3AED] dark:text-violet-400" />
                      Mission Profile
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-[#1E184B] dark:text-indigo-100 hover:bg-[#7C3AED]/5 dark:hover:bg-violet-950/30 transition-all">
                      <History className="w-4 h-4 text-[#7C3AED] dark:text-violet-400" />
                      Activity Log
                    </button>
                    <div className="h-px bg-[#7C3AED]/5 dark:bg-violet-500/10 my-2" />
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
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

        <div ref={mainContentRef} className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-10 min-h-full flex flex-col">
            <div className="flex-1">
              <Outlet />
            </div>
            
            <footer className="mt-20 pt-12 pb-12 border-t border-[#7C3AED]/10 text-center">
              <div className="flex flex-col items-center gap-6">
                {/* Branding Mark */}
                <div className="flex items-center gap-3 opacity-25 grayscale brightness-0 mb-2 dark:opacity-60 dark:grayscale-0 dark:brightness-100 text-[#1E184B] dark:text-indigo-300">
                  <LayoutGrid className="w-5 h-5" />
                  <span className="text-sm font-black tracking-[0.3em] uppercase">FlowSync</span>
                </div>
                
                {/* Credits Section */}
                <div className="space-y-3">
                  <p className="text-[11px] font-black text-[#1E184B]/60 dark:text-indigo-200/60 uppercase tracking-[0.15em]">
                    Made with <span className="text-rose-500 animate-pulse mx-1">❤️</span> by 
                    <span className="ml-1.5 space-x-1">
                      <a href="https://mayank.neodyit.in/" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] dark:text-indigo-400 hover:text-[#6D28D9] dark:hover:text-indigo-300 transition-colors">Mayank Tiwari</a>,
                      <a href="" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] dark:text-indigo-400 hover:text-[#6D28D9] dark:hover:text-indigo-300 transition-colors">Saurabh Upadhyay</a>
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

                {/* Feedback Action */}
                {/* <div className="mt-2">
                  <NavLink 
                    to="/faculty/feedback" 
                    className="text-[10px] font-black text-[#7C3AED]/50 hover:text-[#7C3AED] uppercase tracking-[0.2em] transition-all flex items-center gap-2 group"
                  >
                    <span className="h-px w-4 bg-[#7C3AED]/20 group-hover:w-6 transition-all" />
                    Submit Protocol Feedback
                    <span className="h-px w-4 bg-[#7C3AED]/20 group-hover:w-6 transition-all" />
                  </NavLink>
                </div> */}

                {/* Protocol Links */}
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
    </div>
  );
}
