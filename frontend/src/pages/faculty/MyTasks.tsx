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
  ArrowRight,
  BookOpen,
  Layers,
  Link,
  Users,
  Paperclip,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';
import { cn, formatDate, getDownloadUrl, calculateProgress, getDeadlineStatus } from '@/lib/utils';
import Swal from 'sweetalert2';
import DateTimePicker from '@/components/ui/DateTimePicker';
import { CollaboratorProfileModal } from '@/components/common/CollaboratorProfileModal';

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
  assigned_by_role_id?: number;
  attachment_count: number;
  attachments: Attachment[];
  points: number;
  bonus_points: number;
  progress: number;
  flag_color: string | null;
  task_link?: string | null;
  submission_link?: string | null;
  public_remarks: string | null;
  private_remarks: string | null;
  my_remarks: string | null;
  is_delayed?: number;
  assignment_mode: 'individual' | 'group' | 'broadcast';
  team_members?: {
    user_id: number;
    status: string;
    progress: number;
    faculty_name: string;
    faculty_pic: string | null;
    faculty_email: string;
    designation: string;
    is_public: number;
    department_name?: string;
  }[];
  teammate_remarks?: {
    public_remarks: string;
    faculty_name: string;
    faculty_pic: string | null;
    status: string;
    progress: number;
  }[];
  overall_status: string;
  overall_completed_at: string | null;
  completion_reason: string | null;
  flow_type: 'Regular' | 'Rework';
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
  const allowDecline = user.features ? (user.features.allow_task_decline !== false) : true;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'pending_submission' | 'completed'>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publicRemarks, setPublicRemarks] = useState('');
  const [privateRemarks, setPrivateRemarks] = useState('');
  const [submissionFiles, setSubmissionFiles] = useState<File[]>([]);
  const [submissionLink, setSubmissionLink] = useState('');
  
  // Preview State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{url: string, name: string, type: string} | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewRotate, setPreviewRotate] = useState(0);

  // Extension State
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [extensionDate, setExtensionDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [isRequestingExtension, setIsRequestingExtension] = useState(false);
  const [extensionRequests, setExtensionRequests] = useState<any[]>([]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [selectedTeammateId, setSelectedTeammateId] = useState<number | null>(null);
  const [isTeammateModalOpen, setIsTeammateModalOpen] = useState(false);

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

  const getMinExtensionDate = () => {
    if (!selectedTask) return '';
    
    const now = new Date();
    const nowStr = now.getFullYear() + '-' + 
      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
      String(now.getDate()).padStart(2, '0') + 'T' + 
      String(now.getHours()).padStart(2, '0') + ':' + 
      String(now.getMinutes()).padStart(2, '0');
      
    const currentDeadline = selectedTask.deadline ? selectedTask.deadline.replace(' ', 'T').substring(0, 16) : '';
    
    if (!currentDeadline) return nowStr;
    
    const nowTime = now.getTime();
    const deadlineTime = new Date(selectedTask.deadline.replace(' ', 'T')).getTime();
    
    return deadlineTime > nowTime ? currentDeadline : nowStr;
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const taskIdParam = params.get('taskId');
    if (taskIdParam && tasks.length > 0) {
      const foundTask = tasks.find(t => t.id === parseInt(taskIdParam));
      if (foundTask) {
        setSelectedTask(foundTask);
        setIsDetailModalOpen(true);
        // Clear param from URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [tasks]);

  const handleRequestExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !extensionDate || !extensionReason) return;

    const selectedTime = new Date(extensionDate).getTime();
    const minAllowedTime = new Date(getMinExtensionDate()).getTime();
    if (selectedTime < minAllowedTime) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Date/Time',
        text: 'The proposed deadline extension cannot be prior to the current allotted deadline or in the past.'
      });
      return;
    }

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
          if (status === 'Declined') {
            setIsDetailModalOpen(false);
            setSelectedTask(null);
          } else {
            setSelectedTask(prev => prev ? ({ ...prev, status, progress: progress ?? prev.progress }) : null);
          }
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
    formData.append('submission_link', submissionLink);

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
          text: 'The HOD has been notified. Stand by for review.',
          icon: 'success',
          customClass: {
            popup: 'rounded-[2rem]'
          }
        });
        setIsSubmitModalOpen(false);
        setPublicRemarks('');
        setPrivateRemarks('');
        setSubmissionFiles([]);
        setSubmissionLink('');
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
    const url = `${getDownloadUrl(file.file_path)}&inline=1`;
    const ext = file.file_name.split('.').pop()?.toLowerCase() || '';
    setPreviewFile({ url, name: file.file_name, type: ext });
    setPreviewZoom(1);
    setPreviewRotate(0);
    setIsPreviewOpen(true);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Assigned': return { color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/20', label: 'Assigned', icon: Clock };
      case 'Accepted': return { color: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/20', label: 'Accepted', icon: CheckCircle2 };
      case 'In Progress': return { color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20', label: 'In Progress', icon: Loader2 };
      case 'Submitted': return { color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/20', label: 'For Review', icon: Send };
      case 'Approved':
      case 'Completed': return { color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/20', label: 'Completed', icon: CheckCircle2 };
      case 'Rejected':
      case 'Declined': return { color: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/20', label: 'Rejected', icon: X };
      case 'Rework Required': return { color: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/20', label: 'Rework Needed', icon: History };
      default: return { color: 'text-slate-400 dark:text-slate-500', bg: 'bg-slate-50 dark:bg-slate-900/20', label: status, icon: AlertCircle };
    }
  };

  const getFlagConfig = (color: string | null) => {
    switch (color) {
      case 'Red': return { bg: 'bg-rose-500', text: 'text-rose-500 dark:text-rose-400', label: 'Critical' };
      case 'Orange': return { bg: 'bg-orange-500', text: 'text-orange-500 dark:text-orange-400', label: 'Priority' };
      case 'Yellow': return { bg: 'bg-amber-400', text: 'text-amber-500 dark:text-amber-400', label: 'Important' };
      case 'Green': return { bg: 'bg-emerald-500', text: 'text-emerald-500 dark:text-emerald-400', label: 'Good Progress' };
      default: return null;
    }
  };

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const pendingTasks = filteredTasks.filter(t => t.status === 'Assigned');
  
  const activeTasks = filteredTasks.filter(t => 
    t.status !== 'Assigned' && 
    !['Approved', 'Declined', 'Rejected'].includes(t.status) &&
    !['Completed', 'Approved', 'Declined', 'Expired'].includes(t.overall_status)
  );

  const pendingSubmissions = filteredTasks.filter(t => 
    !['Approved', 'Submitted'].includes(t.status) && 
    ['Completed', 'Approved', 'Declined', 'Expired'].includes(t.overall_status)
  );

  const completedTasks = filteredTasks.filter(t => 
    t.status === 'Approved' || 
    (t.status === 'Submitted' && ['Completed', 'Approved'].includes(t.overall_status))
  );

  return (
    <div className="space-y-8 pb-20">
      <SEO title="My Workspace" description="Manage your assigned tasks and track progress." />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#1E184B] dark:text-indigo-100 tracking-tight">Personal Queue</h1>
          <p className="text-[#1E184B]/60 dark:text-violet-400/60 mt-1 font-bold flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#7C3AED] dark:text-violet-400" />
            Your active workload and responsibilities.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="px-5 py-3 bg-white dark:bg-[#1A0F35]/80 border border-slate-100 dark:border-violet-500/10 rounded-2xl flex items-center gap-3 shadow-sm">
            <Trophy className="w-5 h-5 text-amber-500" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest leading-none">Career Points</span>
              <span className="text-sm font-black text-[#1E184B] dark:text-indigo-100">{tasks.reduce((acc, t) => acc + t.points + t.bonus_points, 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Task Tabs & Search */}
      <div className="flex flex-col gap-6">
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-violet-400/40 group-focus-within:text-[#7C3AED] dark:group-focus-within:text-violet-400 transition-colors" />
          <input 
            type="text" 
            placeholder="Search your queue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-white dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 rounded-3xl text-sm font-bold text-[#1E184B] dark:text-indigo-100 focus:outline-none focus:ring-4 focus:ring-[#7C3AED]/10 focus:border-[#7C3AED] dark:focus:border-violet-400/70 transition-all placeholder:text-slate-300 dark:placeholder:text-violet-500/30"
          />
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-100 dark:border-violet-500/10 gap-8 overflow-x-auto pb-1 shrink-0">
          {[
            { id: 'active', label: 'Active Missions', count: activeTasks.length, icon: Briefcase },
            { id: 'pending_submission', label: 'Pending My Submissions', count: pendingSubmissions.length, icon: AlertCircle },
            { id: 'completed', label: 'Accomplished Tasks', count: completedTasks.length, icon: CheckCircle2 }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "pb-4 font-black text-sm uppercase tracking-wider relative transition-all flex items-center gap-2 border-b-2 border-transparent whitespace-nowrap cursor-pointer",
                  isActive 
                    ? "text-[#7C3AED] dark:text-violet-400 border-[#7C3AED]" 
                    : "text-slate-400 dark:text-violet-400/45 hover:text-[#1E184B] dark:hover:text-indigo-200"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className={cn(isActive ? "inline" : "hidden md:inline")}>
                  {tab.label}
                </span>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-black transition-colors",
                  isActive
                    ? "bg-[#7C3AED]/10 text-[#7C3AED] dark:bg-violet-500/20 dark:text-violet-300"
                    : "bg-slate-100 text-slate-500 dark:bg-[#1A0F35]/80 dark:text-violet-400/50"
                )}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tasks Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-[#1A0F35]/80 rounded-[2.5rem] p-7 border border-[#7C3AED]/10 dark:border-violet-500/15 animate-pulse space-y-6 flex flex-col justify-between h-72">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="w-24 h-5 bg-slate-200 dark:bg-violet-950/40 rounded-full animate-pulse" />
                  <div className="w-20 h-5 bg-slate-200 dark:bg-violet-950/40 rounded-lg animate-pulse" />
                </div>
                <div className="w-48 h-6 bg-slate-300 dark:bg-violet-950/60 rounded-xl animate-pulse" />
                <div className="space-y-2">
                  <div className="w-full h-4 bg-slate-200 dark:bg-violet-950/40 rounded animate-pulse" />
                  <div className="w-5/6 h-4 bg-slate-200 dark:bg-violet-950/40 rounded animate-pulse" />
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-violet-500/10">
                <div className="flex justify-between items-center pr-4">
                  <div className="w-16 h-3 bg-slate-200 dark:bg-violet-950/40 rounded animate-pulse" />
                  <div className="w-10 h-4 bg-slate-300 dark:bg-violet-950/60 rounded animate-pulse" />
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-[#110A24] rounded-full overflow-hidden" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-12">
          {/* Pending Acceptance Tasks */}
          {pendingTasks.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-xs font-black text-amber-500 dark:text-amber-400 uppercase tracking-[0.2em] flex items-center gap-3">
                <span className="w-8 h-[2px] bg-amber-500/20" />
                Pending Acceptance ({pendingTasks.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingTasks.map((task) => {
                  const flag = getFlagConfig(task.flag_color);
                  return (
                    <div
                      key={task.id}
                      onClick={() => { setSelectedTask(task); setIsDetailModalOpen(true); }}
                      className="bg-amber-500/[0.02] dark:bg-amber-500/[0.01] rounded-[2.5rem] border border-amber-500/20 p-7 shadow-sm hover:shadow-2xl hover:shadow-amber-500/5 transition-all relative overflow-hidden cursor-pointer"
                    >
                      {flag && (
                        <div className={cn("absolute top-4 right-4 w-3 h-3 rounded-full animate-pulse shadow-lg", flag.bg)} />
                      )}

                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Action Required
                          </div>
                          <div className={cn(
                            "px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-wider border flex items-center gap-1 shadow-sm bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800/30"
                          )}>
                            {task.assignment_mode || 'individual'}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-600">
                            <Clock className="w-3 h-3" />
                            {getDeadlineStatus(task.deadline).text}
                          </div>
                        </div>
                      </div>

                      <h3 className="text-xl font-black text-[#1E184B] dark:text-indigo-100 mb-2 truncate">{task.title}</h3>
                      <p className="text-slate-400 dark:text-violet-400/50 text-sm font-medium mb-6 line-clamp-2 leading-relaxed">
                        {task.description || "Instructional overview pending..."}
                      </p>

                      <div className={cn("grid gap-3 pt-5 border-t border-slate-100 dark:border-violet-500/10", allowDecline ? "grid-cols-2" : "grid-cols-1")}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task.id, 'In Progress'); }}
                          className="py-3 bg-[#7C3AED] text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-[#6D28D9] transition-all shadow-md shadow-[#7C3AED]/15 cursor-pointer"
                        >
                          Accept
                        </button>
                        {allowDecline && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task.id, 'Declined'); }}
                            className="py-3 bg-white dark:bg-[#110A24] text-rose-500 dark:text-rose-400 border border-rose-100 dark:border-rose-900/35 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-50 transition-all cursor-pointer"
                          >
                            Decline
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Active Tasks */}
          {activeTab === 'active' && (
            <section>
              <h2 className="text-xs font-black text-[#1E184B]/40 dark:text-violet-400/50 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                <span className="w-8 h-[2px] bg-[#7C3AED]/20" />
                Active Missions ({activeTasks.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeTasks.map((task) => {
                  const config = getStatusConfig(task.status);
                  const flag = getFlagConfig(task.flag_color);
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={task.id}
                      onClick={() => { setSelectedTask(task); setIsDetailModalOpen(true); }}
                      className="bg-white dark:bg-[#1A0F35]/80 rounded-[2.5rem] border border-slate-100 dark:border-violet-500/15 p-7 shadow-sm hover:shadow-2xl hover:shadow-[#7C3AED]/10 dark:hover:shadow-violet-500/[0.03] transition-all cursor-pointer group relative overflow-hidden"
                    >
                      {flag && (
                        <div className={cn("absolute top-4 right-4 w-3 h-3 rounded-full animate-pulse shadow-lg", flag.bg)} />
                      )}

                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest", config.bg, config.color)}>
                            {config.label}
                          </div>
                          <div className={cn(
                            "px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-wider border flex items-center gap-1 shadow-sm",
                            task.assignment_mode === 'group' ? 'bg-indigo-50 text-indigo-500 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30' :
                            task.assignment_mode === 'broadcast' ? 'bg-amber-50 text-amber-500 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30' :
                            'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800/30'
                          )}>
                            {task.assignment_mode === 'group' && <Users className="w-2.5 h-2.5" />}
                            {task.assignment_mode === 'broadcast' && <Sparkles className="w-2.5 h-2.5 animate-pulse" />}
                            {task.assignment_mode || 'individual'}
                          </div>
                        </div>
                        {task.is_delayed === 1 && (
                          <div className="bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest animate-pulse">Delayed</div>
                        )}
                        <div className="flex flex-col items-end gap-1">
                          <div className={cn(
                            "flex items-center gap-1 text-[10px] font-black uppercase tracking-widest", 
                            getDeadlineStatus(task.deadline).isPassed ? "text-rose-500 dark:text-rose-400" : "text-slate-400 dark:text-violet-400/50"
                          )}>
                            <Clock className="w-3 h-3" />
                            {getDeadlineStatus(task.deadline).text}
                          </div>
                          <div className="flex items-center gap-1 text-[8px] font-bold text-slate-300 dark:text-violet-500/30">
                            <Calendar className="w-2.5 h-2.5" />
                            {formatDate(task.deadline)}
                          </div>
                        </div>
                      </div>

                      <h3 className="text-xl font-black text-[#1E184B] dark:text-indigo-100 mb-2 group-hover:text-[#7C3AED] dark:group-hover:text-violet-400 transition-colors truncate">{task.title}</h3>
                      <p className="text-slate-400 dark:text-violet-400/50 text-sm font-medium mb-6 line-clamp-2 leading-relaxed">
                        {task.description || "Instructional overview pending..."}
                      </p>

                      <div className="flex items-center justify-between pt-5 border-t border-slate-50 dark:border-violet-500/10">
                        <div className="flex flex-col gap-2 flex-1">
                          <div className="flex items-center justify-between pr-4">
                            <span className="text-[9px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest">Progress</span>
                            <span className="text-[10px] font-black text-[#1E184B] dark:text-indigo-100">{task.progress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-[#110A24] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] transition-all duration-500" 
                              style={{ width: `${task.progress}%` }} 
                            />
                          </div>
                        </div>
                        {task.attachment_count > 0 && (
                          <div className="flex items-center gap-3 shrink-0 ml-4">
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-violet-50 dark:bg-violet-950/20 text-[#7C3AED] dark:text-violet-400 rounded-lg text-[9px] font-black border border-violet-100 dark:border-violet-900/50" title="Attachments Available">
                              <Paperclip className="w-3.5 h-3.5" />
                              <span>{task.attachment_count}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                {activeTasks.length === 0 && (
                  <div className="col-span-full py-16 bg-white dark:bg-[#1A0F35]/80 rounded-[2.5rem] border border-dashed border-slate-100 dark:border-violet-500/15 text-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500/20 mx-auto mb-3" />
                    <p className="text-slate-400 dark:text-violet-400/50 font-bold uppercase text-[10px] tracking-widest">Workspace cleared</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Pending Submissions */}
          {activeTab === 'pending_submission' && (
            <section className="space-y-6 animate-in fade-in duration-300">
              <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-[2rem] text-amber-700 dark:text-amber-300 flex items-start gap-4 shadow-sm">
                <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-black text-sm uppercase tracking-wide">Attention Required</h4>
                  <p className="text-xs font-bold mt-1 opacity-90">
                    These tasks have been completed or approved, but you have not submitted your assigned work.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingSubmissions.map((task) => {
                  const flag = getFlagConfig(task.flag_color);
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={task.id}
                      onClick={() => { setSelectedTask(task); setIsDetailModalOpen(true); }}
                      className="bg-white dark:bg-[#1A0F35]/80 rounded-[2.5rem] border border-slate-100 dark:border-violet-500/15 p-7 shadow-sm hover:shadow-2xl hover:shadow-amber-500/10 transition-all cursor-pointer group relative overflow-hidden"
                    >
                      {flag && (
                        <div className={cn("absolute top-4 right-4 w-3 h-3 rounded-full animate-pulse shadow-lg", flag.bg)} />
                      )}

                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                            task.flow_type === 'Rework' 
                              ? 'bg-rose-50 text-rose-500 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30'
                              : 'bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/20 dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-900/30'
                          )}>
                            {task.flow_type} Task
                          </div>
                          <div className="px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-wider border bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800/30">
                            {task.assignment_mode || 'individual'}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border border-rose-100 dark:border-rose-900/30">
                            Unsubmitted
                          </span>
                        </div>
                      </div>

                      <h3 className="text-xl font-black text-[#1E184B] dark:text-indigo-100 mb-4 group-hover:text-amber-500 transition-colors truncate">{task.title}</h3>
                      
                      <div className="space-y-3 pt-4 border-t border-slate-50 dark:border-violet-500/10 text-xs font-bold text-slate-500 dark:text-violet-400/70">
                        <div className="flex justify-between">
                          <span>Assigned Date</span>
                          <span className="text-[#1E184B] dark:text-indigo-100 font-black">{formatDate(task.created_at)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Due Date</span>
                          <span className="text-[#1E184B] dark:text-indigo-100 font-black">{formatDate(task.deadline)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Task Status</span>
                          <span className="text-amber-600 dark:text-amber-400 font-black uppercase tracking-wider text-[10px]">{task.overall_status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Completion Date</span>
                          <span className="text-[#1E184B] dark:text-indigo-100 font-black">{task.overall_completed_at ? formatDate(task.overall_completed_at) : 'N/A'}</span>
                        </div>
                        {task.completion_reason && (
                          <div className="pt-2 border-t border-dashed border-slate-100 dark:border-violet-500/10">
                            <span className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Reason for Completion</span>
                            <p className="text-xs italic font-medium text-slate-600 dark:text-violet-400/90 line-clamp-2">
                              "{task.completion_reason}"
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                {pendingSubmissions.length === 0 && (
                  <div className="col-span-full py-16 bg-white dark:bg-[#1A0F35]/80 rounded-[2.5rem] border border-dashed border-slate-100 dark:border-violet-500/15 text-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500/20 mx-auto mb-3" />
                    <p className="text-slate-400 dark:text-violet-400/50 font-bold uppercase text-[10px] tracking-widest">No unsubmitted completed tasks</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Completed History */}
          {activeTab === 'completed' && (
            <section>
              <h2 className="text-xs font-black text-[#1E184B]/40 dark:text-violet-400/50 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                <span className="w-8 h-[2px] bg-emerald-500/20" />
                Accomplished Tasks ({completedTasks.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60 hover:opacity-100 transition-opacity">
                {completedTasks.map((task) => (
                  <div 
                    key={task.id}
                    onClick={() => { setSelectedTask(task); setIsDetailModalOpen(true); }} 
                    className="bg-slate-50/50 dark:bg-[#110A24]/40 rounded-[2rem] border border-slate-100 dark:border-violet-500/10 p-6 cursor-pointer hover:bg-white dark:hover:bg-[#1A0F35]/80 transition-all hover:shadow-xl group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <div className={cn(
                          "px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest border flex items-center gap-1",
                          task.assignment_mode === 'group' ? 'bg-indigo-50 text-indigo-500 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30' :
                          task.assignment_mode === 'broadcast' ? 'bg-amber-50 text-amber-500 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30' :
                          'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800/30'
                        )}>
                          {task.assignment_mode === 'group' && <Users className="w-2 h-2" />}
                          {task.assignment_mode === 'broadcast' && <Sparkles className="w-2 h-2 animate-pulse" />}
                          {task.assignment_mode || 'individual'}
                        </div>
                      </div>
                       <div className="flex flex-col items-end gap-1">
                        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-lg">+{task.points + task.bonus_points} pts</span>
                        {task.is_delayed === 1 && (
                          <span className="bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest border border-rose-100/50 dark:border-rose-900/30">Delayed</span>
                        )}
                      </div>
                    </div>
                    <h3 className="font-black text-[#1E184B] dark:text-indigo-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{task.title}</h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-violet-400/50 mt-1 uppercase tracking-widest">
                      Completed on {formatDate(task.completed_at || task.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Task Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedTask && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative bg-white dark:bg-[#130C24] rounded-[2.5rem] md:rounded-[3.5rem] w-full max-w-6xl h-full md:h-auto md:max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border border-transparent dark:border-violet-500/20"
            >
              {/* Modal Header */}
              <div className="p-10 pb-6 flex items-center justify-between border-b border-slate-50 dark:border-violet-500/10">
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
                  {/* Assignment Mode Badge */}
                  <span className={cn(
                    "px-3.5 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] border flex items-center gap-1.5 shadow-sm",
                    selectedTask.assignment_mode === 'group' ? 'bg-indigo-50 text-indigo-500 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30' :
                    selectedTask.assignment_mode === 'broadcast' ? 'bg-amber-50 text-amber-500 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30' :
                    'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800/30'
                  )}>
                    {selectedTask.assignment_mode === 'group' && <Users className="w-3.5 h-3.5" />}
                    {selectedTask.assignment_mode === 'broadcast' && <Sparkles className="w-3.5 h-3.5 animate-pulse" />}
                    {selectedTask.assignment_mode || 'individual'} Task
                  </span>
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-3 bg-slate-50 dark:bg-[#1A0F35] text-slate-400 dark:text-violet-400/60 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-500 dark:hover:text-rose-400 transition-all border border-transparent dark:border-violet-500/10">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-10 pt-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  {/* Info Column */}
                  <div className="lg:col-span-7 space-y-10">
                    <div>
                      <h2 className="text-3xl font-black text-[#1E184B] dark:text-indigo-100 leading-tight mb-4">{selectedTask.title}</h2>
                      <p className="text-slate-500 dark:text-violet-400/60 font-bold text-sm leading-relaxed whitespace-pre-wrap">
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
                      <div className="bg-amber-50/50 dark:bg-amber-950/15 border border-amber-100 dark:border-amber-900/35 p-6 rounded-[2rem]">
                        <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" /> HOD Feedback
                        </h4>
                        <p className="text-sm font-bold text-amber-900 dark:text-amber-300 leading-relaxed italic">
                          "{selectedTask.my_remarks}"
                        </p>
                      </div>
                    )}

                    {/* Team Members Section for Group/Broadcast tasks */}
                    {(selectedTask.assignment_mode === 'group' || selectedTask.assignment_mode === 'broadcast') && (
                      <div className="space-y-6">
                        <h3 className="text-xs font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest flex items-center gap-2">
                          <User className="w-4 h-4 text-indigo-500" /> Team Members
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedTask.team_members?.map((member) => (
                            <div 
                              key={member.user_id} 
                              className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-[#1A0F35]/40 rounded-2xl border border-slate-100 dark:border-violet-500/10 hover:border-[#7C3AED]/30 transition-all"
                            >
                              <div className="w-10 h-10 bg-white dark:bg-[#110A24] rounded-xl flex items-center justify-center font-black text-[#1E184B] dark:text-indigo-100 shadow-sm border border-slate-100 dark:border-violet-500/10 overflow-hidden shrink-0">
                                {member.faculty_pic ? (
                                  <img 
                                    src={`${import.meta.env.VITE_API_URL}/${member.faculty_pic}`} 
                                    alt={member.faculty_name} 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  member.faculty_name.charAt(0)
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <button 
                                  onClick={() => {
                                    setSelectedTeammateId(member.user_id);
                                    setIsTeammateModalOpen(true);
                                  }}
                                  className="text-sm font-black text-[#1E184B] dark:text-indigo-100 hover:text-[#7C3AED] dark:hover:text-violet-400 text-left truncate block w-full cursor-pointer transition-colors"
                                >
                                  {member.faculty_name} {member.user_id === userId && <span className="text-[10px] text-slate-400 font-bold">(You)</span>}
                                </button>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-violet-400/50 truncate leading-tight">
                                  {member.designation || 'Faculty Member'} • {member.department_name || 'Department'}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter border",
                                  member.status === 'Completed' || member.status === 'Approved' ? 'bg-emerald-50 text-emerald-500 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' :
                                  member.status === 'Submitted' ? 'bg-purple-50 text-purple-500 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30' :
                                  member.status === 'In Progress' ? 'bg-amber-50 text-amber-500 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30' :
                                  member.status === 'Accepted' ? 'bg-indigo-50 text-indigo-500 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30' :
                                  'bg-slate-50 text-slate-400 border-slate-100 dark:bg-slate-900/20 dark:border-slate-800/30'
                                )}>
                                  {member.status === 'Completed' || member.status === 'Approved' ? 'Reviewed' : 
                                   member.status === 'Submitted' ? 'Submitted' : 
                                   member.status === 'In Progress' ? 'Working' : 
                                   member.status === 'Accepted' ? 'Accepted' : 'Pending'}
                                </span>
                                <span className="block text-[8px] font-black text-slate-400 dark:text-violet-500/40 mt-1 uppercase tracking-wider">{member.progress}% Done</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                      <div className="space-y-6">
                        <h3 className="text-xs font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-blue-500" /> Assigned By
                        </h3>
                        <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-[#1A0F35]/40 rounded-2xl border border-slate-100 dark:border-violet-500/10">
                          <div className="w-12 h-12 bg-white dark:bg-[#110A24] rounded-xl flex items-center justify-center font-black text-[#1E184B] dark:text-indigo-100 shadow-sm border border-slate-100 dark:border-violet-500/10 overflow-hidden">
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
                            <p className="text-sm font-black text-[#1E184B] dark:text-indigo-100">{selectedTask.assigned_by_name}</p>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-violet-400/50 uppercase tracking-widest">HOD / Project Lead</p>
                          </div>
                        </div>
                      </div>

                      {selectedTask.task_link && (
                        <div className="space-y-4">
                          <h3 className="text-xs font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-emerald-500" /> Mission Resource Link
                          </h3>
                          <div className="p-5 bg-emerald-50/30 dark:bg-emerald-950/10 border-2 border-emerald-100/50 dark:border-emerald-900/35 rounded-3xl flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 bg-emerald-100/50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                                <BookOpen className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Reference URL</p>
                                <a 
                                  href={selectedTask.task_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-xs font-bold text-[#7C3AED] hover:underline break-all block truncate max-w-[260px]"
                                >
                                  {selectedTask.task_link}
                                </a>
                              </div>
                            </div>
                            <a 
                              href={selectedTask.task_link} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all whitespace-nowrap shadow-md shadow-emerald-500/10"
                            >
                              Open Link
                            </a>
                          </div>
                        </div>
                      )}

                      <div className="space-y-6">
                        <h3 className="text-xs font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#7C3AED]" /> Instructional Materials
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          {selectedTask.task_link && (
                            <div className="p-4 bg-indigo-50/50 dark:bg-[#1A0F35]/40 rounded-2xl border border-indigo-100/50 dark:border-violet-500/10 flex items-center justify-between group hover:border-[#7C3AED]/30 transition-all">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                                  <Layers className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest">Reference URL</span>
                                  <a 
                                    href={selectedTask.task_link} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-xs font-black text-[#7C3AED] hover:underline truncate max-w-[200px]"
                                  >
                                    {selectedTask.task_link}
                                  </a>
                                </div>
                              </div>
                              <a 
                                href={selectedTask.task_link} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="px-3.5 py-2.5 bg-white dark:bg-[#110A24] text-[#7C3AED] dark:text-violet-400 hover:bg-[#7C3AED] hover:text-white rounded-xl transition-all shadow-sm font-black text-[9px] uppercase tracking-widest border border-transparent dark:border-violet-500/10"
                              >
                                Visit Link
                              </a>
                            </div>
                          )}

                          {selectedTask.attachments.filter(a => a.entity_type === 'Task').map(att => (
                            <div key={att.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#110A24]/40 rounded-2xl border border-slate-100 dark:border-violet-500/10 group hover:border-[#7C3AED]/30 transition-all">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white dark:bg-[#1A0F35] rounded-xl flex items-center justify-center text-[#7C3AED] shadow-sm">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-black text-[#1E184B] dark:text-indigo-100 truncate max-w-[200px]">{att.file_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => handlePreview(att)} className="p-2.5 text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white rounded-xl transition-all"><Eye className="w-4 h-4" /></button>
                                <a href={getDownloadUrl(att.file_path)} download className="p-2.5 text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white rounded-xl transition-all"><Download className="w-4 h-4" /></a>
                              </div>
                            </div>
                          ))}
                          {(selectedTask.attachments.filter(a => a.entity_type === 'Task').length === 0 && !selectedTask.task_link) && (
                            <p className="text-[10px] font-bold text-slate-400 dark:text-violet-400/50 italic">No reference materials or files attached.</p>
                          )}
                        </div>
                      </div>
                  </div>

                  {/* Actions Column */}
                  <div className="lg:col-span-5 space-y-8">
                    {!['Submitted', 'Approved', 'Completed'].includes(selectedTask.status) && (
                      <div className="space-y-6">
                        <h3 className="text-xs font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest flex items-center gap-2">
                          <Clock className="w-4 h-4 text-rose-500" /> Deadline Control
                        </h3>
                        <div className="p-6 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-[2.5rem] space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Current Deadline</p>
                              <p className="text-xl font-black text-[#1E184B] dark:text-indigo-100">{formatDate(selectedTask.deadline)}</p>
                            </div>
                            <div className="w-12 h-12 bg-white dark:bg-[#110A24] rounded-2xl flex items-center justify-center text-rose-500 dark:text-rose-400 shadow-sm border border-rose-100 dark:border-rose-900/20">
                              <Calendar className="w-6 h-6" />
                            </div>
                          </div>

                          {(() => {
                            if (selectedTask.assigned_by_role_id === 4) {
                              return (
                                <p className="text-[10px] font-bold text-slate-400 dark:text-violet-400/55 italic text-center">
                                  Deadline extensions are not allowed for tasks assigned by Institution Admins.
                                </p>
                              );
                            }

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
                                  isPending ? "bg-amber-50/50 dark:bg-amber-950/15 border-amber-100 dark:border-amber-900/30" :
                                  isApproved ? "bg-emerald-50/50 dark:bg-emerald-950/15 border-emerald-100 dark:border-emerald-900/30" :
                                  "bg-rose-50/50 dark:bg-rose-950/15 border-rose-100 dark:border-rose-900/30"
                                )}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className={cn("w-2 h-2 rounded-full", 
                                        isPending ? "bg-amber-500 animate-pulse" : 
                                        isApproved ? "bg-emerald-500" : "bg-rose-500"
                                      )} />
                                      <p className={cn("text-[10px] font-black uppercase tracking-widest",
                                        isPending ? "text-amber-600 dark:text-amber-400" : 
                                        isApproved ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                      )}>
                                        Extension {latestRequest.status}
                                      </p>
                                    </div>
                                    <span className="text-[8px] font-bold text-slate-400 dark:text-violet-400/40">{formatDate(latestRequest.requested_at)}</span>
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <p className="text-[11px] font-bold text-[#1E1B4B] dark:text-indigo-100">
                                      Requested: <span className="font-black">{formatDate(latestRequest.requested_deadline)}</span>
                                    </p>
                                    {latestRequest.hod_remarks && (
                                      <p className="text-[10px] font-medium text-slate-500 dark:text-violet-400/50 italic bg-white/50 dark:bg-[#110A24]/60 p-3 rounded-xl border border-slate-100/50 dark:border-violet-500/10">
                                        HOD: "{latestRequest.hod_remarks}"
                                      </p>
                                    )}
                                  </div>

                                  {isRejected && (
                                    <button 
                                      onClick={() => setIsExtensionModalOpen(true)}
                                      className="w-full py-2 bg-white dark:bg-[#110A24] border border-rose-100 dark:border-rose-900/30 text-rose-500 dark:text-rose-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all"
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
                                className="w-full py-4 bg-white dark:bg-[#110A24]/40 border-2 border-dashed border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-rose-50 hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                              >
                                <ArrowRight className="w-4 h-4" /> Request Extension
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                    <div className="bg-slate-50 dark:bg-[#1A0F35]/40 p-8 rounded-[2.5rem] border border-slate-100 dark:border-violet-500/10">
                      <h3 className="text-xs font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest mb-6">Mission Progress</h3>
                      
                      <div className="space-y-8">
                        {/* Progress Tracker */}
                        {['Accepted', 'In Progress', 'Rework Required'].includes(selectedTask.status) && (
                          <div className="space-y-6">
                            <div className="flex justify-between items-end">
                              <div>
                                <label className="text-[10px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest block mb-1">Mission Completion</label>
                                <p className="text-2xl font-black text-[#1E184B] dark:text-indigo-100">{selectedTask.progress}%</p>
                              </div>
                              <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-100 dark:border-emerald-900/30">
                                {selectedTask.progress === 100 ? 'Finalized' : 'In Field'}
                              </span>
                            </div>
                            
                            <div className="relative h-4 bg-white dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 rounded-full overflow-hidden p-1">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${selectedTask.progress}%` }}
                                className="h-full bg-gradient-to-r from-[#7C3AED] to-blue-500 rounded-full shadow-lg shadow-[#7C3AED]/20"
                              />
                            </div>

                            <p className="text-[9px] font-bold text-slate-400 dark:text-violet-400/55 italic leading-relaxed">
                              Mission progress is automatically calculated based on your current protocol state.
                            </p>
                          </div>
                        )}

                        <div className="space-y-4">
                          {selectedTask.status === 'Assigned' && (
                            <div className={cn("grid gap-3", allowDecline ? "grid-cols-2" : "grid-cols-1")}>
                              <button 
                                onClick={() => handleUpdateStatus(selectedTask.id, 'In Progress')}
                                className="py-4 bg-[#7C3AED] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#7C3AED]/20 hover:bg-[#6D28D9] transition-all"
                              >
                                Accept Task
                              </button>
                              {allowDecline && (
                                <button 
                                  onClick={() => handleUpdateStatus(selectedTask.id, 'Declined')}
                                  className="py-4 bg-white dark:bg-[#110A24] text-rose-500 dark:text-rose-400 border border-rose-100 dark:border-rose-900/35 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all"
                                >
                                  Decline
                                </button>
                              )}
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
                            <div className="p-6 bg-purple-50 dark:bg-purple-950/15 rounded-2xl border border-purple-100 dark:border-purple-900/35 text-center">
                              <Send className="w-6 h-6 text-purple-500 dark:text-purple-400 mx-auto mb-2" />
                              <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">Awaiting HOD Review</p>
                              <p className="text-[9px] font-bold text-purple-400 dark:text-purple-550/60 mt-2">You'll be notified once evaluation is complete.</p>
                            </div>
                          )}

                          {['Approved', 'Completed'].includes(selectedTask.status) && (
                            <div className="p-8 bg-emerald-50 dark:bg-emerald-950/15 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/35 text-center relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-2">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500 dark:text-emerald-400 opacity-20" />
                              </div>
                              <h4 className="text-sm font-black text-emerald-700 dark:text-emerald-400 mb-1">Task Accomplished</h4>
                              <p className="text-[10px] font-bold text-emerald-600/60 dark:text-emerald-500/50 uppercase tracking-widest">Marked as finalized by HOD</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Collaborative Remarks & Comments Chain */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-[#7C3AED] dark:text-violet-400" />
                          Mission Intelligence
                        </h3>
                        <span className="px-2 py-0.5 bg-[#7C3AED]/10 dark:bg-[#7C3AED]/20 text-[#7C3AED] dark:text-violet-400 text-[8px] font-black rounded-full uppercase">
                          {(selectedTask.comments?.length || 0) + (selectedTask.teammate_remarks?.length || 0)} Entries
                        </span>
                      </div>

                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {/* Initial Public Remarks from Teammates */}
                        {selectedTask.teammate_remarks?.map((rem: any, i: number) => (
                          <div key={`rem-${i}`} className="p-4 bg-white dark:bg-[#1A0F35] border border-[#7C3AED]/5 dark:border-violet-500/10 rounded-2xl shadow-sm space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full overflow-hidden border border-[#7C3AED]/20 dark:border-violet-500/30">
                                  {rem.faculty_pic ? (
                                    <img 
                                      src={`${import.meta.env.VITE_API_URL}/${rem.faculty_pic}`} 
                                      alt={rem.faculty_name} 
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-[#7C3AED]/10 dark:bg-[#7C3AED]/20 flex items-center justify-center text-[8px] font-black text-[#7C3AED]">
                                      {rem.faculty_name.charAt(0)}
                                    </div>
                                  )}
                                </div>
                                <span className="text-[10px] font-black text-[#7C3AED] dark:text-violet-400 uppercase tracking-widest">{rem.faculty_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-400 dark:text-violet-400/50">{rem.progress}% Progress</span>
                                <span className="px-2 py-0.5 bg-[#7C3AED]/5 text-[#7C3AED] text-[8px] font-black rounded-full uppercase tracking-tighter">{rem.status}</span>
                              </div>
                            </div>
                            <p className="text-xs font-medium text-[#1E184B]/80 dark:text-indigo-100/80 leading-relaxed italic">
                              "{rem.public_remarks}"
                            </p>
                          </div>
                        ))}

                        {/* Threaded Comments */}
                        {selectedTask.comments?.map((com: any) => (
                          <div key={`com-${com.id}`} className={cn(
                            "p-4 rounded-2xl space-y-2 border animate-in fade-in slide-in-from-bottom-2",
                            com.user_id === userId 
                              ? "bg-indigo-50/50 dark:bg-indigo-950/15 border-indigo-100 dark:border-indigo-900/30 ml-8" 
                              : "bg-slate-50 dark:bg-[#110A24]/60 border-slate-100 dark:border-violet-500/15 mr-8"
                          )}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-5 h-5 rounded-full overflow-hidden border",
                                  com.user_id === userId ? "border-indigo-200 dark:border-indigo-900/40" : "border-slate-200 dark:border-violet-500/30"
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
                                      com.user_id === userId ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30" : "bg-slate-200 text-slate-600 dark:bg-slate-900/30"
                                    )}>
                                      {com.user_name.charAt(0)}
                                    </div>
                                  )}
                                </div>
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", com.user_id === userId ? "text-indigo-600 dark:text-indigo-400" : "text-slate-600 dark:text-violet-400/60")}>
                                  {com.user_id === userId ? "You" : com.user_name}
                                </span>
                              </div>
                              <span className="text-[8px] font-bold text-slate-400 dark:text-violet-400/40">{formatDate(com.created_at)}</span>
                            </div>
                            <p className="text-xs font-medium text-[#1E184B]/80 dark:text-indigo-100/80 leading-relaxed">
                              {com.comment}
                            </p>
                          </div>
                        ))}

                        {(!selectedTask.teammate_remarks?.length && !selectedTask.comments?.length) && (
                          <div className="py-10 text-center bg-slate-50 dark:bg-[#110A24]/40 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-violet-500/15">
                            <MessageSquare className="w-8 h-8 text-slate-300 dark:text-violet-500/30 mx-auto mb-2 opacity-20" />
                            <p className="text-[10px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest">No intelligence shared yet</p>
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
                          className="w-full pl-6 pr-14 py-4 bg-white dark:bg-[#110A24] border border-slate-200 dark:border-violet-500/15 rounded-2xl text-xs font-bold text-[#1E184B] dark:text-indigo-100 focus:outline-none focus:ring-4 focus:ring-[#7C3AED]/10 focus:border-[#7C3AED] dark:focus:border-violet-400/70 transition-all placeholder:text-slate-300 dark:placeholder:text-violet-500/30"
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
                        <h3 className="text-xs font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest flex items-center gap-2 opacity-40">
                          Your Public Record
                        </h3>
                        <div className="p-4 bg-[#7C3AED]/[0.03] border border-dashed border-[#7C3AED]/10 rounded-2xl">
                          <p className="text-xs font-medium text-[#1E184B]/60 dark:text-indigo-100/60 italic leading-relaxed">
                            "{selectedTask.public_remarks}"
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="h-px bg-slate-100 dark:bg-violet-500/10" />

                    {/* Your Submissions */}
                    <div>
                      <h3 className="text-xs font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest mb-4">My Submissions</h3>
                      <div className="space-y-2 mb-4">
                        {selectedTask.submission_link && (
                          <div className="p-4 bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-905/35 rounded-2xl flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">My Submission URL</p>
                              <a 
                                href={selectedTask.submission_link} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-[11px] font-bold text-[#7C3AED] hover:underline truncate block max-w-[200px]"
                              >
                                {selectedTask.submission_link}
                              </a>
                            </div>
                            <a 
                              href={selectedTask.submission_link} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all whitespace-nowrap shadow-sm shadow-emerald-500/10"
                            >
                              Open Link
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        {selectedTask.attachments.filter(a => a.entity_type === 'Task_Submission' && a.uploader_id == userId).map(att => (
                          <div key={att.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#1A0F35] rounded-xl border border-slate-100 dark:border-violet-500/10 group">
                            <span className="text-[10px] font-bold text-[#1E184B] dark:text-indigo-100 truncate max-w-[150px]">{att.file_name}</span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => handlePreview(att)} className="p-1.5 text-slate-400 dark:text-violet-400/50 hover:text-[#7C3AED] transition-all"><Eye className="w-3.5 h-3.5" /></button>
                              <a href={getDownloadUrl(att.file_path)} download className="p-1.5 text-slate-400 dark:text-violet-400/50 hover:text-[#7C3AED] transition-all"><Download className="w-3.5 h-3.5" /></a>
                            </div>
                          </div>
                        ))}
                        {(selectedTask.attachments.filter(a => a.entity_type === 'Task_Submission' && a.uploader_id == userId).length === 0 && !selectedTask.submission_link) && (
                          <p className="text-[9px] font-bold text-slate-400 dark:text-violet-400/50 italic">No files or link submitted yet.</p>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white dark:bg-[#130C24] border border-transparent dark:border-violet-500/20 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-slate-100 dark:border-violet-500/10 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-2xl font-black text-[#1E184B] dark:text-indigo-100">Finalize Mission</h2>
                  <p className="text-sm font-bold text-slate-400 dark:text-violet-400/50 mt-1">Upload evidence or finalize to notify the HOD.</p>
                </div>
                <button onClick={() => setIsSubmitModalOpen(false)} className="p-3 bg-slate-50 dark:bg-[#1A0F35] text-slate-400 dark:text-violet-400/60 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-500 dark:hover:text-rose-400 transition-all border border-transparent dark:border-violet-500/10 shrink-0">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmitTask} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border-2 border-dashed border-slate-200 dark:border-violet-500/20 rounded-[2rem] p-6 text-center hover:border-[#7C3AED]/50 bg-slate-50/50 dark:bg-[#1A0F35]/40 hover:bg-[#7C3AED]/5 transition-all group relative flex flex-col justify-center h-full min-h-[200px]">
                    <input 
                      type="file" 
                      multiple 
                      onChange={(e) => {
                        const newFiles = Array.from(e.target.files || []);
                        const validFiles: File[] = [];
                        const blockedExtensions = ['zip', 'mp4', 'mkv', 'avi', 'mov', 'flv', 'webm', 'wmv', '3gp', 'mpeg', 'mpg', 'ogg'];
                        
                        for (const file of newFiles) {
                          if (file.size > 35 * 1024 * 1024) {
                            Swal.fire('Error', `File "${file.name}" exceeds the maximum allowed size of 35 MB.`, 'error');
                            continue;
                          }
                          const ext = file.name.split('.').pop()?.toLowerCase() || '';
                          if (blockedExtensions.includes(ext) || file.type.startsWith('video/') || file.type.includes('zip')) {
                            Swal.fire('Error', `File "${file.name}" has an invalid format. Videos and zip files are not allowed.`, 'error');
                            continue;
                          }
                          validFiles.push(file);
                        }
                        
                        if (validFiles.length > 0) {
                          setSubmissionFiles(validFiles);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-white dark:bg-[#110A24] shadow-sm rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Plus className="w-6 h-6 text-[#7C3AED]" />
                      </div>
                      <p className="text-xs font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest">Add Evidence</p>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-violet-400/50 mt-1">PDF, Images, Docs (Optional)</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] ml-1">Submission Link</label>
                      <input 
                        type="url"
                        value={submissionLink}
                        onChange={(e) => setSubmissionLink(e.target.value)}
                        placeholder="e.g. github repo, drive link (Optional)"
                        className="w-full p-3.5 bg-slate-50 dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 rounded-2xl text-xs font-bold text-[#1E184B] dark:text-indigo-100 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-300 dark:placeholder:text-violet-500/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-[0.2em] ml-1">Public Remarks</label>
                      <textarea 
                        value={publicRemarks}
                        onChange={(e) => setPublicRemarks(e.target.value)}
                        placeholder="Visible to team..."
                        className="w-full p-3.5 bg-slate-50 dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/15 rounded-2xl text-xs font-bold text-[#1E184B] dark:text-indigo-100 focus:bg-white focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10 transition-all resize-none h-[68px] placeholder:text-slate-300 dark:placeholder:text-violet-500/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] ml-1">Private Note</label>
                      <textarea 
                        value={privateRemarks}
                        onChange={(e) => setPrivateRemarks(e.target.value)}
                        placeholder="Visible only to HOD..."
                        className="w-full p-3.5 bg-amber-50/30 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/35 rounded-2xl text-xs font-bold text-[#1E184B] dark:text-indigo-100 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all resize-none h-[68px] placeholder:text-slate-300 dark:placeholder:text-violet-500/30"
                      />
                    </div>
                  </div>
                </div>

                {submissionFiles.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                    {submissionFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#110A24] rounded-xl border border-slate-100 dark:border-violet-500/15 animate-in slide-in-from-left duration-200">
                        <span className="text-[10px] font-bold text-[#1E184B] dark:text-indigo-100 truncate max-w-[80%]">{file.name}</span>
                        <button type="button" onClick={() => setSubmissionFiles(f => f.filter((_, i) => i !== idx))} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-md transition-colors"><X className="w-4 h-4 text-rose-500" /></button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 dark:border-violet-500/10">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-4 bg-[#7C3AED] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[#7C3AED]/20 hover:bg-[#6D28D9] disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    Confirm Submission
                  </button>
                </div>
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
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white dark:bg-[#130C24] rounded-[3rem] w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-transparent dark:border-violet-500/20">
              <div className="p-6 border-b border-slate-100 dark:border-violet-500/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileText className="w-5 h-5 text-[#7C3AED] shrink-0" />
                  <span className="font-black text-[#1E184B] dark:text-indigo-100 truncate block w-full text-sm sm:text-base">{previewFile.name}</span>
                </div>
                <button 
                  onClick={() => setIsPreviewOpen(false)} 
                  className="p-2 hover:bg-slate-50 dark:hover:bg-[#1A0F35] rounded-xl transition-all shrink-0"
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
                        className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <span className="text-white text-xs font-black min-w-[36px] text-center select-none">{Math.round(previewZoom * 100)}%</span>
                      <button 
                        onClick={() => setPreviewZoom(z => Math.min(4, z + 0.25))}
                        className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <div className="w-[1px] h-4 bg-slate-700" />
                      <button 
                        onClick={() => setPreviewRotate(r => (r + 90) % 360)}
                        className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
                        title="Rotate Right"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => { setPreviewZoom(1); setPreviewRotate(0); }}
                        className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
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
          <div className="fixed inset-0 z-[400] flex items-start justify-center p-4 overflow-y-auto custom-scrollbar">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#1E184B]/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 bg-white dark:bg-[#130C24] rounded-[2.5rem] w-full max-w-lg overflow-visible shadow-2xl flex flex-col my-auto md:my-10 border border-transparent dark:border-violet-500/20"
            >
              <div className="p-8 border-b border-slate-50 dark:border-violet-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-[#1E184B] dark:text-indigo-100">Request Extension</h2>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-violet-400/50 uppercase tracking-[0.2em] mt-1">Deadline Adjustment</p>
                  </div>
                  <button onClick={() => setIsExtensionModalOpen(false)} className="p-2 hover:bg-slate-50 dark:hover:bg-[#1A0F35] rounded-xl transition-all">
                    <X className="w-5 h-5 text-slate-300 dark:text-violet-400/60" />
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <form onSubmit={handleRequestExtension} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest ml-2">Proposed New Deadline</label>
                    <DateTimePicker 
                      value={extensionDate}
                      onChange={setExtensionDate}
                      minDate={getMinExtensionDate()}
                      required
                      onOpenChange={setIsDatePickerOpen}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest ml-2">Reason for Extension</label>
                    <textarea 
                      required
                      placeholder="Explain why the current deadline cannot be met..."
                      value={extensionReason}
                      onChange={(e) => setExtensionReason(e.target.value)}
                      className="w-full p-5 bg-slate-50 dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/15 rounded-2xl text-xs font-bold text-[#1E184B] dark:text-indigo-100 focus:bg-white focus:border-rose-500 transition-all resize-none h-32 placeholder:text-slate-300 dark:placeholder:text-violet-500/30"
                    />
                  </div>

                  {/* Dynamic spacer to push form elements when DateTimePicker is open, avoiding overlap and enabling scroll */}
                  <div className={cn("transition-all duration-300", isDatePickerOpen ? "h-[340px]" : "h-0")} />

                  <div className="flex items-center gap-4">
                    <button 
                      type="button" 
                      onClick={() => setIsExtensionModalOpen(false)}
                      className="flex-1 py-4 bg-slate-50 dark:bg-[#110A24] text-slate-400 dark:text-violet-400/60 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
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

      {/* Collaborator Profile Modal */}
      <CollaboratorProfileModal 
        isOpen={isTeammateModalOpen}
        onClose={() => {
          setIsTeammateModalOpen(false);
          setSelectedTeammateId(null);
        }}
        userId={selectedTeammateId}
      />
    </div>
  );
};

export default FacultyMyTasks;
