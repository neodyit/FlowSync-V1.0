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
  X,
  Paperclip,
  History,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';
import Swal from 'sweetalert2';
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
}

interface PushNoticeHistory {
  id: number;
  title: string;
  message: string;
  points: number;
  attachment_url: string | null;
  target_type: string;
  created_at: string;
  recipients: { id: number; name: string; is_read: number }[];
  read_count: number;
  total_count: number;
}

const HODNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Push Notification State
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [pushTitle, setPushTitle] = useState('');
  const [pushMessage, setPushMessage] = useState('');
  const [pushPoints, setPushPoints] = useState(0);
  const [pushTargetType, setPushTargetType] = useState('ALL');
  const [pushSelectedFaculties, setPushSelectedFaculties] = useState<number[]>([]);
  const [pushAttachment, setPushAttachment] = useState<File | null>(null);
  const [facultyList, setFacultyList] = useState<{id: number, name: string}[]>([]);
  const [isSubmittingPush, setIsSubmittingPush] = useState(false);
  
  // History State
  const [pushHistory, setPushHistory] = useState<PushNoticeHistory[]>([]);
  const [expandedNoticeId, setExpandedNoticeId] = useState<number | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'alerts' | 'history'>('alerts');

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

  const fetchPushHistory = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/get_push_notices.php`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        setPushHistory(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch push history:', error);
    }
  };

  useEffect(() => {
    fetchFaculty();
    fetchNotifications();
    fetchPushHistory();
    const interval = setInterval(() => {
      fetchNotifications(true);
      fetchPushHistory();
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
      const formData = new FormData();
      formData.append('title', pushTitle);
      formData.append('message', pushMessage);
      formData.append('points', pushPoints.toString());
      formData.append('targetType', pushTargetType);
      if (pushTargetType === 'SELECTED') {
        formData.append('selectedFaculties', JSON.stringify(pushSelectedFaculties));
      }
      if (pushAttachment) {
        formData.append('attachment', pushAttachment);
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/push_notification.php`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      const data = await response.json();
      if (data.status === 'success') {
        Swal.fire('Success!', data.message, 'success');
        setIsPushModalOpen(false);
        setPushTitle('');
        setPushMessage('');
        setPushPoints(0);
        setPushTargetType('ALL');
        setPushSelectedFaculties([]);
        setPushAttachment(null);
        fetchPushHistory();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      Swal.fire('Error', error.message || 'Failed to send push notification', 'error');
    } finally {
      setIsSubmittingPush(false);
    }
  };

  const handleResend = async (noticeId: number, pendingUsers: {id: number}[]) => {
    try {
      const userIds = pendingUsers.map(u => u.id);
      if (userIds.length === 0) return;
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/resend_push_notice.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ push_notice_id: noticeId, user_ids: userIds })
      });
      const data = await response.json();
      if (data.status === 'success') {
        Swal.fire('Success', 'Pending faculties have been pinged.', 'success');
        fetchPushHistory();
      } else {
        throw new Error(data.message);
      }
    } catch (e: any) {
      Swal.fire('Error', e.message, 'error');
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
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pb-20 px-3 md:px-0">
      <SEO title="Notification Center" description="Stay updated with departmental activities and task progress." />
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-[#1E184B] tracking-tight">Notification Center</h1>
          <p className="text-[#1E184B]/60 mt-1 font-bold flex items-center gap-2 text-xs sm:text-sm">
            <Bell className="w-4 h-4 text-[#7C3AED]" />
            Manage alerts and push notices.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <button 
            onClick={() => setIsPushModalOpen(true)}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-[#1E184B] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#7C3AED] transition-all shadow-xl shadow-[#1E184B]/20 whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
            New Push
          </button>
          {notifications.some(n => !n.is_read) && (
            <button 
              onClick={() => markAsRead()}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-[#7C3AED]/5 text-[#7C3AED] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#7C3AED] hover:text-white transition-all border border-[#7C3AED]/10 shadow-sm whitespace-nowrap"
            >
              <MailOpen className="w-4 h-4" />
              Mark All
            </button>
          )}
          {notifications.length > 0 && (
            <button 
              onClick={deleteAllNotifications}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-rose-50 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all border border-rose-100 shadow-sm whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 sm:gap-6 border-b border-slate-200 px-1">
        <button 
          onClick={() => setActiveTab('alerts')}
          className={cn(
            "pb-3 text-xs sm:text-sm font-black uppercase tracking-widest transition-all",
            activeTab === 'alerts' 
              ? "text-[#7C3AED] border-b-2 border-[#7C3AED]" 
              : "text-slate-400 hover:text-slate-600 border-b-2 border-transparent"
          )}
        >
          Alert Center
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={cn(
            "pb-3 text-xs sm:text-sm font-black uppercase tracking-widest transition-all",
            activeTab === 'history' 
              ? "text-[#7C3AED] border-b-2 border-[#7C3AED]" 
              : "text-slate-400 hover:text-slate-600 border-b-2 border-transparent"
          )}
        >
          Push Notice History
        </button>
      </div>

      {activeTab === 'alerts' && (
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
                    "group relative bg-white rounded-[2rem] border p-4 sm:p-6 flex items-start gap-3 sm:gap-6 transition-all cursor-pointer overflow-hidden",
                    notif.is_read ? "border-slate-100 bg-slate-50/30" : "border-[#7C3AED]/10 shadow-xl shadow-[#7C3AED]/5"
                  )}
                >
                  {!notif.is_read && (
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#7C3AED]" />
                  )}

                  <div className={cn("w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm", config.bg)}>
                    <Icon className={cn("w-5 h-5 sm:w-7 sm:h-7", config.color)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(notif.created_at)}
                      </span>
                      {notif.trigger_user_name && (
                        <span className="text-[10px] font-black text-[#7C3AED] bg-[#7C3AED]/5 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          {notif.trigger_user_name}
                        </span>
                      )}
                    </div>
                    
                    <p className={cn(
                      "text-sm sm:text-[15px] font-bold leading-relaxed mb-4",
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
                        className="inline-flex items-center gap-2 text-[10px] font-black text-[#7C3AED] uppercase tracking-widest hover:underline bg-white px-3 sm:px-4 py-2 rounded-xl border border-[#7C3AED]/10 hover:border-[#7C3AED]/30 transition-all shadow-sm max-w-full truncate"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Go to Mission: {notif.task_title || 'View Details'}
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-4 shrink-0">
                    <button 
                      onClick={(e) => deleteNotification(e, notif.id)}
                      className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
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
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {pushHistory.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
            {pushHistory.map((notice) => {
              const isExpanded = expandedNoticeId === notice.id;
              const pendingUsers = notice.recipients.filter(r => !r.is_read);
              const readUsers = notice.recipients.filter(r => r.is_read);
              
              return (
                <div key={notice.id} className="bg-white rounded-[2rem] border border-[#7C3AED]/10 p-4 sm:p-6 shadow-sm overflow-hidden">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(notice.created_at)}
                        </span>
                        {notice.attachment_url && (
                          <button onClick={() => previewAttachment(notice.attachment_url!)} className="text-[10px] font-black text-[#7C3AED] bg-[#7C3AED]/5 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-[#7C3AED]/10 transition-colors">
                            <Paperclip className="w-3 h-3" />
                            Attachment
                          </button>
                        )}
                        {notice.points > 0 && (
                          <span className="text-[10px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {notice.points} pts
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-[#1E184B]">{notice.title}</h3>
                      <p className="text-sm text-slate-500 truncate mt-1">{notice.message}</p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-bold text-[#1E184B]">{notice.read_count} / {notice.total_count} Read</p>
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 transition-all" 
                            style={{ width: `${notice.total_count > 0 ? (notice.read_count / notice.total_count) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => setExpandedNoticeId(isExpanded ? null : notice.id)}
                        className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 hover:text-[#1E184B] transition-all"
                      >
                        <ArrowRight className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-90")} />
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-6 pt-6 border-t border-slate-100"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4" />
                              Read ({readUsers.length})
                            </h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                              {readUsers.map(u => (
                                <div key={u.id} className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  {u.name}
                                </div>
                              ))}
                              {readUsers.length === 0 && <p className="text-xs text-slate-400">None yet.</p>}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Pending ({pendingUsers.length})
                              </h4>
                              {pendingUsers.length > 0 && (
                                <button 
                                  onClick={() => handleResend(notice.id, pendingUsers)}
                                  className="text-[10px] font-black text-[#7C3AED] uppercase flex items-center gap-1 hover:underline"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Ping Pending
                                </button>
                              )}
                            </div>
                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                              {pendingUsers.map(u => (
                                <div key={u.id} className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  {u.name}
                                </div>
                              ))}
                              {pendingUsers.length === 0 && <p className="text-xs text-slate-400">All users have read.</p>}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-[#7C3AED]/10 p-20 text-center shadow-sm">
              <History className="w-12 h-12 text-[#7C3AED]/20 mx-auto mb-4" />
              <h2 className="text-2xl font-black text-[#1E184B]/30 uppercase tracking-widest">No History</h2>
              <p className="text-[#1E184B]/40 font-bold mt-2">You haven't sent any push notices yet.</p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {isPushModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-2xl font-black text-[#1E184B]">Push Notice</h2>
                  <p className="text-sm font-bold text-slate-400 mt-1">Broadcast an alert with reward points</p>
                </div>
                <button onClick={() => setIsPushModalOpen(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-all shrink-0">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSendPush} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
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
                      min="0" 
                      max="5" 
                      value={pushPoints} 
                      onChange={(e) => setPushPoints(parseInt(e.target.value))}
                      className="w-full accent-[#7C3AED]"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1">
                      <span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
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

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest">Optional Attachment</label>
                  <div className="relative">
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file) {
                          if (file.size > 35 * 1024 * 1024) {
                            Swal.fire('Error', 'Attachment must not exceed 35 MB.', 'error');
                            e.target.value = '';
                            setPushAttachment(null);
                            return;
                          }
                          const ext = file.name.split('.').pop()?.toLowerCase() || '';
                          const blockedExtensions = ['zip', 'mp4', 'mkv', 'avi', 'mov', 'flv', 'webm', 'wmv', '3gp', 'mpeg', 'mpg', 'ogg'];
                          if (blockedExtensions.includes(ext) || file.type.startsWith('video/') || file.type.includes('zip')) {
                            Swal.fire('Error', 'Attachment has an invalid format. Videos and zip files are not allowed.', 'error');
                            e.target.value = '';
                            setPushAttachment(null);
                            return;
                          }
                        }
                        setPushAttachment(file);
                      }}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-[#7C3AED]/10 file:text-[#7C3AED] hover:file:bg-[#7C3AED]/20 transition-all text-sm font-bold text-[#1E184B] cursor-pointer"
                    />
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
