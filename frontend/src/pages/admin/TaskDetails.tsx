import React, { useState, useEffect, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Loader2, Calendar, Clock, Target, Shield, School, Building2, User, FileText, Download, Eye, MessageSquare, History, CheckCircle2, AlertTriangle, AlertCircle, Sparkles, Send, Trash2, ZoomIn, ZoomOut, RotateCw, RotateCcw, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';
import { cn, formatDate, getDownloadUrl } from '@/lib/utils';
import Swal from 'sweetalert2';

interface Assignment {
  id: number;
  user_id: number;
  faculty_name: string;
  faculty_email: string;
  faculty_pic: string | null;
  designation: string;
  department_name: string;
  status: string;
  progress: number;
  points: number;
  bonus_points: number;
  remarks: string | null;
  public_remarks: string | null;
  private_remarks: string | null;
  submission_link: string | null;
  submitted_at: string | null;
  completed_at: string | null;
}

interface Attachment {
  id: number;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  entity_type: string;
  uploader_name: string | null;
  created_at: string;
}

interface Review {
  id: number;
  remarks: string;
  points: number;
  bonus_points: number;
  status: string;
  reviewer_name: string;
  created_at: string;
}

interface Comment {
  id: number;
  user_id: number;
  user_name: string;
  user_pic: string | null;
  comment: string;
  created_at: string;
}

interface AuditLog {
  id: number;
  action_type: string;
  target_type: string;
  target_id: number;
  description: string;
  user_name: string | null;
  user_email: string | null;
  created_at: string;
}

interface TaskDetailsData {
  progress: number;
  id: number;
  title: string;
  description: string;
  status: string;
  priority: 'High' | 'Medium' | 'Low' | 'Critical';
  task_type: string;
  category: string;
  deadline: string;
  college_name: string;
  department_name: string;
  assigned_to_name: string | null;
  assigned_to_email: string | null;
  assigned_by_name: string | null;
  assigned_by_email: string | null;
  created_at: string;
  points: number;
  bonus_points: number;
  remarks: string | null;
  task_link: string | null;
  assignments: Assignment[];
  attachments: Attachment[];
  reviews: Review[];
  comments: Comment[];
  audit_logs: AuditLog[];
}

export default function AdminTaskDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [task, setTask] = useState<TaskDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'documents' | 'comments' | 'logs'>('members');

  // Preview state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{url: string, name: string, type: string} | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewRotate, setPreviewRotate] = useState(0);

  const fetchTaskDetails = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/tasks.php?id=${id}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        setTask(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch details');
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
    const interval = setInterval(() => {
      fetchTaskDetails(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [id]);

  const handleDeleteTask = async () => {
    if (!task) return;
    const result = await Swal.fire({
      title: 'Purge Task?',
      text: "Are you sure you want to permanently delete this task? All submissions, attachments, points, and logs will be permanently removed.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, Purge',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/tasks.php?id=${task.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        const data = await response.json();
        if (data.status === 'success') {
          Swal.fire('Deleted!', 'The task record has been purged.', 'success');
          navigate('/admin/tasks');
        } else {
          Swal.fire('Error', data.message || 'Deletion failed', 'error');
        }
      } catch (error) {
        Swal.fire('Error', 'Failed to delete task', 'error');
      }
    }
  };

  const handlePreview = (file: Attachment) => {
    const url = `${getDownloadUrl(file.file_path)}&inline=1`;
    const ext = file.file_name.split('.').pop()?.toLowerCase() || '';
    setPreviewFile({ url, name: file.file_name, type: ext });
    setPreviewZoom(1);
    setPreviewRotate(0);
    setIsPreviewOpen(true);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Completed': case 'Approved': return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
      case 'In Progress': return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30';
      case 'Assigned': return 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30';
      case 'Submitted': return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
      case 'Under Review': return 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30';
      case 'Rework Required': return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30';
      default: return 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800/30';
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'text-rose-600 bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30';
      case 'High': return 'text-orange-600 bg-orange-50 border border-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30';
      case 'Medium': return 'text-amber-600 bg-amber-50 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
      default: return 'text-emerald-600 bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-[#0E0820] flex flex-col items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-[#7C3AED]/20 rounded-full blur-xl animate-pulse" />
          <Loader2 className="w-10 h-10 animate-spin text-[#7C3AED] relative z-10" />
        </div>
        <p className="text-xs font-black text-slate-400 dark:text-violet-400/60 uppercase tracking-widest mt-6">Decrypting Mission Details...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-[#0E0820] flex flex-col items-center justify-center pb-32">
        <div className="p-8 bg-white dark:bg-[#1A0F35] rounded-[2rem] border border-slate-100 dark:border-violet-500/10 shadow-xl text-center max-w-sm">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-[#1E184B] dark:text-indigo-100 mb-2">Record Not Found</h2>
          <p className="text-slate-505 dark:text-violet-400/60 text-sm mb-6">The requested task details are not available or access is restricted.</p>
          <button onClick={() => navigate('/admin/tasks')} className="px-6 py-3 bg-[#7C3AED] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#6D28D9] transition-all">
            Return to Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#0E0820] pb-32">
      <SEO title={`Admin Oversight: ${task.title}`} />
      
      {/* Header Bar */}
      <div className="bg-white dark:bg-[#110A24] border-b border-slate-200/60 dark:border-violet-500/15 px-4 md:px-8 py-4 shadow-sm sticky top-0 z-50">
        <div className="max-w-[1500px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3 md:gap-4 min-w-0">
            <button 
              onClick={() => navigate('/admin/tasks')}
              className="p-2.5 bg-slate-50 dark:bg-[#1A0F35] text-slate-500 dark:text-violet-400 hover:text-[#7C3AED] rounded-xl transition-all shrink-0 border border-slate-100 dark:border-violet-500/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base md:text-xl font-black text-[#1E184B] dark:text-indigo-100 truncate max-w-[240px] sm:max-w-md md:max-w-2xl" title={task.title}>{task.title}</h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border shrink-0", getStatusStyle(task.status))}>
                  {task.status}
                </span>
                <span className="text-[9px] md:text-[10px] font-bold text-slate-500 dark:text-violet-400/60 flex items-center gap-1 bg-slate-50 dark:bg-[#1A0F35]/40 border border-slate-100 dark:border-violet-500/10 px-2 py-0.5 rounded-lg shrink-0">
                  <Calendar className="w-3 h-3 text-[#7C3AED]" /> Created: <span className="font-extrabold text-slate-700 dark:text-violet-300">{formatDate(task.created_at)}</span>
                </span>
                <span className="text-[9px] md:text-[10px] font-black text-rose-600 dark:text-rose-400 flex items-center gap-1 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 px-2 py-0.5 rounded-lg shrink-0">
                  <Clock className="w-3 h-3 text-rose-500 animate-pulse" /> Deadline: <span className="font-extrabold text-rose-600 dark:text-rose-400">{formatDate(task.deadline)}</span>
                </span>
              </div>
            </div>
          </div>
          
          {/* <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={handleDeleteTask}
              className="px-4 py-2.5 bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-600 transition-all flex items-center gap-2 shadow-lg shadow-rose-500/20 whitespace-nowrap cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Purge Record
            </button>
          </div> */}
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-4 md:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Core docket & left sidebar info */}
        <div className="lg:col-span-4 space-y-6">
          {/* Metadata Sidebar */}
          <div className="bg-white dark:bg-[#1A0F35]/25 border-2 border-slate-100 dark:border-violet-500/15 p-6 rounded-[2rem] shadow-xl shadow-slate-200/10 dark:shadow-violet-900/10 space-y-6">
            <h3 className="text-xs font-black text-slate-400 dark:text-violet-400/80 uppercase tracking-widest">Administrative Docket</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-black text-slate-400 dark:text-violet-400 uppercase tracking-widest mb-1">Institution</p>
                <div className="flex items-center gap-2.5 text-sm font-bold text-[#1E184B] dark:text-indigo-100">
                  <School className="w-4 h-4 text-[#7C3AED]" />
                  <span>{task.college_name}</span>
                </div>
              </div>

              <div>
                <p className="text-[9px] font-black text-slate-400 dark:text-violet-400 uppercase tracking-widest mb-1">Department</p>
                <div className="flex items-center gap-2.5 text-sm font-bold text-[#1E184B]/80 dark:text-indigo-200">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>{task.department_name}</span>
                </div>
              </div>

              <div>
                <p className="text-[9px] font-black text-slate-400 dark:text-violet-400 uppercase tracking-widest mb-1">Assigned By (HOD)</p>
                <div className="flex items-center gap-2.5 text-sm font-bold text-[#1E184B]/80 dark:text-indigo-200">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>{task.assigned_by_name || 'N/A'}</span>
                </div>
              </div>

              <div>
                <p className="text-[9px] font-black text-slate-400 dark:text-violet-400 uppercase tracking-widest mb-1">Priority / Type</p>
                <div className="flex items-center gap-2">
                  <span className={cn("px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest", getPriorityStyle(task.priority))}>
                    {task.priority} Priority
                  </span>
                  <span className="px-2.5 py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-violet-500/10 text-[9px] font-black text-slate-500 dark:text-violet-300 uppercase rounded-lg">
                    {task.task_type}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[9px] font-black text-slate-400 dark:text-violet-400 uppercase tracking-widest mb-1">Aggregated Merit Metrics</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black border border-emerald-100 dark:border-emerald-500/20">
                    {task.points} PTS
                  </div>
                  {task.bonus_points > 0 && (
                    <div className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black border border-amber-100 dark:border-amber-500/20">
                      +{task.bonus_points} BONUS
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Overall Progress */}
            <div className="pt-4 border-t border-slate-100 dark:border-violet-500/10 space-y-2">
              <div className="flex justify-between items-center text-xs font-black">
                <span className="text-slate-400 uppercase tracking-wider">Overall Completion</span>
                <span className="text-[#7C3AED] dark:text-violet-400">{task.progress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${task.progress}%` }}
                  className={cn("h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-blue-500")}
                />
              </div>
            </div>
          </div>

          {/* HOD Review Remarks */}
          {task.reviews && task.reviews.length > 0 && (
            <div className="bg-white dark:bg-[#1A0F35]/25 border-2 border-slate-100 dark:border-violet-500/15 p-6 rounded-[2rem] shadow-xl shadow-slate-200/10 dark:shadow-violet-900/10 space-y-4">
              <h3 className="text-xs font-black text-slate-400 dark:text-violet-400/80 uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#7C3AED]" /> Evaluator Decision Logs
              </h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {task.reviews.map((rev) => (
                  <div key={rev.id} className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100/60 dark:border-violet-500/10 space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                      <span className="text-[#1E184B] dark:text-indigo-200 font-extrabold">{rev.reviewer_name}</span>
                      <span>{formatDate(rev.created_at)}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-600 dark:text-violet-200 italic">
                      "{rev.remarks}"
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border", getStatusStyle(rev.status))}>{rev.status}</span>
                      <span className="text-[10px] font-black text-emerald-600">+{rev.points + rev.bonus_points} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Workspace details - tabs & tables */}
        <div className="lg:col-span-8 space-y-8">
          {/* Mission Briefing */}
          <div className="bg-white dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/15 p-6 rounded-[2rem] shadow-sm space-y-3">
            <h3 className="text-xs font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#7C3AED]" /> Briefing Description
            </h3>
            <p className="text-sm font-medium text-slate-600 dark:text-violet-200 leading-relaxed whitespace-pre-wrap">
              {task.description || <span className="italic text-slate-400">No core description provided.</span>}
            </p>
            {task.task_link && (
              <div className="pt-2">
                <a href={task.task_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-black text-[#7C3AED] hover:underline">
                  Reference Asset Link &rarr;
                </a>
              </div>
            )}
          </div>

          {/* Sub Tab Controls */}
          <div className="flex border-b border-slate-100 dark:border-violet-500/10 gap-8 overflow-x-auto pb-1 shrink-0">
            {[
              { id: 'members', label: 'Engaged Operatives', count: task.assignments?.length || 0 },
              { id: 'documents', label: 'Instructional & Submitted Files', count: task.attachments?.length || 0 },
              { id: 'comments', label: 'Chats / Comments', count: task.comments?.length || 0 },
              { id: 'logs', label: 'Oversight Logs', count: task.audit_logs?.length || 0 }
            ].map(subTab => (
              <button
                key={subTab.id}
                onClick={() => setActiveSubTab(subTab.id as any)}
                className={cn(
                  "pb-4 font-black text-xs sm:text-sm uppercase tracking-wider relative transition-all flex items-center gap-2 border-b-2 border-transparent whitespace-nowrap cursor-pointer",
                  activeSubTab === subTab.id 
                    ? "text-[#7C3AED] dark:text-violet-400 border-[#7C3AED]" 
                    : "text-slate-400 dark:text-violet-400/40 hover:text-[#1E184B] dark:hover:text-indigo-200"
                )}
              >
                {subTab.label}
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-black transition-colors",
                  activeSubTab === subTab.id
                    ? "bg-[#7C3AED]/10 text-[#7C3AED] dark:bg-violet-500/20 dark:text-violet-300"
                    : "bg-slate-100 text-slate-500 dark:bg-[#1A0F35]/80 dark:text-violet-400/50"
                )}>
                  {subTab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Tab Content Display */}
          <AnimatePresence mode="wait">
            {activeSubTab === 'members' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="members" className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {task.assignments && task.assignments.length > 0 ? (
                    task.assignments.map((member) => (
                      <div key={member.id} className="bg-white dark:bg-[#110A24] p-5 rounded-[2rem] border border-slate-100 dark:border-violet-500/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-[#1A0F35] flex items-center justify-center font-black text-[#1E184B] dark:text-indigo-100 shadow-inner border border-slate-100 dark:border-violet-500/10 overflow-hidden shrink-0">
                            {member.faculty_pic ? (
                              <img src={`${import.meta.env.VITE_API_URL}/${member.faculty_pic}`} alt={member.faculty_name} className="w-full h-full object-cover" />
                            ) : (
                              member.faculty_name.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-black text-[#1E184B] dark:text-indigo-100 truncate">{member.faculty_name}</h4>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-violet-400/50 truncate">
                              {member.designation || 'Faculty'} • {member.department_name}
                            </p>
                          </div>
                        </div>

                        {/* Status badge and individual progress */}
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex flex-col text-right">
                            <span className="text-[9px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest">Progress</span>
                            <span className="text-sm font-black text-[#1E184B] dark:text-indigo-100">{member.progress}%</span>
                          </div>
                          <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0 hidden sm:block">
                            <div className="h-full bg-[#7C3AED] rounded-full" style={{ width: `${member.progress}%` }} />
                          </div>
                          <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shrink-0", getStatusStyle(member.status))}>
                            {member.status}
                          </div>
                        </div>

                        {/* Submissions / Links / Points */}
                        <div className="flex items-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-violet-500/10">
                          {member.submission_link && (
                            <a href={member.submission_link} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-[#7C3AED]/10 text-[#7C3AED] rounded-xl text-[10px] font-black hover:bg-[#7C3AED] hover:text-white transition-all uppercase tracking-wider">
                              Open Link
                            </a>
                          )}
                          <div className="text-right">
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                              {member.points + member.bonus_points} pts
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 bg-white dark:bg-[#110A24] text-center rounded-[2rem] border border-slate-100 dark:border-violet-500/10">
                      <p className="text-sm font-bold text-slate-400 italic">No faculty members engaged in this mission record.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeSubTab === 'documents' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="documents" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {task.attachments && task.attachments.length > 0 ? (
                    task.attachments.map((file) => (
                      <div key={file.id} className="bg-white dark:bg-[#110A24] p-4 rounded-[2rem] border border-slate-100 dark:border-violet-500/10 flex items-center justify-between group hover:border-[#7C3AED]/35 transition-all">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-[#1A0F35] flex items-center justify-center text-[#7C3AED] group-hover:bg-[#7C3AED]/10 transition-colors shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="text-xs font-black text-[#1E184B] dark:text-indigo-100 truncate" title={file.file_name}>{file.file_name}</h4>
                            <p className="text-[9px] text-slate-400 dark:text-violet-400/50 font-bold uppercase mt-0.5">
                              {file.entity_type === 'Task' ? 'Instructional Docket' : `Submission: ${file.uploader_name || 'Personnel'}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <button onClick={() => handlePreview(file)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-violet-950/20 rounded-lg transition-all">
                            <Eye className="w-4 h-4" />
                          </button>
                          <a href={getDownloadUrl(file.file_path)} download className="p-2 text-slate-400 hover:text-[#7C3AED] hover:bg-slate-50 dark:hover:bg-violet-950/20 rounded-lg transition-all">
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-12 bg-white dark:bg-[#110A24] text-center rounded-[2rem] border border-slate-100 dark:border-violet-500/10">
                      <p className="text-sm font-bold text-slate-400 italic">No files associated with this record.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeSubTab === 'comments' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="comments" className="space-y-4">
                <div className="bg-white dark:bg-[#110A24] p-6 rounded-[2rem] border border-slate-100 dark:border-violet-500/10 shadow-sm space-y-6">
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {task.comments && task.comments.length > 0 ? (
                      task.comments.map((com) => (
                        <div key={com.id} className="flex gap-3 text-xs">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-[#1A0F35] flex items-center justify-center font-black text-slate-500 border border-slate-100 overflow-hidden shrink-0">
                            {com.user_pic ? (
                              <img src={`${import.meta.env.VITE_API_URL}/${com.user_pic}`} alt={com.user_name} className="w-full h-full object-cover" />
                            ) : (
                              com.user_name.charAt(0)
                            )}
                          </div>
                          <div className="bg-slate-50 dark:bg-[#1A0F35]/40 rounded-2xl p-3 flex-1 border border-slate-100 dark:border-violet-500/5">
                            <div className="flex justify-between items-center mb-1 font-bold text-[10px] text-slate-400">
                              <span className="text-[#1E184B] dark:text-indigo-200 font-extrabold">{com.user_name}</span>
                              <span>{formatDate(com.created_at)}</span>
                            </div>
                            <p className="text-slate-600 dark:text-violet-100 leading-relaxed font-medium">{com.comment}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-10 text-center bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl border-2 border-dashed border-slate-200 dark:border-violet-500/10">
                        <MessageSquare className="w-8 h-8 text-slate-300 dark:text-violet-500/20 mx-auto mb-2" />
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No Intelligence Shared Yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeSubTab === 'logs' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="logs" className="space-y-4">
                <div className="bg-white dark:bg-[#110A24] p-6 rounded-[2rem] border border-slate-100 dark:border-violet-500/10 shadow-sm space-y-4">
                  <div className="flow-root">
                    <ul className="-mb-8">
                      {task.audit_logs && task.audit_logs.length > 0 ? (
                        task.audit_logs.map((log, logIdx) => (
                          <li key={log.id}>
                            <div className="relative pb-8">
                              {logIdx !== task.audit_logs.length - 1 ? (
                                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-100 dark:bg-violet-500/10" aria-hidden="true" />
                              ) : null}
                              <div className="relative flex space-x-3 text-xs">
                                <div>
                                  <span className="h-8 w-8 rounded-full bg-slate-50 dark:bg-[#1A0F35] flex items-center justify-center text-[#7C3AED] dark:text-violet-400 border border-slate-100 dark:border-violet-500/10 shadow-sm">
                                    <History className="w-4 h-4" />
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                                  <div>
                                    <p className="text-slate-600 dark:text-violet-200 font-bold">
                                      {log.description}
                                    </p>
                                    {log.user_name && (
                                      <p className="text-[10px] text-slate-400 dark:text-violet-400/60 font-semibold mt-0.5">
                                        Action by: {log.user_name} ({log.user_email})
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right whitespace-nowrap text-[10px] font-black text-slate-400 dark:text-violet-500/50 uppercase tracking-tight shrink-0">
                                    {formatDate(log.created_at)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))
                      ) : (
                        <div className="py-8 text-center text-slate-400 dark:text-violet-500/40 italic">
                          No historical logs recorded for this task.
                        </div>
                      )}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && previewFile && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPreviewOpen(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white dark:bg-[#130C24] rounded-[3rem] w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-transparent dark:border-violet-500/20">
              <div className="p-6 border-b border-slate-100 dark:border-violet-500/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileText className="w-5 h-5 text-[#7C3AED] shrink-0" />
                  <span className="font-black text-[#1E184B] dark:text-indigo-100 truncate block w-full text-sm sm:text-base">{previewFile.name}</span>
                </div>
                <button 
                  onClick={() => setIsPreviewOpen(false)} 
                  className="p-2 hover:bg-slate-50 dark:hover:bg-[#1A0F35] rounded-xl transition-all shrink-0 cursor-pointer"
                  aria-label="Close Preview"
                >
                  <X className="w-6 h-6 text-slate-400 dark:text-violet-400" />
                </button>
              </div>
              <div className="flex-1 bg-slate-100 dark:bg-[#0E0820] p-4 overflow-hidden flex flex-col">
                {['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(previewFile.type) ? (
                  <div className="relative w-full h-full flex flex-col overflow-hidden">
                    {/* Floating Glassmorphic Toolbar */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-slate-700/50">
                      <button 
                        onClick={() => setPreviewZoom(z => Math.max(0.5, z - 0.25))}
                        className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <span className="text-white text-xs font-black min-w-[36px] text-center select-none">{Math.round(previewZoom * 100)}%</span>
                      <button 
                        onClick={() => setPreviewZoom(z => Math.min(4, z + 0.25))}
                        className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <div className="w-[1px] h-4 bg-slate-700" />
                      <button 
                        onClick={() => setPreviewRotate(r => (r + 90) % 360)}
                        className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="Rotate Right"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => { setPreviewZoom(1); setPreviewRotate(0); }}
                        className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="Reset"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Scrollable Container with Pan Effect */}
                    <div className="flex-1 overflow-auto p-12 flex items-center justify-center bg-slate-900/5 dark:bg-slate-950/10 min-h-0">
                      <img 
                        src={previewFile.url} 
                        alt={previewFile.name} 
                        style={{ 
                          transform: `scale(${previewZoom}) rotate(${previewRotate}deg)`, 
                          transition: 'transform 0.15s ease-out',
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain'
                        }} 
                      />
                    </div>
                  </div>
                ) : previewFile.type === 'pdf' ? (
                  <iframe src={previewFile.url} className="w-full h-full rounded-2xl animate-fade-in" title="PDF Preview" />
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
    </div>
  );
}
