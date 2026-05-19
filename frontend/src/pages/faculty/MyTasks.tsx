import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Calendar,
  FileText,
  Download,
  Eye,
  Send,
  Loader2,
  X,
  Plus,
  Briefcase,
  History,
  Layout,
  User,
  MoreVertical,
  Trophy,
  Award,
  Flag,
  MessageSquare,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';
import { cn, formatDate, getDownloadUrl, calculateProgress } from '@/lib/utils';
import Swal from 'sweetalert2';

interface Attachment {
  id: number;
  file_name: string;
  file_path: string;
  entity_type: string;
  created_at: string;
  uploader_id: number;
}

interface Task {
  id: number;
  title: string;
  description: string;
  deadline: string;
  priority: 'High' | 'Medium' | 'Low' | 'Critical';
  status: string;
  task_type: string;
  assigned_by_name: string;
  assigned_by_pic: string | null;
  attachment_count: number;
  attachments: Attachment[];
  points: number;
  bonus_points: number;
  progress: number;
  flag_color: string | null;
  public_remarks: string | null;
  private_remarks: string | null;
  my_remarks: string | null;
  is_delayed?: number;
  teammate_remarks?: {
    public_remarks: string;
    faculty_name: string;
    faculty_pic: string | null;
    status: string;
    progress: number;
  }[];
  created_at: string;
  submitted_at: string | null;
  completed_at: string | null;
  accepted_at: string | null;
  comments?: {
    id: number;
    user_id: number;
    user_name: string;
    comment: string;
    created_at: string;
  }[];
}

const FacultyMyTasks: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user.id;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publicRemarks, setPublicRemarks] = useState('');
  const [privateRemarks, setPrivateRemarks] = useState('');
  const [submissionFiles, setSubmissionFiles] = useState<File[]>([]);
  
  // Preview State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{url: string, name: string, type: string} | null>(null);

  // Extension State
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [extensionDate, setExtensionDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [isRequestingExtension, setIsRequestingExtension] = useState(false);
  const [extensionRequests, setExtensionRequests] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const fetchTasks = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/faculty/my_tasks.php`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        setTasks(data.data);
        setSelectedTask(prev => {
          if (!prev) return null;
          const updated = data.data.find((t: any) => t.id === prev.id);
          return updated || prev;
        });
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const fetchExtensionRequests = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/extensions.php?user_id=${userId}&role=Faculty`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setExtensionRequests(data);
      }
    } catch (error) {
      console.error("Failed to fetch extension requests");
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchExtensionRequests();

    // Polling for real-time updates every 5 seconds
    const interval = setInterval(() => {
      fetchTasks(true);
      fetchExtensionRequests();
    }, 5000); // 5s

    return () => clearInterval(interval);
  }, []);

  const handleRequestExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !extensionDate || !extensionReason) return;

    setIsRequestingExtension(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/extensions.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          task_id: selectedTask.id,
          user_id: userId,
          requested_deadline: extensionDate,
          reason: extensionReason
        })
      });

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Request Sent',
          text: 'Your deadline extension request has been sent to the HOD.',
          timer: 2000,
          showConfirmButton: false
        });
        setIsExtensionModalOpen(false);
        setExtensionDate('');
        setExtensionReason('');
        fetchExtensionRequests();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit request');
      }
    } catch (error: any) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      setIsRequestingExtension(false);
    }
  };

  const handleUpdateStatus = async (taskId: number, status: string, progress?: number) => {
    const finalProgress = progress !== undefined ? progress : calculateProgress(status);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/faculty/my_tasks.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ task_id: taskId, status, progress: finalProgress })
      });
      const data = await response.json();
      if (data.status === 'success') {
        Swal.fire({
          title: 'Updated!',
          text: `Mission is now ${finalProgress}% complete`,
          icon: 'success',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
        window.dispatchEvent(new CustomEvent('refresh-notifications'));
        fetchTasks();
        if (selectedTask?.id === taskId) {
          setSelectedTask(prev => prev ? ({ ...prev, status, progress: progress ?? prev.progress }) : null);
        }
      }
    } catch (error) {
      Swal.fire('Error', 'Failed to update mission', 'error');
    }
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('task_id', selectedTask.id.toString());
    
    if (submissionFiles.length > 0) {
      submissionFiles.forEach(file => {
        formData.append('attachments[]', file);
      });
    }

    formData.append('public_remarks', publicRemarks);
    formData.append('private_remarks', privateRemarks);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/faculty/my_tasks.php`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        Swal.fire({
          title: 'Mission Submitted!',
          text: 'Your progress has been sent to the HOD for evaluation.',
          icon: 'success',
          confirmButtonColor: '#7C3AED'
        });
        // Trigger immediate notification refresh
        window.dispatchEvent(new CustomEvent('refresh-notifications'));
        setIsSubmitModalOpen(false);
        setSubmissionFiles([]);
        setPublicRemarks('');
        setPrivateRemarks('');
        
        // Refresh all tasks and update the currently selected one
        const refreshResponse = await fetch(`${import.meta.env.VITE_API_URL}/faculty/my_tasks.php`, { credentials: 'include' });
        const refreshData = await refreshResponse.json();
        if (refreshData.status === 'success') {
          setTasks(refreshData.data);
          const updated = refreshData.data.find((t: Task) => t.id === selectedTask.id);
          if (updated) setSelectedTask(updated);
        }
      }
    } catch (error) {
      Swal.fire('Error', 'Submission failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/task_comments.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          task_id: selectedTask.id,
          comment: newComment.trim()
        })
      });

      if (response.ok) {
        setNewComment('');
        // Refresh task to show new comment
        const refreshResponse = await fetch(`${import.meta.env.VITE_API_URL}/faculty/my_tasks.php`, { credentials: 'include' });
        const refreshData = await refreshResponse.json();
        if (refreshData.status === 'success') {
          setTasks(refreshData.data);
          setSelectedTask(prev => {
            if (!prev) return null;
            const updated = refreshData.data.find((t: Task) => t.id === prev.id);
            return updated || prev;
          });
        }
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handlePreview = (file: Attachment) => {
    const url = `${import.meta.env.VITE_API_URL}/${file.file_path}`;
    const ext = file.file_name.split('.').pop()?.toLowerCase() || '';
    setPreviewFile({ url, name: file.file_name, type: ext });
    setIsPreviewOpen(true);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Assigned': return { color: 'text-blue-500', bg: 'bg-blue-50', label: 'Assigned', icon: Clock };
      case 'Accepted': return { color: 'text-indigo-500', bg: 'bg-indigo-50', label: 'Accepted', icon: CheckCircle2 };
      case 'In Progress': return { color: 'text-amber-500', bg: 'bg-amber-50', label: 'In Progress', icon: Loader2 };
      case 'Submitted': return { color: 'text-purple-500', bg: 'bg-purple-50', label: 'For Review', icon: Send };
      case 'Approved':
      case 'Completed': return { color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Completed', icon: CheckCircle2 };
      case 'Rejected':
      case 'Declined': return { color: 'text-rose-500', bg: 'bg-rose-50', label: 'Rejected', icon: X };
      case 'Rework Required': return { color: 'text-orange-500', bg: 'bg-orange-50', label: 'Rework Needed', icon: History };
      default: return { color: 'text-slate-400', bg: 'bg-slate-50', label: status, icon: AlertCircle };
    }
  };

  const getFlagConfig = (color: string | null) => {
    switch (color) {
      case 'Red': return { bg: 'bg-rose-500', text: 'text-rose-500', label: 'Critical' };
      case 'Orange': return { bg: 'bg-orange-500', text: 'text-orange-500', label: 'Priority' };
      case 'Yellow': return { bg: 'bg-amber-400', text: 'text-amber-500', label: 'Important' };
      case 'Green': return { bg: 'bg-emerald-500', text: 'text-emerald-500', label: 'Good Progress' };
      default: return null;
    }
  };

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeTasks = filteredTasks.filter(t => !['Completed', 'Approved', 'Declined', 'Rejected'].includes(t.status));
  const completedTasks = filteredTasks.filter(t => ['Completed', 'Approved'].includes(t.status));

  return (
    <div className="space-y-8 pb-20">
      <SEO title="My Workspace" description="Manage your assigned tasks and track progress." />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#1E184B] tracking-tight">Personal Queue</h1>
          <p className="text-[#1E184B]/60 mt-1 font-bold flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#7C3AED]" />
            Your active workload and responsibilities.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="px-5 py-3 bg-white border border-slate-100 rounded-2xl flex items-center gap-3 shadow-sm">
            <Trophy className="w-5 h-5 text-amber-500" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Career Points</span>
              <span className="text-sm font-black text-[#1E184B]">{tasks.reduce((acc, t) => acc + t.points + t.bonus_points, 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Task Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#7C3AED] transition-colors" />
          <input 
            type="text" 
            placeholder="Search your queue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-[#1E184B] focus:outline-none focus:ring-4 focus:ring-[#7C3AED]/10 focus:border-[#7C3AED] transition-all"
          />
        </div>
      </div>

      {/* Tasks Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-64 bg-white rounded-[2.5rem] animate-pulse border border-slate-100" />)}
        </div>
      ) : (
        <div className="space-y-12">
          {/* Active Tasks */}
          <section>
            <h2 className="text-xs font-black text-[#1E184B]/40 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
              <span className="w-8 h-[2px] bg-[#7C3AED]/20" />
              Active Missions ({activeTasks.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTasks.map((task) => {
                const config = getStatusConfig(task.status);
                const flag = getFlagConfig(task.flag_color);
                return (
                  <motion.div
                    layoutId={`task-${task.id}`}
                    key={task.id}
                    onClick={() => { setSelectedTask(task); setIsDetailModalOpen(true); }}
                    className="bg-white rounded-[2.5rem] border border-slate-100 p-7 shadow-sm hover:shadow-2xl hover:shadow-[#7C3AED]/10 transition-all cursor-pointer group relative overflow-hidden"
                  >
                    {flag && (
                      <div className={cn("absolute top-4 right-4 w-3 h-3 rounded-full animate-pulse shadow-lg", flag.bg)} />
                    )}

                    <div className="flex items-start justify-between mb-5">
                       <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest", config.bg, config.color)}>
                        {config.label}
                      </div>
                      {task.is_delayed === 1 && (
                        <div className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest animate-pulse">Delayed</div>
                      )}
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-300">
                        <Calendar className="w-3 h-3" />
                        {formatDate(task.deadline)}
                      </div>
                    </div>

                    <h3 className="text-xl font-black text-[#1E184B] mb-2 group-hover:text-[#7C3AED] transition-colors truncate">{task.title}</h3>
                    <p className="text-slate-400 text-sm font-medium mb-6 line-clamp-2 leading-relaxed">
                      {task.description || "Instructional overview pending..."}
                    </p>

                    <div className="flex items-center justify-between pt-5 border-t border-slate-50">
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex items-center justify-between pr-4">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
                          <span className="text-[10px] font-black text-[#1E184B]">{task.progress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] transition-all duration-500" 
                            style={{ width: `${task.progress}%` }} 
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <div className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-300" />
                          <span className="text-[10px] font-black text-slate-400">{task.attachment_count}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {activeTasks.length === 0 && (
                <div className="col-span-full py-16 bg-white rounded-[2.5rem] border border-dashed border-slate-100 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500/20 mx-auto mb-3" />
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Workspace cleared</p>
                </div>
              )}
            </div>
          </section>

          {/* Completed History */}
          <section>
            <h2 className="text-xs font-black text-[#1E184B]/40 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
              <span className="w-8 h-[2px] bg-emerald-500/20" />
              Accomplished Tasks ({completedTasks.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60 hover:opacity-100 transition-opacity">
              {completedTasks.map((task) => (
                <div 
                  key={task.id}
                  onClick={() => { setSelectedTask(task); setIsDetailModalOpen(true); }} 
                  className="bg-slate-50/50 rounded-[2rem] border border-slate-100 p-6 cursor-pointer hover:bg-white transition-all hover:shadow-xl group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                     <div className="flex flex-col items-end gap-1">
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">+{task.points + task.bonus_points} pts</span>
                      {task.is_delayed === 1 && (
                        <span className="bg-rose-50 text-rose-500 px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest border border-rose-100/50">Delayed</span>
                      )}
                    </div>
                  </div>
                  <h3 className="font-black text-[#1E184B] group-hover:text-emerald-600 transition-colors">{task.title}</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                    Completed on {formatDate(task.completed_at || task.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Task Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedTask && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              layoutId={`task-${selectedTask.id}`}
              className="relative bg-white rounded-[2.5rem] md:rounded-[3.5rem] w-full max-w-6xl h-full md:h-auto md:max-h-[95vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Modal Header */}
              <div className="p-10 pb-6 flex items-center justify-between border-b border-slate-50">
                <div className="flex items-center gap-4">
                  <div className={cn("px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border", getStatusConfig(selectedTask.status).bg, getStatusConfig(selectedTask.status).color)}>
                    {getStatusConfig(selectedTask.status).label}
                  </div>
                  {selectedTask.flag_color && (
                    <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest", getFlagConfig(selectedTask.flag_color)?.bg, "text-white")}>
                      <Flag className="w-3 h-3 fill-current" />
                      {getFlagConfig(selectedTask.flag_color)?.label}
                    </div>
                  )}
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-10 pt-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  {/* Info Column */}
                  <div className="lg:col-span-7 space-y-10">
                    <div>
                      <h2 className="text-3xl font-black text-[#1E184B] leading-tight mb-4">{selectedTask.title}</h2>
                      <p className="text-slate-500 font-bold text-sm leading-relaxed whitespace-pre-wrap">
                        {selectedTask.description || "No specific instructions provided. Please consult with the HOD if you need clarification."}
                      </p>
                    </div>

                    {/* Achievement Details (NEW) - Hide on rework */}
                    {selectedTask.status !== 'Rework Required' && (selectedTask.points > 0 || selectedTask.bonus_points > 0) && (
                      <div className="bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] p-6 rounded-[2rem] text-white shadow-xl shadow-[#7C3AED]/20 relative overflow-hidden group">
                        <Sparkles className="absolute -top-4 -right-4 w-24 h-24 text-white/10 rotate-12 group-hover:scale-110 transition-transform" />
                        <div className="relative z-10">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-4 flex items-center gap-2">
                            <Award className="w-4 h-4" /> Performance Metrics
                          </h4>
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-4xl font-black">{selectedTask.points + selectedTask.bonus_points}</p>
                              <p className="text-xs font-bold text-white/80">Total Points Earned</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-amber-300">+{selectedTask.bonus_points} Bonus</p>
                              <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Incentive Applied</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* HOD Remarks (NEW) */}
                    {selectedTask.my_remarks && (
                      <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-[2rem]">
                        <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" /> HOD Feedback
                        </h4>
                        <p className="text-sm font-bold text-amber-900 leading-relaxed italic">
                          "{selectedTask.my_remarks}"
                        </p>
                      </div>
                    )}

                      <div className="space-y-6">
                        <h3 className="text-xs font-black text-[#1E184B] uppercase tracking-widest flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-blue-500" /> Assigned By
                        </h3>
                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-black text-[#1E184B] shadow-sm border border-slate-100 overflow-hidden">
                            {selectedTask.assigned_by_pic ? (
                              <img 
                                src={`${import.meta.env.VITE_API_URL}/${selectedTask.assigned_by_pic}`} 
                                alt={selectedTask.assigned_by_name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              selectedTask.assigned_by_name?.charAt(0)
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-black text-[#1E184B]">{selectedTask.assigned_by_name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">HOD / Project Lead</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h3 className="text-xs font-black text-[#1E184B] uppercase tracking-widest flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#7C3AED]" /> Instructional Materials
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          {selectedTask.attachments.filter(a => a.entity_type === 'Task').map(att => (
                            <div key={att.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-[#7C3AED]/30 transition-all">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#7C3AED] shadow-sm">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-black text-[#1E184B] truncate max-w-[200px]">{att.file_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => handlePreview(att)} className="p-2.5 text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white rounded-xl transition-all"><Eye className="w-4 h-4" /></button>
                                <a href={getDownloadUrl(att.file_path)} download className="p-2.5 text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white rounded-xl transition-all"><Download className="w-4 h-4" /></a>
                              </div>
                            </div>
                          ))}
                          {selectedTask.attachments.filter(a => a.entity_type === 'Task').length === 0 && (
                            <p className="text-[10px] font-bold text-slate-400 italic">No reference files attached.</p>
                          )}
                        </div>
                      </div>
                  </div>

                  {/* Actions Column */}
                  <div className="lg:col-span-5 space-y-8">
                    {!['Submitted', 'Approved', 'Completed'].includes(selectedTask.status) && (
                      <div className="space-y-6">
                        <h3 className="text-xs font-black text-[#1E184B] uppercase tracking-widest flex items-center gap-2">
                          <Clock className="w-4 h-4 text-rose-500" /> Deadline Control
                        </h3>
                        <div className="p-6 bg-rose-50/50 border border-rose-100 rounded-[2.5rem] space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Current Deadline</p>
                              <p className="text-xl font-black text-[#1E184B]">{formatDate(selectedTask.deadline)}</p>
                            </div>
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-sm border border-rose-100">
                              <Calendar className="w-6 h-6" />
                            </div>
                          </div>

                          {(() => {
                            const latestRequest = [...extensionRequests]
                              .filter(r => r.task_id === selectedTask.id)
                              .sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime())[0];

                            if (latestRequest) {
                              const isPending = latestRequest.status === 'Pending';
                              const isApproved = latestRequest.status === 'Approved';
                              const isRejected = latestRequest.status === 'Rejected';

                              return (
                                <div className={cn(
                                  "p-5 rounded-2xl border flex flex-col gap-3",
                                  isPending ? "bg-amber-50/50 border-amber-100" :
                                  isApproved ? "bg-emerald-50/50 border-emerald-100" :
                                  "bg-rose-50/50 border-rose-100"
                                )}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className={cn("w-2 h-2 rounded-full", 
                                        isPending ? "bg-amber-500 animate-pulse" : 
                                        isApproved ? "bg-emerald-500" : "bg-rose-500"
                                      )} />
                                      <p className={cn("text-[10px] font-black uppercase tracking-widest",
                                        isPending ? "text-amber-600" : 
                                        isApproved ? "text-emerald-600" : "text-rose-600"
                                      )}>
                                        Extension {latestRequest.status}
                                      </p>
                                    </div>
                                    <span className="text-[8px] font-bold text-slate-400">{formatDate(latestRequest.requested_at)}</span>
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <p className="text-[11px] font-bold text-[#1E1B4B]">
                                      Requested: <span className="font-black">{formatDate(latestRequest.requested_deadline)}</span>
                                    </p>
                                    {latestRequest.hod_remarks && (
                                      <p className="text-[10px] font-medium text-slate-500 italic bg-white/50 p-3 rounded-xl border border-slate-100/50">
                                        HOD: "{latestRequest.hod_remarks}"
                                      </p>
                                    )}
                                  </div>

                                  {isRejected && (
                                    <button 
                                      onClick={() => setIsExtensionModalOpen(true)}
                                      className="w-full py-2 bg-white border border-rose-100 text-rose-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all"
                                    >
                                      Re-request Extension
                                    </button>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <button 
                                onClick={() => setIsExtensionModalOpen(true)}
                                className="w-full py-4 bg-white border-2 border-dashed border-rose-200 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-rose-50 hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                              >
                                <ArrowRight className="w-4 h-4" /> Request Extension
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                      <h3 className="text-xs font-black text-[#1E184B] uppercase tracking-widest mb-6">Mission Progress</h3>
                      
                      <div className="space-y-8">
                        {/* Progress Tracker */}
                        {['Accepted', 'In Progress', 'Rework Required'].includes(selectedTask.status) && (
                          <div className="space-y-6">
                            <div className="flex justify-between items-end">
                              <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mission Completion</label>
                                <p className="text-2xl font-black text-[#1E184B]">{selectedTask.progress}%</p>
                              </div>
                              <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-100">
                                {selectedTask.progress === 100 ? 'Finalized' : 'In Field'}
                              </span>
                            </div>
                            
                            <div className="relative h-4 bg-white border border-slate-100 rounded-full overflow-hidden p-1">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${selectedTask.progress}%` }}
                                className="h-full bg-gradient-to-r from-[#7C3AED] to-blue-500 rounded-full shadow-lg shadow-[#7C3AED]/20"
                              />
                            </div>

                            <p className="text-[9px] font-bold text-slate-400 italic leading-relaxed">
                              Mission progress is automatically calculated based on your current protocol state.
                            </p>
                          </div>
                        )}

                        <div className="space-y-4">
                          {selectedTask.status === 'Assigned' && (
                            <div className="grid grid-cols-2 gap-3">
                              <button 
                                onClick={() => handleUpdateStatus(selectedTask.id, 'Accepted')}
                                className="py-4 bg-[#7C3AED] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#7C3AED]/20 hover:bg-[#6D28D9] transition-all"
                              >
                                Accept Task
                              </button>
                              <button 
                                onClick={() => handleUpdateStatus(selectedTask.id, 'Declined')}
                                className="py-4 bg-white text-rose-500 border border-rose-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all"
                              >
                                Decline
                              </button>
                            </div>
                          )}

                          {['Accepted', 'In Progress', 'Rework Required'].includes(selectedTask.status) && (
                            <div className="space-y-3">
                              <button 
                                onClick={() => setIsSubmitModalOpen(true)}
                                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                              >
                                <Send className="w-4 h-4" />
                                Submit Final Evidence
                              </button>
                            </div>
                          )}

                          {selectedTask.status === 'Submitted' && (
                            <div className="p-6 bg-purple-50 rounded-2xl border border-purple-100 text-center">
                              <Send className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                              <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Awaiting HOD Review</p>
                              <p className="text-[9px] font-bold text-purple-400 mt-2">You'll be notified once evaluation is complete.</p>
                            </div>
                          )}

                          {['Approved', 'Completed'].includes(selectedTask.status) && (
                            <div className="p-8 bg-emerald-50 rounded-[2rem] border border-emerald-100 text-center relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-2">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500 opacity-20" />
                              </div>
                              <h4 className="text-sm font-black text-emerald-700 mb-1">Task Accomplished</h4>
                              <p className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest">Marked as finalized by HOD</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Collaborative Remarks & Comments Chain */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-[#1E184B] uppercase tracking-widest flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-[#7C3AED]" />
                          Mission Intelligence
                        </h3>
                        <span className="px-2 py-0.5 bg-[#7C3AED]/10 text-[#7C3AED] text-[8px] font-black rounded-full uppercase">
                          {(selectedTask.comments?.length || 0) + (selectedTask.teammate_remarks?.length || 0)} Entries
                        </span>
                      </div>

                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {/* Initial Public Remarks from Teammates */}
                        {selectedTask.teammate_remarks?.map((rem: any, i: number) => (
                          <div key={`rem-${i}`} className="p-4 bg-white border border-[#7C3AED]/5 rounded-2xl shadow-sm space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full overflow-hidden border border-[#7C3AED]/20">
                                  {rem.faculty_pic ? (
                                    <img 
                                      src={`${import.meta.env.VITE_API_URL}/${rem.faculty_pic}`} 
                                      alt={rem.faculty_name} 
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-[#7C3AED]/10 flex items-center justify-center text-[8px] font-black text-[#7C3AED]">
                                      {rem.faculty_name.charAt(0)}
                                    </div>
                                  )}
                                </div>
                                <span className="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest">{rem.faculty_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-400">{rem.progress}% Progress</span>
                                <span className="px-2 py-0.5 bg-[#7C3AED]/5 text-[#7C3AED] text-[8px] font-black rounded-full uppercase tracking-tighter">{rem.status}</span>
                              </div>
                            </div>
                            <p className="text-xs font-medium text-[#1E184B]/80 leading-relaxed italic">
                              "{rem.public_remarks}"
                            </p>
                          </div>
                        ))}

                        {/* Threaded Comments */}
                        {selectedTask.comments?.map((com: any) => (
                          <div key={`com-${com.id}`} className={cn(
                            "p-4 rounded-2xl space-y-2 border animate-in fade-in slide-in-from-bottom-2",
                            com.user_id === userId 
                              ? "bg-indigo-50/50 border-indigo-100 ml-8" 
                              : "bg-slate-50 border-slate-100 mr-8"
                          )}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-5 h-5 rounded-full overflow-hidden border",
                                  com.user_id === userId ? "border-indigo-200" : "border-slate-200"
                                )}>
                                  {com.user_pic ? (
                                    <img 
                                      src={`${import.meta.env.VITE_API_URL}/${com.user_pic}`} 
                                      alt={com.user_name} 
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className={cn(
                                      "w-full h-full flex items-center justify-center text-[8px] font-black",
                                      com.user_id === userId ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-600"
                                    )}>
                                      {com.user_name.charAt(0)}
                                    </div>
                                  )}
                                </div>
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", com.user_id === userId ? "text-indigo-600" : "text-slate-600")}>
                                  {com.user_id === userId ? "You" : com.user_name}
                                </span>
                              </div>
                              <span className="text-[8px] font-bold text-slate-400">{formatDate(com.created_at)}</span>
                            </div>
                            <p className="text-xs font-medium text-[#1E184B]/80 leading-relaxed">
                              {com.comment}
                            </p>
                          </div>
                        ))}

                        {(!selectedTask.teammate_remarks?.length && !selectedTask.comments?.length) && (
                          <div className="py-10 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-20" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No intelligence shared yet</p>
                          </div>
                        )}
                      </div>

                      {/* Reply Input */}
                      <form onSubmit={handleAddComment} className="relative">
                        <input 
                          type="text"
                          placeholder="Contribute to mission intelligence..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="w-full pl-6 pr-14 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-[#1E184B] focus:outline-none focus:ring-4 focus:ring-[#7C3AED]/10 focus:border-[#7C3AED] transition-all"
                        />
                        <button 
                          type="submit"
                          disabled={isSubmittingComment || !newComment.trim()}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#7C3AED] text-white rounded-xl hover:bg-[#6D28D9] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {isSubmittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                      </form>
                    </div>

                    {/* My Remarks */}
                    {selectedTask.public_remarks && (
                      <div className="space-y-4">
                        <h3 className="text-xs font-black text-[#1E184B] uppercase tracking-widest flex items-center gap-2 opacity-40">
                          Your Public Record
                        </h3>
                        <div className="p-4 bg-[#7C3AED]/[0.03] border border-dashed border-[#7C3AED]/10 rounded-2xl">
                          <p className="text-xs font-medium text-[#1E184B]/60 italic leading-relaxed">
                            "{selectedTask.public_remarks}"
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="h-px bg-slate-100" />

                    {/* Your Submissions */}
                    <div>
                      <h3 className="text-xs font-black text-[#1E184B] uppercase tracking-widest mb-4">My Submissions</h3>
                      <div className="space-y-2">
                        {selectedTask.attachments.filter(a => a.entity_type === 'Task_Submission' && a.uploader_id == userId).map(att => (
                          <div key={att.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 group">
                            <span className="text-[10px] font-bold text-[#1E184B] truncate max-w-[150px]">{att.file_name}</span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => handlePreview(att)} className="p-1.5 text-slate-400 hover:text-[#7C3AED] transition-all"><Eye className="w-3.5 h-3.5" /></button>
                              <a href={getDownloadUrl(att.file_path)} download className="p-1.5 text-slate-400 hover:text-[#7C3AED] transition-all"><Download className="w-3.5 h-3.5" /></a>
                            </div>
                          </div>
                        ))}
                        {selectedTask.attachments.filter(a => a.entity_type === 'Task_Submission' && a.uploader_id == userId).length === 0 && (
                          <p className="text-[9px] font-bold text-slate-400 italic">No files submitted yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Submission Modal */}
      <AnimatePresence>
        {isSubmitModalOpen && selectedTask && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSubmitModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl">
              <h2 className="text-2xl font-black text-[#1E184B] mb-2">Finalize Mission</h2>
              <p className="text-slate-400 text-sm font-bold mb-8">Upload evidence if required, or simply finalize to notify the HOD.</p>
              
              <form onSubmit={handleSubmitTask} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="border-2 border-dashed border-slate-100 rounded-[2rem] p-8 text-center hover:border-[#7C3AED]/30 transition-all group relative">
                    <input 
                      type="file" 
                      multiple 
                      onChange={(e) => setSubmissionFiles(Array.from(e.target.files || []))}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-[#7C3AED]/5 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Plus className="w-6 h-6 text-[#7C3AED]" />
                      </div>
                      <p className="text-xs font-black text-[#1E184B] uppercase tracking-widest">Add Evidence (Optional)</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">PDF, Images, Word documents</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-[0.2em] ml-2">Public Remarks (Team)</label>
                      <textarea 
                        value={publicRemarks}
                        onChange={(e) => setPublicRemarks(e.target.value)}
                        placeholder="Visible to all team members..."
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:border-[#7C3AED] transition-all resize-none h-20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] ml-2">Private Note (HOD)</label>
                      <textarea 
                        value={privateRemarks}
                        onChange={(e) => setPrivateRemarks(e.target.value)}
                        placeholder="Visible only to HOD..."
                        className="w-full p-4 bg-amber-50/30 border border-amber-100 rounded-2xl text-xs font-bold focus:bg-white focus:border-amber-500 transition-all resize-none h-20"
                      />
                    </div>
                  </div>
                </div>

                {submissionFiles.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                    {submissionFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 animate-in slide-in-from-left duration-200">
                        <span className="text-[10px] font-bold text-[#1E184B] truncate">{file.name}</span>
                        <button type="button" onClick={() => setSubmissionFiles(f => f.filter((_, i) => i !== idx))}><X className="w-4 h-4 text-rose-500" /></button>
                      </div>
                    ))}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[#7C3AED] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[#7C3AED]/20 hover:bg-[#6D28D9] disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-3"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Confirm Submission
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && previewFile && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPreviewOpen(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white rounded-[3rem] w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-6 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-[#7C3AED]" />
                  <span className="font-black text-[#1E184B] truncate max-w-md">{previewFile.name}</span>
                </div>
                <button onClick={() => setIsPreviewOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all"><X className="w-6 h-6 text-slate-400" /></button>
              </div>
              <div className="flex-1 bg-slate-100 p-4 overflow-hidden">
                {['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(previewFile.type) ? (
                  <img src={previewFile.url} alt={previewFile.name} className="w-full h-full object-contain rounded-2xl" />
                ) : previewFile.type === 'pdf' ? (
                  <iframe src={previewFile.url} className="w-full h-full rounded-2xl" title="PDF Preview" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <FileText className="w-16 h-16 mb-4 opacity-20" />
                    <p className="font-bold">No Preview Available for this file type.</p>
                    <a href={getDownloadUrl(previewFile.url.replace(`${import.meta.env.VITE_API_URL}/`, ''))} download className="mt-4 px-6 py-2 bg-[#7C3AED] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#6D28D9] transition-all">Download to View</a>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Deadline Extension Modal */}
      <AnimatePresence>
        {isExtensionModalOpen && selectedTask && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsExtensionModalOpen(false)}
              className="absolute inset-0 bg-[#1E184B]/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-[#1E184B]">Request Extension</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Deadline Adjustment</p>
                  </div>
                  <button onClick={() => setIsExtensionModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
                    <X className="w-5 h-5 text-slate-300" />
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <form onSubmit={handleRequestExtension} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest ml-2">Proposed New Deadline</label>
                    <input 
                      type="datetime-local" required
                      min={new Date().toISOString().split('T')[0] + 'T00:00'}
                      value={extensionDate}
                      onChange={(e) => setExtensionDate(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-[#1E184B] focus:ring-4 focus:ring-rose-500/5 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest ml-2">Reason for Extension</label>
                    <textarea 
                      required
                      placeholder="Explain why the current deadline cannot be met..."
                      value={extensionReason}
                      onChange={(e) => setExtensionReason(e.target.value)}
                      className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-[#1E184B] focus:bg-white focus:border-rose-500 transition-all resize-none h-32"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <button 
                      type="button" 
                      onClick={() => setIsExtensionModalOpen(false)}
                      className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isRequestingExtension}
                      className="flex-2 px-8 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
                    >
                      {isRequestingExtension ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Request'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FacultyMyTasks;
