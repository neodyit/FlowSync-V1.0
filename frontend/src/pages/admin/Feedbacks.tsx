import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2,
  X,
  Mail,
  User,
  Shield,
  Eye,
  RefreshCw
} from 'lucide-react';
import { cn, formatDate } from "@/lib/utils";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

interface Feedback {
  id: number;
  type: 'feedback' | 'issue';
  subject: string;
  message: string;
  status: 'pending' | 'in_progress' | 'resolved';
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string;
  user_profile_pic: string | null;
  role_name: string;
}

export default function Feedbacks() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'feedback' | 'issue'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'resolved'>('all');
  
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchFeedbacks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/feedbacks.php`, {
        credentials: 'include'
      });
      const result = await response.json();
      if (result.status === 'success') {
        setFeedbacks(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch feedbacks:', error);
      MySwal.fire({
        title: 'Sync Error',
        text: 'Failed to synchronize feedback data. Please try again.',
        icon: 'error',
        confirmButtonColor: '#7C3AED'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const updateStatus = async (id: number, status: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/feedbacks.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, status })
      });
      const result = await response.json();
      if (result.status === 'success') {
        MySwal.fire({
          title: 'Status Updated',
          text: `Feedback has been marked as ${status.replace('_', ' ')}.`,
          icon: 'success',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
        fetchFeedbacks();
        if (selectedFeedback && selectedFeedback.id === id) {
          setSelectedFeedback({ ...selectedFeedback, status: status as any });
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      MySwal.fire('Error', error.message || 'Failed to update status', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    const result = await MySwal.fire({
      title: 'Delete Record?',
      text: "This action cannot be undone. The feedback will be permanently removed.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f43f5e',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/feedbacks.php?id=${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        const res = await response.json();
        if (res.status === 'success') {
          MySwal.fire({
            title: 'Deleted!',
            text: 'Feedback record has been removed.',
            icon: 'success',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
          });
          fetchFeedbacks();
          if (selectedFeedback && selectedFeedback.id === id) {
            setIsModalOpen(false);
          }
        } else {
          throw new Error(res.message);
        }
      } catch (error: any) {
        MySwal.fire('Error', error.message || 'Failed to delete record', 'error');
      }
    }
  };

  const filteredFeedbacks = feedbacks.filter(f => {
    const matchesSearch = 
      f.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
      f.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.user_email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || f.type === filterType;
    const matchesStatus = filterStatus === 'all' || f.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'resolved': return { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-500/10', label: 'Resolved' };
      case 'in_progress': return { icon: RefreshCw, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-500/10', label: 'In Progress' };
      default: return { icon: Clock, color: 'text-slate-500 dark:text-violet-300', bg: 'bg-slate-50 dark:bg-violet-950/20', border: 'border-slate-200 dark:border-violet-500/10', label: 'Pending' };
    }
  };

  const getTypeConfig = (type: string) => {
    switch(type) {
      case 'issue': return { icon: AlertCircle, color: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/20', label: 'Issue Report' };
      default: return { icon: MessageSquare, color: 'text-[#7C3AED] dark:text-violet-400', bg: 'bg-[#7C3AED]/10 dark:bg-violet-950/40', label: 'Feedback' };
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1E1B4B] dark:text-indigo-100 tracking-tight">Feedback Hub</h1>
          <p className="text-[#4C1D95]/60 dark:text-violet-400/60 font-medium mt-1 text-sm">Review and manage user feedback and issue reports.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/70 dark:bg-[#1A0F35]/20 backdrop-blur-md rounded-3xl p-4 border border-[#7C3AED]/10 dark:border-violet-500/20 shadow-sm flex flex-col gap-3 relative z-10">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7C3AED] dark:text-violet-400 opacity-40 group-focus-within:opacity-100 transition-opacity" />
          <input 
            type="text" 
            placeholder="Search subject, name, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#110A24] border border-[#7C3AED]/5 dark:border-violet-500/20 rounded-2xl outline-none focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-medium text-[#1E1B4B] dark:text-indigo-100 placeholder:text-slate-300 dark:placeholder:text-indigo-100/20"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="w-full px-4 py-3 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-2xl outline-none focus:border-[#7C3AED] dark:focus:border-violet-400 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100"
          >
            <option value="all" className="dark:bg-[#110A24]">All Types</option>
            <option value="feedback" className="dark:bg-[#110A24]">Feedbacks</option>
            <option value="issue" className="dark:bg-[#110A24]">Issues</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="w-full px-4 py-3 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-2xl outline-none focus:border-[#7C3AED] dark:focus:border-violet-400 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100"
          >
            <option value="all" className="dark:bg-[#110A24]">All Status</option>
            <option value="pending" className="dark:bg-[#110A24]">Pending</option>
            <option value="in_progress" className="dark:bg-[#110A24]">In Progress</option>
            <option value="resolved" className="dark:bg-[#110A24]">Resolved</option>
          </select>
        </div>
      </div>

      {/* Feedback List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] rounded-full animate-spin" />
          <p className="text-[#4C1D95]/60 dark:text-violet-400/60 font-black text-xs uppercase tracking-widest">Loading Records...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredFeedbacks.map((f) => {
              const statusCfg = getStatusConfig(f.status);
              const typeCfg = getTypeConfig(f.type);
              const TypeIcon = typeCfg.icon;

              return (
                <motion.div
                  key={f.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-white dark:bg-[#1A0F35]/20 backdrop-blur-md rounded-[2rem] p-6 border border-[#7C3AED]/10 dark:border-violet-500/20 shadow-lg shadow-[#7C3AED]/5 relative group overflow-hidden flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn("px-3 py-1.5 rounded-xl flex items-center gap-2 border", statusCfg.bg, statusCfg.border)}>
                      <statusCfg.icon className={cn("w-4 h-4", statusCfg.color)} />
                      <span className={cn("text-[10px] font-black uppercase tracking-widest", statusCfg.color)}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", typeCfg.bg)}>
                      <TypeIcon className={cn("w-5 h-5", typeCfg.color)} />
                    </div>
                  </div>

                  <h3 className="text-lg font-black text-[#1E1B4B] dark:text-indigo-100 line-clamp-1 mb-2 group-hover:text-[#7C3AED] dark:group-hover:text-violet-400 transition-colors">{f.subject}</h3>
                  <p className="text-sm text-[#4C1D95]/70 dark:text-indigo-200/70 line-clamp-3 mb-6 flex-1 font-medium leading-relaxed">
                    {f.message}
                  </p>

                  <div className="pt-4 border-t border-[#7C3AED]/10 dark:border-violet-500/10 flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#7C3AED]/10 dark:bg-violet-950/40 text-[#7C3AED] dark:text-violet-300 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                        {f.user_profile_pic ? (
                          <img src={`${import.meta.env.VITE_API_URL}/${f.user_profile_pic}`} alt="" className="w-full h-full object-cover" />
                        ) : (
                          f.user_name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1E1B4B] dark:text-indigo-100 truncate">{f.user_name}</p>
                        <p className="text-[10px] text-[#4C1D95]/60 dark:text-violet-400/60 truncate font-medium">{f.role_name}</p>
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-[#4C1D95]/40 dark:text-violet-400/40 text-right shrink-0">
                      {formatDate(f.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedFeedback(f);
                        setIsModalOpen(true);
                      }}
                      className="flex-1 bg-[#7C3AED]/5 dark:bg-[#7C3AED]/10 hover:bg-[#7C3AED]/10 dark:hover:bg-[#7C3AED]/20 text-[#7C3AED] dark:text-violet-400 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="w-10 h-10 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-500 dark:text-rose-450 rounded-xl flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* No Results */}
      {!isLoading && filteredFeedbacks.length === 0 && (
        <div className="text-center py-20 space-y-4 bg-white/40 dark:bg-violet-950/10 rounded-[3rem] border border-dashed border-[#7C3AED]/20 dark:border-violet-500/20">
          <div className="w-20 h-20 bg-[#7C3AED]/10 dark:bg-violet-950/40 rounded-full flex items-center justify-center mx-auto">
            <MessageSquare className="w-10 h-10 text-[#7C3AED] dark:text-violet-400 opacity-20" />
          </div>
          <h3 className="text-xl font-black text-[#1E1B4B] dark:text-indigo-100">No records found</h3>
          <p className="text-sm font-bold text-[#4C1D95]/60 dark:text-violet-400/60 max-w-xs mx-auto">
            No feedbacks or issues match your current filters.
          </p>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {isModalOpen && selectedFeedback && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[#1E1B4B]/40 dark:bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }}
              className="relative bg-white dark:bg-[#1A0F35] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-t-[2rem] sm:rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] z-10"
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-8 pb-4 sm:pb-6 border-b border-[#7C3AED]/10 dark:border-violet-500/10 flex items-start justify-between gap-3 bg-gradient-to-br from-white to-[#7C3AED]/[0.02] dark:from-[#110A24] dark:to-[#1A0F35]">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={cn(
                      "px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                      selectedFeedback.type === 'issue' ? "bg-rose-50 dark:bg-rose-950/20 text-rose-500 border-rose-100 dark:border-rose-500/10" : "bg-[#7C3AED]/10 dark:bg-violet-950/40 text-[#7C3AED] dark:text-violet-400 border-[#7C3AED]/20 dark:border-violet-500/20"
                    )}>
                      {selectedFeedback.type === 'issue' ? 'Issue Report' : 'Feedback'}
                    </span>
                    <span className="text-[10px] font-bold text-[#4C1D95]/40 dark:text-violet-400/40 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {new Date(selectedFeedback.created_at).toLocaleString()}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-2xl font-black text-[#1E1B4B] dark:text-indigo-100 tracking-tight leading-tight line-clamp-3">
                    {selectedFeedback.subject}
                  </h2>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 dark:bg-violet-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-500 dark:text-violet-400 hover:text-rose-500 flex items-center justify-center transition-colors shrink-0"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-8 overflow-y-auto custom-scrollbar flex-1 bg-[#F8FAFC] dark:bg-[#0E0820] space-y-4">
                {/* Submitter Info */}
                <div className="bg-white dark:bg-[#1A0F35]/45 rounded-2xl p-4 border border-[#7C3AED]/10 dark:border-violet-500/15 mb-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#7C3AED]/10 dark:bg-violet-950/40 text-[#7C3AED] dark:text-violet-300 flex items-center justify-center font-bold text-lg overflow-hidden shrink-0 shadow-inner">
                    {selectedFeedback.user_profile_pic ? (
                      <img src={`${import.meta.env.VITE_API_URL}/${selectedFeedback.user_profile_pic}`} alt="" className="w-full h-full object-cover" />
                    ) : (
                      selectedFeedback.user_name.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-[#1E1B4B] dark:text-indigo-100 truncate">{selectedFeedback.user_name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-medium text-[#4C1D95]/60 dark:text-violet-400/60 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" /> {selectedFeedback.user_email}
                      </span>
                      <span className="text-[10px] font-bold text-[#7C3AED] dark:text-violet-400 uppercase tracking-widest bg-[#7C3AED]/10 dark:bg-violet-950/40 px-2 py-0.5 rounded-md">
                        {selectedFeedback.role_name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Message Content */}
                <div className="bg-white dark:bg-[#1A0F35]/45 rounded-2xl p-6 border border-[#7C3AED]/10 dark:border-violet-500/15 shadow-sm relative">
                  <div className="absolute top-6 left-6 text-[#7C3AED]/10 dark:text-violet-500/10">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <div className="relative z-10 pl-12">
                    <p className="text-[#1E1B4B] dark:text-indigo-200 leading-relaxed whitespace-pre-wrap text-sm font-medium">
                      {selectedFeedback.message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer (Actions) */}
              <div className="p-4 sm:p-6 border-t border-[#7C3AED]/10 dark:border-violet-500/10 bg-white dark:bg-[#110A24] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-[#1E1B4B]/40 dark:text-violet-400/40 uppercase tracking-widest mr-2">Update Status:</span>
                  <select
                    value={selectedFeedback.status}
                    onChange={(e) => updateStatus(selectedFeedback.id, e.target.value)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl outline-none transition-all text-xs font-bold border cursor-pointer bg-slate-50 dark:bg-violet-950/30 text-slate-600 dark:text-violet-200 border-slate-200 dark:border-violet-500/20",
                      selectedFeedback.status === 'resolved' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/10' :
                      selectedFeedback.status === 'in_progress' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/10' :
                      'bg-slate-50 dark:bg-violet-950/30 text-slate-600 dark:text-violet-200 border-slate-200 dark:border-violet-500/20'
                    )}
                  >
                    <option value="pending" className="dark:bg-[#110A24]">Pending</option>
                    <option value="in_progress" className="dark:bg-[#110A24]">In Progress</option>
                    <option value="resolved" className="dark:bg-[#110A24]">Resolved</option>
                  </select>
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                  <a 
                    href={`mailto:${selectedFeedback.user_email}?subject=Re: ${selectedFeedback.subject}`}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-[#7C3AED]/10 hover:bg-[#7C3AED]/20 dark:bg-violet-950/40 dark:hover:bg-violet-900/40 text-[#7C3AED] dark:text-violet-400 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Email User
                  </a>
                  <button
                    onClick={() => handleDelete(selectedFeedback.id)}
                    className="w-10 h-10 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-500 dark:text-rose-450 rounded-xl flex items-center justify-center transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
