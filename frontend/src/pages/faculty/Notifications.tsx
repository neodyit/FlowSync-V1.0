import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2, 
  MailOpen,
  Calendar,
  ChevronRight,
  ArrowRight,
  User,
  ExternalLink,
  Loader2,
  Paperclip
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';
import { cn, formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { previewAttachment } from '@/utils/attachmentPreview';

interface Notification {
  id: number;
  type: string;
  message: string;
  task_id: number | null;
  task_title: string | null;
  trigger_user_name: string | null;
  is_read: boolean;
  created_at: string;
  attachment_url?: string | null;
}

const FacultyNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchNotifications = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/notifications.php`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        setNotifications(data.data.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id?: number) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/notifications.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id })
      });
      fetchNotifications();
    } catch (error) {
      console.error('Failed to update notification:', error);
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
      // Update global count
      window.dispatchEvent(new CustomEvent('refresh-notifications'));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const deleteAllNotifications = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/notifications.php?all=1`, {
        method: 'DELETE',
        credentials: 'include'
      });
      fetchNotifications();
      // Update global count
      window.dispatchEvent(new CustomEvent('refresh-notifications'));
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
    }
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED': return { icon: Bell, color: 'text-[#7C3AED] dark:text-violet-400', bg: 'bg-[#7C3AED]/5 dark:bg-violet-950/30' };
      case 'TASK_APPROVED': return { icon: CheckCircle2, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/20' };
      case 'TASK_REJECTED': return { icon: AlertCircle, color: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/20' };
      case 'REWORK_REQUIRED': return { icon: Clock, color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20' };
      case 'System Announcement': return { icon: AlertCircle, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-950/30' };
      default: return { icon: Bell, color: 'text-slate-400 dark:text-slate-500', bg: 'bg-slate-50 dark:bg-slate-900/30' };
    }
  };

  const handleTaskLink = (type: string, taskId: number) => {
    if (type === 'TASK_ASSIGNED') {
      navigate(`/faculty/tasks?taskId=${taskId}`);
    } else {
      navigate(`/faculty/my-tasks?taskId=${taskId}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <SEO title="Notification Center" description="Stay updated with latest task assignments and reviews." />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#1E184B] dark:text-indigo-100 tracking-tight">Alert Center</h1>
          <p className="text-[#1E184B]/60 dark:text-violet-400/60 mt-1 font-bold flex items-center gap-2 text-sm">
            <Bell className="w-4 h-4 text-[#7C3AED] dark:text-violet-400" />
            Stay informed about your departmental missions.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {notifications.some(n => !n.is_read) && (
            <button 
              onClick={() => markAsRead()}
              className="flex items-center gap-2 px-6 py-3 bg-[#7C3AED]/5 dark:bg-[#7C3AED]/10 text-[#7C3AED] dark:text-violet-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#7C3AED] dark:hover:bg-violet-600 hover:text-white dark:hover:text-white transition-all border border-[#7C3AED]/10 dark:border-violet-500/20 shadow-sm"
            >
              <MailOpen className="w-4 h-4" />
              Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button 
              onClick={deleteAllNotifications}
              className="flex items-center gap-2 px-6 py-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 dark:hover:bg-rose-600 hover:text-white dark:hover:text-white transition-all border border-rose-100 dark:border-rose-500/20 shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white dark:bg-[#1A0F35] rounded-3xl animate-pulse border border-[#7C3AED]/10 dark:border-violet-500/10" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white dark:bg-[#1A0F35] rounded-[2.5rem] border border-[#7C3AED]/10 dark:border-violet-500/15 p-20 text-center shadow-sm dark:shadow-violet-950/10">
            <Bell className="w-12 h-12 text-[#7C3AED]/20 dark:text-violet-500/20 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-[#1E184B]/30 dark:text-violet-400/30 uppercase tracking-widest">Peaceful Pulse</h2>
            <p className="text-[#1E184B]/40 dark:text-violet-400/50 font-bold mt-2">No new alerts at the moment.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif, idx) => {
              const config = getTypeConfig(notif.type);
              const Icon = config.icon;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className={cn(
                    "group relative bg-white dark:bg-[#1A0F35] rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 flex items-start gap-3 sm:gap-6 transition-all cursor-pointer overflow-hidden",
                    notif.is_read 
                      ? "border-slate-100 dark:border-violet-500/10 bg-slate-50/30 dark:bg-violet-950/5" 
                      : "border-[#7C3AED]/10 dark:border-violet-500/20 shadow-xl shadow-[#7C3AED]/5 dark:shadow-violet-950/10"
                  )}
                >
                  {!notif.is_read && (
                    <div className="absolute top-0 left-0 w-1 sm:w-1.5 h-full bg-[#7C3AED] dark:bg-violet-500" />
                  )}

                  <div className={cn("w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm", config.bg)}>
                    <Icon className={cn("w-5 h-5 sm:w-7 sm:h-7", config.color)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                      <span className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-violet-400/40 uppercase tracking-widest flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        {formatDate(notif.created_at)}
                      </span>
                      {notif.trigger_user_name && (
                        <span className="text-[9px] sm:text-[10px] font-black text-[#7C3AED] dark:text-violet-400 bg-[#7C3AED]/5 dark:bg-violet-950/30 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg flex items-center gap-1.5">
                          <User className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                          {notif.trigger_user_name}
                        </span>
                      )}
                    </div>
                    
                    <p className={cn(
                      "text-sm sm:text-[15px] font-bold leading-relaxed mb-3 sm:mb-4",
                      notif.is_read ? "text-[#1E184B]/50 dark:text-violet-400/50" : "text-[#1E184B] dark:text-indigo-100"
                    )}>
                      {notif.message}
                    </p>

                    <div className="flex flex-col gap-2 items-start">
                      {notif.task_id && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTaskLink(notif.type, notif.task_id!);
                          }}
                          className="inline-flex items-center gap-2 text-[9px] sm:text-[10px] font-black text-[#7C3AED] dark:text-violet-400 uppercase tracking-widest hover:underline bg-white dark:bg-[#110A24] px-3.5 py-2 rounded-xl border border-[#7C3AED]/10 dark:border-violet-500/20 hover:border-[#7C3AED]/30 dark:hover:border-violet-500/50 transition-all shadow-sm max-w-full text-left break-words leading-normal"
                        >
                          <ExternalLink className="w-3 sm:w-3.5 h-3 sm:h-3.5 shrink-0" />
                          <span>{notif.type === 'TASK_ASSIGNED' ? 'Go to Tasks' : 'Go to My Tasks'}: {notif.task_title || 'View Progress'}</span>
                        </button>
                      )}
                      
                      {notif.attachment_url && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            previewAttachment(notif.attachment_url!);
                          }}
                          className="inline-flex items-center gap-2 text-[9px] sm:text-[10px] font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest hover:underline bg-slate-50 dark:bg-[#110A24] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-violet-500/20 hover:border-slate-300 dark:hover:border-violet-500/40 transition-all shadow-sm"
                        >
                          <Paperclip className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-[#7C3AED] dark:text-violet-400 shrink-0" />
                          View Attachment
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 sm:gap-4 shrink-0">
                    <button 
                      onClick={(e) => deleteNotification(e, notif.id)}
                      className="p-2 bg-slate-50 dark:bg-[#110A24] text-slate-400 dark:text-violet-400/50 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-500 dark:hover:text-rose-400 transition-all opacity-100 sm:opacity-0 group-hover:opacity-100"
                      title="Remove notification"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    {!notif.is_read && (
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#7C3AED] dark:bg-[#7C3AED] shadow-lg shadow-[#7C3AED]/40 dark:shadow-[#7C3AED]/65 animate-pulse" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyNotifications;
