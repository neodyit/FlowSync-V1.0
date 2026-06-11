import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Clock, 
  Users, 
  ArrowLeft, 
  Loader2, 
  X, 
  Download, 
  Eye, 
  FileText, 
  BookOpen, 
  Layers, 
  AlertTriangle, 
  RotateCcw, 
  Info, 
  MessageSquare, 
  Send, 
  Flag, 
  Award, 
  Calendar, 
  ExternalLink 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import SEO from '@/components/SEO';
import { cn, formatDate, getDownloadUrl } from '@/lib/utils';

const MySwal = withReactContent(Swal);

interface Attachment {
  id: number;
  file_name: string;
  file_path: string;
  file_type?: string;
  entity_type: string;
  uploader_id: number | null;
  created_at: string;
}

interface Assignment {
  remarks: string;
  id: number;
  user_id: number;
  faculty_name: string;
  faculty_email: string;
  faculty_pic: string | null;
  status: string;
  progress: number;
  points: number;
  bonus_points: number;
  submitted_at: string | null;
  completed_at: string | null;
  is_delayed: number;
  reminder_count: number;
  public_remarks: string | null;
  private_remarks: string | null;
  submission_link?: string | null;
}

interface Comment {
  id: number;
  user_id: number;
  user_name: string;
  user_pic: string | null;
  comment: string;
  created_at: string;
}

interface Task {
  category: string;
  id: number;
  title: string;
  description: string;
  task_type: string;
  priority: 'High' | 'Medium' | 'Low' | 'Critical';
  deadline: string;
  created_at: string;
  status: string;
  task_link: string | null;
  points: number;
  bonus_points: number;
  aggregated_points?: number;
  aggregated_bonus_points?: number;
  assignment_mode: string;
  assigned_to_id: number | null;
  assignments: Assignment[];
  attachments: Attachment[];
  comments?: Comment[];
}

export default function IATaskDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allowIaTaskManagement, setAllowIaTaskManagement] = useState(true);
  
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  
  // Review inputs state
  const [reviewStatus, setReviewStatus] = useState('Approved');
  const [reviewPoints, setReviewPoints] = useState(0);
  const [reviewBonusPoints, setReviewBonusPoints] = useState(0);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Comment state
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const fetchTask = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/ia/tasks.php`, { credentials: 'include' });
      const data = await response.json();
      if (data.status === 'success') {
        const found = data.data.tasks.find((t: Task) => t.id === parseInt(id || '0'));
        setTask(found || null);
        if (data.data.allow_ia_task_management !== undefined) {
          setAllowIaTaskManagement(data.data.allow_ia_task_management === 'true');
        }
        
        if (found && found.assignments && found.assignments.length > 0) {
          setSelectedAssignmentId(prev => {
            const exists = found.assignments.some((a: any) => a.user_id === prev);
            if (exists) return prev;
            return found.assignments[0].user_id;
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch task details', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();
    const interval = setInterval(fetchTask, 8000);
    return () => clearInterval(interval);
  }, [id]);

  const activeAssignment = task?.assignments.find(a => a.user_id === selectedAssignmentId);

  // Sync review form data with selected assignment
  useEffect(() => {
    if (activeAssignment) {
      setReviewStatus(activeAssignment.status === 'Submitted' ? 'Approved' : activeAssignment.status);
      setReviewPoints(activeAssignment.points || 0);
      setReviewBonusPoints(activeAssignment.bonus_points || 0);
      setReviewRemarks(activeAssignment.remarks || '');
    }
  }, [selectedAssignmentId, activeAssignment]);

  const handleUpdateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !selectedAssignmentId) return;

    setIsSubmittingReview(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/ia/tasks.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: task.id,
          user_id: selectedAssignmentId,
          status: reviewStatus,
          points: reviewPoints,
          bonus_points: reviewBonusPoints,
          remarks: reviewRemarks
        })
      });
      const data = await response.json();
      if (data.status === 'success') {
        MySwal.fire({
          title: 'Review Updated',
          text: 'Evaluative marks successfully posted.',
          icon: 'success',
          toast: true,
          position: 'top-end',
          timer: 2000,
          showConfirmButton: false
        });
        fetchTask();
      } else {
        MySwal.fire('Error', data.message || 'Failed to update review details.', 'error');
      }
    } catch (error) {
      console.error('Failed to update review', error);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/task_comments.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          task_id: task.id,
          comment: newComment.trim()
        })
      });

      if (response.ok) {
        setNewComment('');
        fetchTask();
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleFinalizeTask = async () => {
    if (!task) return;
    const result = await MySwal.fire({
      title: 'Finalize Task?',
      text: 'Marking this task as completed closes all active assignments.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10B981',
      confirmButtonText: 'Finalize'
    });

    if (result.isConfirmed) {
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        const response = await fetch(`${apiUrl}/ia/tasks.php`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id: task.id, status: 'Completed' })
        });
        const data = await response.json();
        if (data.status === 'success') {
          MySwal.fire('Completed', 'Task finalized successfully.', 'success');
          fetchTask();
        }
      } catch (error) {
        console.error('Failed to finalize task', error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Approved': return 'bg-emerald-500 text-white';
      case 'Active':
      case 'Under Review': return 'bg-[#7C3AED] text-white';
      case 'Submitted': return 'bg-amber-500 text-white';
      case 'Rework Required': return 'bg-orange-500 text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#7C3AED]" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-6">Loading task metrics...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center">
        <AlertTriangle className="w-16 h-16 text-rose-500 mb-4" />
        <h2 className="text-xl font-black text-[#1E1B4B]">Task Not Found</h2>
        <button onClick={() => navigate('/ia/tasks')} className="mt-4 px-6 py-2 bg-[#7C3AED] text-white rounded-xl text-xs font-bold uppercase cursor-pointer">
          Back to Directory
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      <SEO title={`Task Details - ${task.title}`} />

      {/* Header */}
      <div className="bg-white dark:bg-[#110A24] border border-slate-200/60 dark:border-violet-500/20 px-6 py-4 rounded-[2rem] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button 
            onClick={() => navigate('/ia/tasks')}
            className="p-2.5 bg-slate-50 dark:bg-violet-950/20 text-slate-500 hover:text-[#7C3AED] rounded-xl cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-black text-[#1E1B4B] dark:text-indigo-100 truncate" title={task.title}>{task.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shrink-0", getStatusColor(task.status))}>
                {task.status}
              </span>
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#7C3AED]" /> Deadline: {formatDate(task.deadline)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {task.status !== 'Completed' && allowIaTaskManagement && (
            <button 
              onClick={handleFinalizeTask}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-4 h-4" /> Finalize Task
            </button>
          )}
          {allowIaTaskManagement && (
            <button 
              onClick={() => navigate(`/ia/tasks/edit/${task.id}`)}
              className="px-5 py-2.5 bg-white dark:bg-[#110A24] border border-slate-200 dark:border-violet-500/20 text-slate-600 dark:text-indigo-200 hover:border-[#7C3AED] rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              Edit Task
            </button>
          )}
        </div>
      </div>

      {/* Description Panel */}
      <div className="bg-white dark:bg-[#110A24]/40 border border-slate-100 dark:border-violet-500/20 p-6 md:p-8 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row justify-between gap-8">
        <div className="space-y-4 flex-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-[#7C3AED]" /> Task Guidelines
          </span>
          <p className="text-sm font-medium text-slate-600 dark:text-indigo-200/80 leading-relaxed whitespace-pre-wrap">
            {task.description || 'No description provided.'}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="px-3.5 py-1.5 bg-slate-50 dark:bg-violet-950/20 border border-slate-100 dark:border-violet-500/10 rounded-xl text-[10px] font-black text-slate-600 dark:text-violet-300">
              {task.task_type}
            </span>
            <span className="px-3.5 py-1.5 bg-slate-50 dark:bg-violet-950/20 border border-slate-100 dark:border-violet-500/10 rounded-xl text-[10px] font-black text-slate-600 dark:text-violet-300">
              {task.category || 'General'}
            </span>
            <span className="px-3.5 py-1.5 bg-slate-50 dark:bg-violet-950/20 border border-slate-100 dark:border-violet-500/10 rounded-xl text-[10px] font-black text-slate-600 dark:text-violet-300">
              Priority: {task.priority}
            </span>
          </div>
        </div>

        {/* Reference Links and Files */}
        {(task.task_link || task.attachments.length > 0) && (
          <div className="md:w-80 shrink-0 bg-slate-50 dark:bg-violet-950/10 border border-slate-150 dark:border-violet-500/10 rounded-2xl p-5 space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#7C3AED]" /> Attachments & References
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {task.task_link && (
                <div className="p-2.5 bg-white dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 rounded-xl flex items-center justify-between">
                  <a href={task.task_link} target="_blank" rel="noreferrer" className="text-[11px] font-black text-[#7C3AED] hover:underline truncate max-w-[180px]">
                    Reference Link
                  </a>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </div>
              )}
              {task.attachments.map(att => (
                <div key={att.id} className="p-2.5 bg-white dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 rounded-xl flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-600 dark:text-violet-300 truncate max-w-[180px]">{att.file_name}</span>
                  <a href={getDownloadUrl(att.file_path)} download className="text-[#7C3AED] hover:text-[#6D28D9]">
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Workspace Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Assigned users directory */}
        <div className="lg:col-span-5 bg-white dark:bg-[#110A24]/40 border border-slate-100 dark:border-violet-500/20 p-6 rounded-[2.5rem] shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4 text-[#7C3AED]" /> Assignment Directory
            </h3>
            <span className="bg-[#7C3AED]/10 text-[#7C3AED] px-2.5 py-1 rounded-xl text-[10px] font-black">{task.assignments.length} units</span>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[400px] pr-1.5">
            {task.assignments.map(a => (
              <button
                key={a.user_id}
                onClick={() => setSelectedAssignmentId(a.user_id)}
                className={cn(
                  "w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer text-left",
                  selectedAssignmentId === a.user_id 
                    ? "bg-[#7C3AED]/5 border-[#7C3AED] dark:bg-violet-950/20" 
                    : "bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-violet-950/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/40 text-[#7C3AED] flex items-center justify-center font-bold">
                    {a.faculty_name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#1E1B4B] dark:text-indigo-200">{a.faculty_name}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]">{a.faculty_email}</p>
                  </div>
                </div>
                <span className={cn("px-2.5 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg", getStatusColor(a.status))}>
                  {a.status}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Evaluation Panel */}
        <div className="lg:col-span-7 bg-white dark:bg-[#110A24]/40 border border-slate-100 dark:border-violet-500/20 p-6 md:p-8 rounded-[2.5rem] shadow-sm">
          {activeAssignment ? (
            <div className="space-y-6">
              <h3 className="text-base font-black text-[#1E1B4B] dark:text-indigo-100 flex items-center gap-2">
                <Award className="w-5 h-5 text-[#7C3AED]" /> Evaluating {activeAssignment.faculty_name}
              </h3>

              {activeAssignment.submission_link && (
                <div className="p-4 bg-slate-50 dark:bg-violet-950/20 rounded-2xl border border-slate-100 dark:border-violet-500/10 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1E1B4B] dark:text-indigo-200">Submission Link:</span>
                  <a href={activeAssignment.submission_link} target="_blank" rel="noreferrer" className="text-xs font-black text-[#7C3AED] hover:underline flex items-center gap-1">
                    Open Submission <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <form onSubmit={handleUpdateReview} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mark Merit Points</label>
                    <input 
                      type="number"
                      required
                      value={reviewPoints}
                      onChange={(e) => setReviewPoints(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-100 dark:border-violet-500/15 rounded-xl text-xs font-bold focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bonus Marks</label>
                    <input 
                      type="number"
                      required
                      value={reviewBonusPoints}
                      onChange={(e) => setReviewBonusPoints(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-100 dark:border-violet-500/15 rounded-xl text-xs font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Verdict</label>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-100 dark:border-violet-500/15 rounded-xl text-xs font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="Approved">Approve Submission</option>
                    <option value="Rework Required">Request Rework</option>
                    <option value="Rejected">Reject Deliverable</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evaluative Feedback Remarks</label>
                  <textarea 
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                    rows={3}
                    placeholder="Enter grading remarks..."
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-100 dark:border-violet-500/15 rounded-xl text-xs font-bold focus:outline-none resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSubmittingReview || !allowIaTaskManagement}
                  className="w-full py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
                >
                  {!allowIaTaskManagement ? 'Evaluation Suspended' : isSubmittingReview ? 'Submitting marks...' : 'Commit Evaluation'}
                </button>
              </form>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center py-20">
              <Users className="w-12 h-12 opacity-30 mb-4" />
              <p className="text-sm font-bold text-[#1E1B4B] dark:text-indigo-100">No Assignments Enrolled</p>
              <p className="text-xs text-slate-400 mt-1">Assignments will appear once faculty members are targeted.</p>
            </div>
          )}
        </div>
      </div>

      {/* Discussion Boards / Comments */}
      <div className="bg-white dark:bg-[#110A24]/40 border border-slate-100 dark:border-violet-500/20 p-6 md:p-8 rounded-[2.5rem] shadow-sm space-y-6">
        <h3 className="text-base font-black text-[#1E1B4B] dark:text-indigo-100 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#7C3AED]" /> Operational Briefing Discussion
        </h3>

        <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
          {task.comments && task.comments.map(c => (
            <div key={c.id} className="p-4 bg-slate-50 dark:bg-violet-950/15 border border-slate-100 dark:border-violet-500/10 rounded-2xl">
              <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>{c.user_name}</span>
                <span>{formatDate(c.created_at)}</span>
              </div>
              <p className="text-xs font-bold text-[#1E1B4B] dark:text-indigo-200 mt-1">{c.comment}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddComment} className="flex gap-3 pt-2">
          <input 
            type="text"
            required
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Type comment message..."
            className="flex-1 px-4 py-3 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-100 dark:border-violet-500/15 rounded-xl text-xs font-bold focus:outline-none"
          />
          <button 
            type="submit"
            disabled={isSubmittingComment}
            className="px-5 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" /> Send
          </button>
        </form>
      </div>
    </div>
  );
}
