import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, 
  Plus, 
  Search, 
  Trash2, 
  Calendar, 
  Users, 
  X, 
  Award,
  Paperclip,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import SEO from '@/components/SEO';
import { formatDate } from '@/lib/utils';

const MySwal = withReactContent(Swal);

interface Notice {
  id: number;
  title: string;
  message: string;
  points: number;
  attachment_url: string | null;
  target_type: string;
  created_at: string;
  department_name: string | null;
  sender_name: string;
}

interface Department {
  id: number;
  name: string;
}

export default function IANotices() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    points: 0,
    target_type: 'ALL',
    department_id: '',
    attachment: null as File | null
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/ia/notices.php`, { credentials: 'include' });
      const result = await res.json();
      if (result.status === 'success') {
        setNotices(result.data.notices);
        setDepartments(result.data.departments);
      }
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredNotices = useMemo(() => {
    return notices.filter(n => 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [notices, searchQuery]);

  const handleDelete = async (id: number) => {
    const result = await MySwal.fire({
      title: 'Delete Announcement?',
      text: "This notice will be deleted from users' active feeds.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      confirmButtonText: 'Delete'
    });

    if (result.isConfirmed) {
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        const res = await fetch(`${apiUrl}/ia/notices.php?id=${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        const data = await res.json();
        if (data.status === 'success') {
          setNotices(notices.filter(n => n.id !== id));
          MySwal.fire('Deleted', 'Announcement deleted successfully.', 'success');
        } else {
          MySwal.fire('Error', data.message, 'error');
        }
      } catch (err: any) {
        MySwal.fire('Error', err.message || 'Operation failed', 'error');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = new FormData();
    submitData.append('title', formData.title);
    submitData.append('message', formData.message);
    submitData.append('points', String(formData.points));
    submitData.append('target_type', formData.target_type);
    if (formData.target_type === 'DEPARTMENT' && formData.department_id) {
      submitData.append('department_id', formData.department_id);
    }
    if (formData.attachment) {
      submitData.append('attachment', formData.attachment);
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/ia/notices.php`, {
        method: 'POST',
        credentials: 'include',
        body: submitData
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchData();
        setIsModalOpen(false);
        setFormData({
          title: '',
          message: '',
          points: 0,
          target_type: 'ALL',
          department_id: '',
          attachment: null
        });
        MySwal.fire('Success', 'Announcement successfully published.', 'success');
      } else {
        MySwal.fire('Error', data.message, 'error');
      }
    } catch (err: any) {
      MySwal.fire('Error', err.message || 'Operation failed', 'error');
    }
  };

  const getTargetLabel = (type: string, deptName: string | null) => {
    switch (type) {
      case 'ALL': return 'Entire Institution';
      case 'ROLE_HOD': return 'All HODs';
      case 'ROLE_FACULTY': return 'All Faculty';
      case 'DEPARTMENT': return `Dept: ${deptName || 'N/A'}`;
      default: return type;
    }
  };

  return (
    <div className="space-y-8">
      <SEO title="Notices & Announcements" description="Broadcast notices and announcements." />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#1E1B4B] dark:text-indigo-100 tracking-tight">
            Notices & Announcements
          </h1>
          <p className="text-[#4C1D95]/60 dark:text-violet-400/60 mt-1 font-medium text-xs sm:text-sm">Broadcast notices to the entire institution, role groups, or specific departments.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-6 py-3 rounded-2xl font-black uppercase tracking-wider text-xs shadow-xl shadow-purple-500/20 active:scale-95 cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" />
          Publish Notice
        </button>
      </div>

      {/* Filter/Search */}
      <div className="bg-white/70 dark:bg-[#1A0F35]/20 backdrop-blur-md rounded-3xl p-4 border border-[#7C3AED]/10 dark:border-violet-500/20 shadow-sm flex items-center gap-4 relative z-[50]">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7C3AED] dark:text-violet-400 opacity-40 group-focus-within:opacity-100 transition-opacity" />
          <input 
            type="text" 
            placeholder="Search announcements by title or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-2xl outline-none focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-medium text-[#1E1B4B] dark:text-indigo-100 placeholder:text-[#1E1B4B]/30 dark:placeholder:text-indigo-100/30"
          />
        </div>
      </div>

      {/* Notices List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] rounded-full animate-spin" />
          <p className="text-[#4C1D95]/60 dark:text-violet-400/60 font-black text-xs uppercase tracking-widest">Loading Announcements...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {filteredNotices.map((notice) => (
              <motion.div
                key={notice.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between gap-6 hover:shadow-md transition-all group"
              >
                <div className="flex-1 space-y-4">
                  {/* Sender, Date, and Target */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#4C1D95]/60 dark:text-indigo-200/50">
                    <span className="font-black text-[#7C3AED] dark:text-violet-400">{notice.sender_name}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-violet-950/40" />
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(notice.created_at)}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-violet-950/40" />
                    <span className="px-2.5 py-1 bg-[#7C3AED]/10 text-[#7C3AED] dark:bg-violet-950/30 dark:text-violet-400 font-black rounded-lg uppercase text-[9px] tracking-widest flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> {getTargetLabel(notice.target_type, notice.department_name)}
                    </span>
                    {notice.points > 0 && (
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 font-black rounded-lg uppercase text-[9px] tracking-widest flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" /> {notice.points} Claims
                      </span>
                    )}
                  </div>

                  {/* Body details */}
                  <div>
                    <h3 className="text-lg font-black text-[#1E1B4B] dark:text-indigo-50 leading-snug group-hover:text-[#7C3AED] dark:group-hover:text-violet-400 transition-colors">
                      {notice.title}
                    </h3>
                    <p className="text-sm text-[#4C1D95]/80 dark:text-indigo-200/80 mt-2 font-medium leading-relaxed whitespace-pre-line">
                      {notice.message}
                    </p>
                  </div>

                  {/* Attachment */}
                  {notice.attachment_url && (
                    <div className="pt-2">
                      <a 
                        href={`${import.meta.env.VITE_API_URL}${notice.attachment_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-violet-950/20 border border-slate-200/50 dark:border-violet-500/10 text-xs font-black text-[#4C1D95] dark:text-violet-400 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <Paperclip className="w-3.5 h-3.5" /> View Attachment
                      </a>
                    </div>
                  )}
                </div>

                <div className="self-start md:self-center">
                  <button
                    onClick={() => handleDelete(notice.id)}
                    className="p-3 bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-950/10 dark:hover:bg-rose-900/20 rounded-2xl text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredNotices.length === 0 && (
        <div className="text-center py-20 space-y-4 bg-white/40 dark:bg-[#1A0F35]/10 rounded-[3rem] border border-dashed border-[#7C3AED]/20 dark:border-violet-500/20">
          <div className="w-20 h-20 bg-[#7C3AED]/10 dark:bg-violet-950/40 rounded-full flex items-center justify-center mx-auto">
            <Bell className="w-10 h-10 text-[#7C3AED] dark:text-violet-400 opacity-20" />
          </div>
          <h3 className="text-xl font-black text-[#1E1B4B] dark:text-indigo-100">No announcements published</h3>
          <p className="text-sm font-bold text-[#4C1D95]/60 dark:text-violet-400/60 max-w-xs mx-auto">
            Use announcements to broadcast urgent information or messages to staff members.
          </p>
        </div>
      )}

      {/* Publish Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[#1E1B4B]/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-[2.5rem] w-full max-w-xl p-6 sm:p-8 md:p-10 shadow-2xl z-10 max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-[#7C3AED] rounded-t-[2.5rem]" />
              
              <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#1E1B4B] dark:text-indigo-100">Publish Announcement</h2>
                  <p className="text-xs font-bold text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest mt-1">Broadcast Protocol</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-3 hover:bg-slate-100 dark:hover:bg-violet-950/40 rounded-2xl transition-colors cursor-pointer"
                >
                  <X className="w-6 h-6 text-[#1E1B4B]/40 dark:text-violet-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden space-y-6">
                <div className="space-y-6 overflow-y-auto flex-1 pr-1.5 py-1 -mr-2 scrollbar-thin">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Notice Title</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100"
                      placeholder="e.g. Server Maintenance Scheduled"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Message Content</label>
                    <textarea
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={4}
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100 resize-none"
                      placeholder="Write your notice detail here..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Target Group</label>
                      <select
                        value={formData.target_type}
                        onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100 cursor-pointer"
                      >
                        <option value="ALL">Entire Institution</option>
                        <option value="ROLE_HOD">All HODs Only</option>
                        <option value="ROLE_FACULTY">All Faculty Only</option>
                        <option value="DEPARTMENT">Specific Department</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Merit Points (0-5)</label>
                      <input
                        type="number"
                        min={0}
                        max={5}
                        value={formData.points}
                        onChange={(e) => setFormData({ ...formData, points: Math.max(0, Math.min(5, Number(e.target.value))) })}
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100"
                      />
                    </div>
                  </div>

                  {formData.target_type === 'DEPARTMENT' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Select Department</label>
                      <select
                        required
                        value={formData.department_id}
                        onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100 cursor-pointer"
                      >
                        <option value="">Choose department...</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Attachment File</label>
                    <input
                      type="file"
                      onChange={(e) => setFormData({ ...formData, attachment: e.target.files?.[0] || null })}
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-slate-100 dark:border-violet-500/10 flex-shrink-0 mt-auto">
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl font-black shadow-xl shadow-purple-500/20 transition-all uppercase tracking-widest text-xs cursor-pointer"
                  >
                    Broadcast Announcement
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-8 py-4 bg-slate-100 dark:bg-violet-950/60 hover:bg-slate-200 dark:hover:bg-violet-900/60 text-[#1E1B4B] dark:text-indigo-200 rounded-2xl font-black transition-all uppercase tracking-widest text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
