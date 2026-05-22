import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2, 
  MailOpen,
  Calendar,
  ArrowRight,
  User,
  ExternalLink,
  MessageSquare,
  Send,
  Star,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';
import Swal from 'sweetalert2';
import { cn, formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: number;
  type: string;
  message: string;
  task_id: number | null;
  task_title: string | null;
  trigger_user_name: string | null;
  is_read: boolean;
  created_at: string;
}

const HODNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Push Notification State
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [pushTitle, setPushTitle] = useState('');
  const [pushMessage, setPushMessage] = useState('');
  const [pushPoints, setPushPoints] = useState(1);
  const [pushTargetType, setPushTargetType] = useState('ALL');
  const [pushSelectedFaculties, setPushSelectedFaculties] = useState<number[]>([]);
  const [facultyList, setFacultyList] = useState<{id: number, name: string}[]>([]);
  const [isSubmittingPush, setIsSubmittingPush] = useState(false);

  const fetchFaculty = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/faculty.php`, { credentials: 'include' });
      const data = await response.json();
      if (data.status === 'success') setFacultyList(data.data);
    } catch (e) {}
  };

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
    fetchFaculty();
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

  const handleSendPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle || !pushMessage) {
      Swal.fire('Error', 'Title and message are required', 'error');
      return;
    }
    if (pushTargetType === 'SELECTED' && pushSelectedFaculties.length === 0) {
      Swal.fire('Error', 'Select at least one faculty member', 'error');
      return;
    }

    setIsSubmittingPush(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/push_notification.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: pushTitle,
          message: pushMessage,
          points: pushPoints,
          targetType: pushTargetType,
          selectedFaculties: pushSelectedFaculties
        })
      });
      const data = await response.json();
      if (data.status === 'success') {
        Swal.fire('Success!', data.message, 'success');
        setIsPushModalOpen(false);
        setPushTitle('');
        setPushMessage('');
        setPushPoints(1);
        setPushTargetType('ALL');
        setPushSelectedFaculties([]);
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      Swal.fire('Error', error.message || 'Failed to send push notification', 'error');
    } finally {
      setIsSubmittingPush(false);
    }
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'TASK_ACCEPTED': return { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' };
      case 'TASK_SUBMITTED': return { icon: ArrowRight, color: 'text-blue-500', bg: 'bg-blue-50' };
      case 'TASK_DECLINED': return { icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50' };
      case 'TASK_UPDATED': return { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' };
      case 'TASK_COMMENT': return { icon: MessageSquare, color: 'text-indigo-500', bg: 'bg-indigo-50' };
      case 'EXTENSION_REQUESTED': return { icon: Clock, color: 'text-pink-500', bg: 'bg-pink-50' };
      case 'System Announcement': return { icon: AlertCircle, color: 'text-purple-600', bg: 'bg-purple-100' };
      default: return { icon: Bell, color: 'text-slate-400', bg: 'bg-slate-50' };
    }
  };

  const handleTaskLink = (taskId: number) => {
    navigate(`/hod/tasks?taskId=${taskId}`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <SEO title="Notification Center" description="Stay updated with departmental activities and task progress." />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#1E184B] tracking-tight">Alert Center</h1>
          <p className="text-[#1E184B]/60 mt-1 font-bold flex items-center gap-2 text-sm">
            <Bell className="w-4 h-4 text-[#7C3AED]" />
            Real-time updates from your department.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsPushModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#1E184B] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#7C3AED] transition-all shadow-xl shadow-[#1E184B]/20"
          >
            <Send className="w-4 h-4" />
            New Push
          </button>
          {notifications.some(n => !n.is_read) && (
            <button 
              onClick={() => markAsRead()}
              className="flex items-center gap-2 px-6 py-3 bg-[#7C3AED]/5 text-[#7C3AED] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#7C3AED] hover:text-white transition-all border border-[#7C3AED]/10 shadow-sm"
            >
              <MailOpen className="w-4 h-4" />
              Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button 
              onClick={deleteAllNotifications}
              className="flex items-center gap-2 px-6 py-3 bg-rose-50 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all border border-rose-100 shadow-sm"
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
              <div key={i} className="h-24 bg-white rounded-3xl animate-pulse border border-[#7C3AED]/10" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] border border-[#7C3AED]/10 p-20 text-center shadow-sm">
            <Bell className="w-12 h-12 text-[#7C3AED]/20 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-[#1E184B]/30 uppercase tracking-widest">Zero Noise</h2>
            <p className="text-[#1E184B]/40 font-bold mt-2">Everything is quiet right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif, idx) => {
              const config = getTypeConfig(notif.type);
              const Icon = config.icon;
              return (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className={cn(
                    "group relative bg-white rounded-[2rem] border p-6 flex items-start gap-6 transition-all cursor-pointer overflow-hidden",
                    notif.is_read ? "border-slate-100 bg-slate-50/30" : "border-[#7C3AED]/10 shadow-xl shadow-[#7C3AED]/5"
                  )}
                >
                  {!notif.is_read && (
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#7C3AED]" />
                  )}

                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", config.bg)}>
                    <Icon className={cn("w-7 h-7", config.color)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(notif.created_at)} • {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {notif.trigger_user_name && (
                        <span className="text-[10px] font-black text-[#7C3AED] bg-[#7C3AED]/5 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          {notif.trigger_user_name}
                        </span>
                      )}
                    </div>
                    
                    <p className={cn(
                      "text-[15px] font-bold leading-relaxed mb-4",
                      notif.is_read ? "text-[#1E184B]/50" : "text-[#1E184B]"
                    )}>
                      {notif.message}
                    </p>

                    {notif.task_id && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTaskLink(notif.task_id!);
                        }}
                        className="inline-flex items-center gap-2 text-[10px] font-black text-[#7C3AED] uppercase tracking-widest hover:underline bg-white px-4 py-2 rounded-xl border border-[#7C3AED]/10 hover:border-[#7C3AED]/30 transition-all shadow-sm"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Go to Mission: {notif.task_title || 'View Details'}
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-4 shrink-0">
                    <button 
                      onClick={(e) => deleteNotification(e, notif.id)}
                      className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                      title="Remove notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {!notif.is_read && (
                      <div className="w-3 h-3 rounded-full bg-[#7C3AED] shadow-lg shadow-[#7C3AED]/40 animate-pulse" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isPushModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsPushModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-[#1E184B]">Push Notification</h2>
                  <p className="text-sm font-bold text-slate-400 mt-1">Broadcast an alert with reward points</p>
                </div>
                <button onClick={() => setIsPushModalOpen(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSendPush} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest">Notification Title</label>
                  <input
                    type="text"
                    required
                    value={pushTitle}
                    onChange={(e) => setPushTitle(e.target.value)}
                    placeholder="e.g. Urgent Department Meeting"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10 transition-all text-sm font-bold text-[#1E184B]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest">Details</label>
                  <textarea
                    required
                    rows={4}
                    value={pushMessage}
                    onChange={(e) => setPushMessage(e.target.value)}
                    placeholder="Provide the notification details..."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10 transition-all text-sm font-bold text-[#1E184B] resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest">Reward Points ({pushPoints})</label>
                    <input 
                      type="range" 
                      min="1" 
                      max="5" 
                      value={pushPoints} 
                      onChange={(e) => setPushPoints(parseInt(e.target.value))}
                      className="w-full accent-[#7C3AED]"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1">
                      <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest">Target Audience</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-[#1E184B]">
                        <input 
                          type="radio" 
                          checked={pushTargetType === 'ALL'} 
                          onChange={() => setPushTargetType('ALL')} 
                          className="text-[#7C3AED] focus:ring-[#7C3AED]"
                        />
                        All Faculties
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-[#1E184B]">
                        <input 
                          type="radio" 
                          checked={pushTargetType === 'SELECTED'} 
                          onChange={() => setPushTargetType('SELECTED')} 
                          className="text-[#7C3AED] focus:ring-[#7C3AED]"
                        />
                        Selected Only
                      </label>
                    </div>
                  </div>
                </div>

                {pushTargetType === 'SELECTED' && (
                  <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 max-h-48 overflow-y-auto custom-scrollbar">
                    {facultyList.map(faculty => (
                      <label key={faculty.id} className="flex items-center gap-3 cursor-pointer group">
                        <input 
                          type="checkbox"
                          checked={pushSelectedFaculties.includes(faculty.id)}
                          onChange={(e) => {
                            if (e.target.checked) setPushSelectedFaculties([...pushSelectedFaculties, faculty.id]);
                            else setPushSelectedFaculties(pushSelectedFaculties.filter(id => id !== faculty.id));
                          }}
                          className="w-4 h-4 rounded text-[#7C3AED] border-slate-300 focus:ring-[#7C3AED]"
                        />
                        <span className="text-sm font-bold text-[#1E184B] group-hover:text-[#7C3AED] transition-colors">{faculty.name}</span>
                      </label>
                    ))}
                    {facultyList.length === 0 && (
                      <p className="text-xs font-bold text-slate-400">No faculties found in your department.</p>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={isSubmittingPush}
                    className="px-8 py-4 bg-[#7C3AED] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#6D28D9] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmittingPush ? 'Sending...' : 'Send Push Notification'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HODNotifications;
