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
      case 'resolved': return { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Resolved' };
      case 'in_progress': return { icon: RefreshCw, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', label: 'In Progress' };
      default: return { icon: Clock, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', label: 'Pending' };
    }
  };

  const getTypeConfig = (type: string) => {
    switch(type) {
      case 'issue': return { icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50', label: 'Issue Report' };
      default: return { icon: MessageSquare, color: 'text-[#7C3AED]', bg: 'bg-[#7C3AED]/10', label: 'Feedback' };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1E1B4B] tracking-tight">Feedback Hub</h1>
          <p className="text-[#4C1D95]/60 font-medium mt-1">Review and manage user feedback and issue reports.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/70 backdrop-blur-md rounded-3xl p-4 border border-[#7C3AED]/10 shadow-sm flex flex-col lg:flex-row gap-4 relative z-10">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7C3AED] opacity-40 group-focus-within:opacity-100 transition-opacity" />
          <input 
            type="text" 
            placeholder="Search subject, name, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-[#7C3AED]/5 rounded-2xl outline-none focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-medium"
          />
        </div>
        
        <div className="flex gap-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-3 bg-white border border-[#7C3AED]/10 rounded-2xl outline-none focus:border-[#7C3AED] transition-all text-sm font-bold text-[#1E1B4B]"
          >
            <option value="all">All Types</option>
            <option value="feedback">Feedbacks</option>
            <option value="issue">Issues</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-3 bg-white border border-[#7C3AED]/10 rounded-2xl outline-none focus:border-[#7C3AED] transition-all text-sm font-bold text-[#1E1B4B]"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Feedback List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] rounded-full animate-spin" />
          <p className="text-[#4C1D95]/60 font-black text-xs uppercase tracking-widest">Loading Records...</p>
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
                  className="bg-white rounded-[2rem] p-6 border border-[#7C3AED]/10 shadow-lg shadow-[#7C3AED]/5 relative group overflow-hidden flex flex-col"
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

                  <h3 className="text-lg font-black text-[#1E1B4B] line-clamp-1 mb-2 group-hover:text-[#7C3AED] transition-colors">{f.subject}</h3>
                  <p className="text-sm text-[#4C1D95]/70 line-clamp-3 mb-6 flex-1 font-medium leading-relaxed">
                    {f.message}
                  </p>

                  <div className="pt-4 border-t border-[#7C3AED]/10 flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                        {f.user_profile_pic ? (
                          <img src={`${import.meta.env.VITE_API_URL}/${f.user_profile_pic}`} alt="" className="w-full h-full object-cover" />
                        ) : (
                          f.user_name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1E1B4B] truncate">{f.user_name}</p>
                        <p className="text-[10px] text-[#4C1D95]/60 truncate font-medium">{f.role_name}</p>
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-[#4C1D95]/40 text-right shrink-0">
                      {formatDate(f.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedFeedback(f);
                        setIsModalOpen(true);
                      }}
                      className="flex-1 bg-[#7C3AED]/5 hover:bg-[#7C3AED]/10 text-[#7C3AED] py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="w-10 h-10 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl flex items-center justify-center transition-colors"
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
        <div className="text-center py-20 space-y-4 bg-white/40 rounded-[3rem] border border-dashed border-[#7C3AED]/20">
          <div className="w-20 h-20 bg-[#7C3AED]/10 rounded-full flex items-center justify-center mx-auto">
            <MessageSquare className="w-10 h-10 text-[#7C3AED] opacity-20" />
          </div>
          <h3 className="text-xl font-black text-[#1E1B4B]">No records found</h3>
          <p className="text-sm font-bold text-[#4C1D95]/60 max-w-xs mx-auto">
            No feedbacks or issues match your current filters.
          </p>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {isModalOpen && selectedFeedback && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
              className="relative bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-8 pb-6 border-b border-[#7C3AED]/10 flex items-start justify-between bg-gradient-to-br from-white to-[#7C3AED]/[0.02]">
                <div className="pr-8">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={cn(
                      "px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                      selectedFeedback.type === 'issue' ? "bg-rose-50 text-rose-500 border-rose-100" : "bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/20"
                    )}>
                      {selectedFeedback.type === 'issue' ? 'Issue Report' : 'Feedback'}
                    </span>
                    <span className="text-[10px] font-bold text-[#4C1D95]/40 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {new Date(selectedFeedback.created_at).toLocaleString()}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-[#1E1B4B] tracking-tight leading-tight">
                    {selectedFeedback.subject}
                  </h2>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-500 flex items-center justify-center transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-[#F8FAFC]">
                {/* Submitter Info */}
                <div className="bg-white rounded-2xl p-4 border border-[#7C3AED]/10 mb-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center font-bold text-lg overflow-hidden shrink-0 shadow-inner">
                    {selectedFeedback.user_profile_pic ? (
                      <img src={`${import.meta.env.VITE_API_URL}/${selectedFeedback.user_profile_pic}`} alt="" className="w-full h-full object-cover" />
                    ) : (
                      selectedFeedback.user_name.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-[#1E1B4B] truncate">{selectedFeedback.user_name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-medium text-[#4C1D95]/60 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" /> {selectedFeedback.user_email}
                      </span>
                      <span className="text-[10px] font-bold text-[#7C3AED] uppercase tracking-widest bg-[#7C3AED]/10 px-2 py-0.5 rounded-md">
                        {selectedFeedback.role_name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Message Content */}
                <div className="bg-white rounded-2xl p-6 border border-[#7C3AED]/10 shadow-sm relative">
                  <div className="absolute top-6 left-6 text-[#7C3AED]/10">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <div className="relative z-10 pl-12">
                    <p className="text-[#1E1B4B] leading-relaxed whitespace-pre-wrap text-sm font-medium">
                      {selectedFeedback.message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer (Actions) */}
              <div className="p-6 border-t border-[#7C3AED]/10 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-[#1E1B4B]/40 uppercase tracking-widest mr-2">Update Status:</span>
                  <select
                    value={selectedFeedback.status}
                    onChange={(e) => updateStatus(selectedFeedback.id, e.target.value)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl outline-none transition-all text-xs font-bold border cursor-pointer",
                      selectedFeedback.status === 'resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                      selectedFeedback.status === 'in_progress' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                      'bg-slate-50 text-slate-600 border-slate-200'
                    )}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                  <a 
                    href={`mailto:${selectedFeedback.user_email}?subject=Re: ${selectedFeedback.subject}`}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-[#7C3AED]/10 hover:bg-[#7C3AED]/20 text-[#7C3AED] rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Email User
                  </a>
                  <button
                    onClick={() => handleDelete(selectedFeedback.id)}
                    className="w-10 h-10 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl flex items-center justify-center transition-colors shrink-0"
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
