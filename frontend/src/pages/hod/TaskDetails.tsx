import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, Clock, Users, ArrowLeft, Loader2, X, Download, Eye, FileText, BookOpen, Layers, Bell, AlertTriangle, RotateCcw, Info, MessageSquare, Send, ChevronDown, Check, Flag, Award, Calendar, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import SEO from '@/components/SEO';
import { cn, formatDate, getDownloadUrl } from '@/lib/utils';
import { CollaboratorProfileModal } from '@/components/common/CollaboratorProfileModal';

interface Faculty {
  id: number;
  name: string;
  email: string;
  profile_pic: string | null;
}

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
  warning_count: number;
  public_remarks: string | null;
  private_remarks: string | null;
  submission_link: string | null;
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
  flag_color: string | null;
  assignments: Assignment[];
  attachments: Attachment[];
  comments?: Comment[];
}

export default function HODTaskDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allFaculty, setAllFaculty] = useState<Faculty[]>([]);
  const [selectedUnacceptedFacultyIds, setSelectedUnacceptedFacultyIds] = useState<number[]>([]);

  // Review states
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<number[]>([]);
  const [bulkReviewData, setBulkReviewData] = useState({ status: 'Approved', points: 0, bonus_points: 0, remarks: '' });
  const [isBulkStatusDropdownOpen, setIsBulkStatusDropdownOpen] = useState(false);

  // Comment states
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Preview states
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{url: string, name: string, type: string} | null>(null);

  // Debounce ref to keep track of active timeout for score updates
  const debounceTimeoutRef = React.useRef<any>(null);

  const [selectedFacultyId, setSelectedFacultyId] = useState<number | null>(null);
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);

  const fetchFaculty = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/faculty.php`, { credentials: 'include' });
      const data = await response.json();
      if (data.status === 'success') {
        setAllFaculty(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch faculty list:', error);
    }
  };

  const fetchTask = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/tasks.php`, { credentials: 'include' });
      const data = await response.json();
      if (data.status === 'success') {
        const found = data.data.find((t: Task) => t.id === parseInt(id || '0'));
        setTask(found || null);
        
        // Auto-select first assignment if available and none selected yet, keeping track functionally
        if (found && found.assignments && found.assignments.length > 0) {
          setSelectedAssignmentId(prev => {
            const exists = found.assignments.some((a: any) => a.user_id === prev);
            if (exists) return prev;
            return found.assignments[0].user_id;
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();
    fetchFaculty();
    const interval = setInterval(() => {
      fetchTask();
      fetchFaculty();
    }, 8000);
    return () => clearInterval(interval);
  }, [id]);

  const debouncedUpdatePoints = (taskId: number, userId: number, points: number, bonusPoints: number) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/tasks.php`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            id: taskId, 
            user_id: userId,
            points: points,
            bonus_points: bonusPoints
          })
        });
        const data = await response.json();
        if (data.status === 'success') {
          window.dispatchEvent(new CustomEvent('refresh-notifications'));
          Swal.fire({
            title: 'Scores Synced',
            text: 'Merit updated.',
            icon: 'success',
            toast: true,
            position: 'top-end',
            timer: 1000,
            showConfirmButton: false
          });
        }
      } catch (error) {
        console.error("Debounced score update failed:", error);
      }
    }, 600); // 600ms debounce window
  };

  const updateReviewStatus = async (taskId: number, updates: any, userId?: number) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/tasks.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: taskId, ...updates, user_id: userId })
      });
      const data = await response.json();
      if (data.status === 'success') {
        window.dispatchEvent(new CustomEvent('refresh-notifications'));
        Swal.fire({
          title: 'Updated',
          text: data.message,
          icon: 'success',
          toast: true,
          position: 'top-end',
          timer: 1500,
          showConfirmButton: false
        });
        
        // Refetch immediately
        fetchTask();
      } else {
        Swal.fire('Error', data.message || 'Update failed', 'error');
      }
    } catch (error) {
      console.error("Update error:", error);
      Swal.fire('Error', 'Failed to update review status', 'error');
    }
  };

  const handleApproveContribution = async (taskId: number, userId: number, currentPoints: number) => {
    if (!currentPoints || currentPoints === 0) {
      const result = await Swal.fire({
        title: 'No Marks Assigned',
        text: 'You have not given any points yet. Do you want to continue without giving marks?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#10B981',
        cancelButtonColor: '#64748B',
        confirmButtonText: 'Yes, Approve'
      });
      if (!result.isConfirmed) return;
    }
    updateReviewStatus(taskId, { status: 'Approved' }, userId);
  };

  const handleBulkReviewSubmit = async () => {
    if (!task || selectedAssignmentIds.length === 0) return;

    const eligibleForReviewIds = selectedAssignmentIds.filter(userId => {
      const assign = task.assignments.find(a => a.user_id === userId);
      return assign && ['Submitted', 'Under Review'].includes(assign.status);
    });

    if (eligibleForReviewIds.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No Eligible Operatives',
        text: 'Bulk review can only be applied to operatives whose work is Submitted or Under Review.',
        confirmButtonColor: '#7C3AED'
      });
      return;
    }

    const eligibleCount = eligibleForReviewIds.length;
    const totalCount = selectedAssignmentIds.length;
    
    if (bulkReviewData.status === 'Approved' && bulkReviewData.points === 0) {
      const result = await Swal.fire({
        title: 'No Marks Assigned',
        text: `You are approving ${eligibleCount} operative(s) without assigning merit points. Do you wish to proceed?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#10B981',
        cancelButtonColor: '#64748B',
        confirmButtonText: 'Yes, Approve'
      });
      if (!result.isConfirmed) return;
    } else {
      const result = await Swal.fire({
        title: 'Confirm Bulk Review',
        text: `Apply this review decision to the ${eligibleCount} selected operative(s) who have submitted their work? (Note: ${totalCount - eligibleCount} selected operative(s) in field operations will be skipped).`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#7C3AED',
        cancelButtonColor: '#64748B',
        confirmButtonText: 'Yes, Apply'
      });
      if (!result.isConfirmed) return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/tasks.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          id: task.id, 
          ...bulkReviewData, 
          user_ids: eligibleForReviewIds 
        })
      });
      const data = await response.json();
      if (data.status === 'success') {
        window.dispatchEvent(new CustomEvent('refresh-notifications'));
        setSelectedAssignmentIds([]);
        setBulkReviewData({ status: 'Approved', points: 0, bonus_points: 0, remarks: '' });
        Swal.fire('Success', 'Bulk review completed', 'success');
        fetchTask();
      } else {
        Swal.fire('Error', data.message || 'Bulk update failed', 'error');
      }
    } catch (error) {
      console.error("Bulk update error:", error);
      Swal.fire('Error', 'Network error or server crash', 'error');
    }
  };

  const handleSendReminder = async (taskId: number, userId: number, type: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/reminders.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ task_id: taskId, user_id: userId, type })
      });
      const data = await response.json();
      if (data.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'Push Sent',
          text: data.message,
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
        fetchTask();
      } else {
        Swal.fire('Error', data.message || 'Push failed', 'error');
      }
    } catch (error) {
      console.error("Reminder error:", error);
      Swal.fire('Error', 'Failed to transmit reminder protocol', 'error');
    }
  };

  const handleBulkReminders = async (type: string) => {
    if (!task || selectedAssignmentIds.length === 0) return;

    const eligibleForReminderIds = selectedAssignmentIds.filter(userId => {
      const assign = task.assignments.find(a => a.user_id === userId);
      return assign && !['Submitted', 'Under Review', 'Approved', 'Completed'].includes(assign.status);
    });

    if (eligibleForReminderIds.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No Active Operatives',
        text: 'Reminders can only be transmitted to operatives who have not yet submitted their deliverables.',
        confirmButtonColor: '#7C3AED'
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Send Bulk Reminders?',
      text: `Are you sure you want to transmit a ${type} to ${eligibleForReminderIds.length} active selected operative(s)?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#7C3AED',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Yes, Transmit'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
      title: 'Transmitting Alerts...',
      html: 'Please wait while notifications are sent.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const promises = eligibleForReminderIds.map(userId =>
        fetch(`${import.meta.env.VITE_API_URL}/hod/reminders.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ task_id: task.id, user_id: userId, type })
        }).then(res => res.json())
      );

      const outcomes = await Promise.all(promises);
      const successCount = outcomes.filter(o => o.status === 'success').length;

      Swal.fire({
        icon: successCount === eligibleForReminderIds.length ? 'success' : 'info',
        title: 'Alerts Dispatched',
        text: `Transmitted ${type} successfully to ${successCount} out of ${eligibleForReminderIds.length} operatives.`
      });

      setSelectedAssignmentIds([]);
      fetchTask();
    } catch (error) {
      console.error("Bulk reminder dispatch error:", error);
      Swal.fire('Transmission Failed', 'Failed to dispatch bulk notifications.', 'error');
    }
  };

  const handleRemoveFaculty = async (taskId: number, userId: number, name: string) => {
    const result = await Swal.fire({
      title: 'Remove Faculty?',
      text: `Are you sure you want to remove ${name} from this task? This will erase their active contribution records.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f43f5e',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Yes, Remove',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/tasks.php?id=${taskId}&user_id=${userId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        const data = await response.json();
        if (data.status === 'success') {
          Swal.fire({
            icon: 'success',
            title: 'Removed',
            text: data.message,
            timer: 1500,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
          });
          
          // Clear selections if deleted operative was selected
          if (selectedAssignmentId === userId) {
            setSelectedAssignmentId(null);
          }
          setSelectedAssignmentIds(prev => prev.filter(id => id !== userId));

          fetchTask();
        } else {
          Swal.fire('Error', data.message || 'Removal failed', 'error');
        }
      } catch (error) {
        console.error("Remove faculty error:", error);
        Swal.fire('Error', 'Failed to remove faculty member', 'error');
      }
    }
  };

  const handlePingFaculty = async (taskId: number, userId: number, name: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/reminders.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ task_id: taskId, user_id: userId, type: 'Gentle Reminder' })
      });
      const data = await response.json();
      if (data.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'Operative Pinged',
          text: `A popup alert has been dispatched to ${name} to accept this task immediately.`,
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
        fetchTask();
      } else {
        Swal.fire('Error', data.message || 'Ping failed', 'error');
      }
    } catch (error) {
      console.error("Ping error:", error);
      Swal.fire('Error', 'Failed to dispatch ping notification', 'error');
    }
  };

  const handleBulkPingFaculty = async () => {
    if (!task || selectedUnacceptedFacultyIds.length === 0) return;

    const result = await Swal.fire({
      title: 'Bulk Ping Operatives?',
      text: `Are you sure you want to dispatch a popup alert to the ${selectedUnacceptedFacultyIds.length} selected operative(s) to accept this task immediately?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#7C3AED',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Yes, Ping Them'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
      title: 'Transmitting Pings...',
      html: 'Please wait while notifications are sent.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const promises = selectedUnacceptedFacultyIds.map(userId =>
        fetch(`${import.meta.env.VITE_API_URL}/hod/reminders.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ task_id: task.id, user_id: userId, type: 'Gentle Reminder' })
        }).then(res => res.json())
      );

      const outcomes = await Promise.all(promises);
      const successCount = outcomes.filter(o => o.status === 'success').length;

      Swal.fire({
        icon: successCount === selectedUnacceptedFacultyIds.length ? 'success' : 'info',
        title: 'Pings Dispatched',
        text: `Transmitted popup reminders successfully to ${successCount} out of ${selectedUnacceptedFacultyIds.length} operatives.`
      });

      setSelectedUnacceptedFacultyIds([]);
      fetchTask();
    } catch (error) {
      console.error("Bulk ping error:", error);
      Swal.fire('Transmission Failed', 'Failed to dispatch bulk pings.', 'error');
    }
  };

  const handleManualComplete = async (taskId: number) => {
    const result = await Swal.fire({
      title: 'Finalize Mission?',
      text: "This will mark the entire mission as Completed for the department. No further contributions can be reviewed after this.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#f43f5e',
      confirmButtonText: 'Yes, Mark Completed',
      cancelButtonText: 'Not Yet',
      background: '#ffffff',
      customClass: {
        popup: 'rounded-[2.5rem] p-8',
        confirmButton: 'rounded-2xl px-6 py-4 font-black text-[10px] uppercase tracking-widest',
        cancelButton: 'rounded-2xl px-6 py-4 font-black text-[10px] uppercase tracking-widest'
      }
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/tasks.php`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: taskId, status: 'Completed' }),
          credentials: 'include'
        });
        const data = await response.json();
        if (data.status === 'success') {
          Swal.fire({
            icon: 'success',
            title: 'Mission Completed',
            text: 'The mission has been successfully finalized.',
            timer: 2000,
            showConfirmButton: false,
            customClass: { popup: 'rounded-[2.5rem]' }
          });
          fetchTask();
        }
      } catch (error) {
        console.error("Manual complete error:", error);
        Swal.fire('Error', 'Failed to update task status', 'error');
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/task_comments.php`, {
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

  const handlePreview = (file: any) => {
    const url = `${import.meta.env.VITE_API_URL}/${file.file_path}`;
    const ext = file.file_name.split('.').pop().toLowerCase();
    setPreviewFile({ url, name: file.file_name, type: ext });
    setIsPreviewOpen(true);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Completed': case 'Approved': return { bg: 'bg-emerald-500', color: 'text-emerald-500', icon: <CheckCircle2 className="w-4 h-4" /> };
      case 'Active': case 'Under Review': return { bg: 'bg-[#7C3AED]', color: 'text-[#7C3AED]', icon: <Clock className="w-4 h-4" /> };
      case 'Draft': return { bg: 'bg-slate-400', color: 'text-slate-400', icon: <FileText className="w-4 h-4" /> };
      case 'Submitted': return { bg: 'bg-amber-500', color: 'text-amber-500', icon: <CheckCircle2 className="w-4 h-4" /> };
      case 'Rework Required': return { bg: 'bg-rose-500', color: 'text-rose-500', icon: <RotateCcw className="w-4 h-4" /> };
      default: return { bg: 'bg-slate-400', color: 'text-slate-400', icon: <Clock className="w-4 h-4" /> };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-[#7C3AED]/20 rounded-full blur-xl animate-pulse" />
          <Loader2 className="w-10 h-10 animate-spin text-[#7C3AED] relative z-10" />
        </div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-6">Decrypting Task Intelligence...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center pb-32">
        <div className="p-8 bg-white rounded-[2rem] border border-slate-100 shadow-xl text-center max-w-sm">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-[#1E184B] mb-2">Task Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">The task you are looking for does not exist or you do not have permission to view it.</p>
          <button onClick={() => navigate('/hod/tasks')} className="px-6 py-3 bg-[#7C3AED] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#6D28D9] transition-all">
            Return to Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-32">
      <SEO title={`Mission View: ${task.title}`} />
      
      {/* Header Bar (Scrolls with page) */}
      <div className="bg-white border-b border-slate-200/60 px-4 md:px-8 py-4 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3 md:gap-4">
            <button 
              onClick={() => navigate('/hod/tasks')}
              className="p-2.5 bg-slate-50 text-slate-500 hover:text-[#7C3AED] hover:bg-[#7C3AED]/10 rounded-xl transition-all shrink-0 mt-0.5 sm:mt-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base md:text-xl font-black text-[#1E184B] truncate max-w-[240px] sm:max-w-md md:max-w-xl" title={task.title}>{task.title}</h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-sm shrink-0", getStatusConfig(task.status).bg)}>
                  {task.status}
                </span>
                <span className="text-[9px] md:text-[10px] font-bold text-slate-500 flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg shrink-0">
                  <Calendar className="w-3 h-3 text-[#7C3AED]" /> Created: <span className="font-extrabold text-slate-700">{formatDate(task.created_at)}</span>
                </span>
                <span className="text-[9px] md:text-[10px] font-black text-rose-600 flex items-center gap-1 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg shrink-0">
                  <Clock className="w-3 h-3 text-rose-500 animate-pulse" /> Deadline: <span className="font-extrabold text-rose-600">{formatDate(task.deadline)}</span>
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end sm:justify-start shrink-0">
            {task.status !== 'Completed' && (
              <button 
                onClick={() => handleManualComplete(task.id)}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Finalize Mission
              </button>
            )}
            <button 
              onClick={() => navigate(`/hod/tasks/edit/${task.id}`)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 bg-white border-2 border-slate-100 text-slate-600 hover:border-[#7C3AED]/30 hover:text-[#7C3AED] rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest transition-all text-center justify-center flex items-center whitespace-nowrap"
            >
              Edit Mission
            </button>
          </div>
        </div>
      </div>

      {/* 1. Header Briefing Docket (Full Width) */}
      <div className="max-w-[1400px] mx-auto px-2 md:px-8 mt-6">
        <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-4 sm:p-6 md:p-8 shadow-xl shadow-slate-200/20">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
            <div className="space-y-4 max-w-4xl flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#7C3AED]" /> Mission Intelligence Briefing
                </span>
              </div>
              <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap text-sm">
                {task.description || <span className="italic text-slate-400">No additional intelligence provided.</span>}
              </p>
              
              {/* Badges / Meta */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-black text-slate-600">{task.category || 'General'}</span>
                </div>
                <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-black text-slate-600">{task.task_type}</span>
                </div>
                <div className={cn("px-3.5 py-1.5 rounded-xl border flex items-center gap-2", 
                  task.priority === 'Critical' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                  task.priority === 'High' ? 'bg-orange-50 border-orange-100 text-orange-600' :
                  'bg-emerald-50 border-emerald-100 text-emerald-600'
                )}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-black">{task.priority} Priority</span>
                </div>
              </div>
            </div>

            {/* Reference Materials Inside Briefing Block */}
            {(task.task_link || task.attachments.filter(a => a.entity_type === 'Task').length > 0) && (
              <div className="lg:w-80 shrink-0 bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-3 w-full">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Reference Assets
                </h4>
                
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                  {task.task_link && (
                    <div className="p-2.5 bg-white border border-slate-100 rounded-xl flex items-center justify-between gap-2">
                      <a href={task.task_link} target="_blank" rel="noreferrer" className="text-[11px] font-black text-[#7C3AED] dark:text-[#A78BFA] hover:underline truncate max-w-[150px]">
                        {task.task_link}
                      </a>
                      <a href={task.task_link} target="_blank" rel="noreferrer" className="p-1 text-slate-400 dark:text-slate-500 hover:text-[#7C3AED] dark:hover:text-[#8B5CF6]">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                  
                  {task.attachments.filter(a => a.entity_type === 'Task').map(att => (
                    <div key={att.id} className="p-2.5 bg-white border border-slate-100 rounded-xl flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black text-slate-600 truncate max-w-[150px]" title={att.file_name}>
                        {att.file_name}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => handlePreview(att)} className="p-1 text-slate-400 hover:text-indigo-600"><Eye className="w-3.5 h-3.5" /></button>
                        <a href={getDownloadUrl(att.file_path)} download className="p-1 text-slate-400 hover:text-[#7C3AED]"><Download className="w-3.5 h-3.5" /></a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Workspace Columns */}
      <div className="max-w-[1400px] mx-auto px-2 md:px-8 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* Left Column (5/12 width): Operative Roster */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#130C24] rounded-[2rem] border-2 border-slate-100 dark:border-violet-500/15 p-4 sm:p-6 shadow-xl shadow-slate-200/20 dark:shadow-violet-900/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black text-slate-400 dark:text-violet-400/70 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4 h-4 text-[#7C3AED] dark:text-violet-400" />
                Operative Assignment Roster
              </h3>
              <span className="bg-indigo-50 dark:bg-violet-500/15 text-[#7C3AED] dark:text-violet-300 px-3 py-1 rounded-xl text-[10px] font-black">
                {task.assignments.length} Assigned
              </span>
            </div>

            {/* Bulk Controls Expansion Board (Compact Roster Header Check) */}
            {task.assignments.length > 0 && (
              <div className="mb-4 p-3 bg-slate-50 dark:bg-[#1A0F35] border border-slate-100 dark:border-violet-500/15 rounded-2xl flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer text-[10px] font-black text-slate-500 dark:text-violet-400/70 uppercase tracking-widest">
                  {/* Custom checkbox */}
                  <span
                    onClick={(e) => {
                      e.preventDefault();
                      if (selectedAssignmentIds.length > 0 && selectedAssignmentIds.length === task.assignments.length) {
                        setSelectedAssignmentIds([]);
                      } else {
                        setSelectedAssignmentIds(task.assignments.map(a => a.user_id));
                      }
                    }}
                    className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all",
                      selectedAssignmentIds.length > 0 && selectedAssignmentIds.length === task.assignments.length
                        ? "bg-[#7C3AED] border-[#7C3AED]"
                        : "bg-white dark:bg-[#130C24] border-slate-300 dark:border-violet-500/40"
                    )}
                  >
                    {selectedAssignmentIds.length > 0 && selectedAssignmentIds.length === task.assignments.length && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span>Select All Operatives</span>
                </label>
                {selectedAssignmentIds.length > 0 && (
                  <span className="px-2.5 py-0.5 bg-[#7C3AED] text-white text-[9px] font-black rounded-lg uppercase tracking-wider">
                    {selectedAssignmentIds.length} Selected
                  </span>
                )}
              </div>
            )}

            {/* Assignment Cards List */}
            <div className="space-y-3">
              {task.assignments.length > 0 ? (
                task.assignments.map(assign => (
                  <div 
                    key={assign.id} 
                    onClick={() => setSelectedAssignmentId(assign.user_id)}
                    className={cn(
                      "cursor-pointer flex flex-col p-4 border-2 rounded-2xl gap-3 transition-all hover:shadow-md",
                      // Background colors
                      ['Submitted', 'Under Review'].includes(assign.status)
                        ? "bg-orange-50/10 dark:bg-orange-900/10"
                        : (assign.status === 'Approved' || assign.status === 'Completed')
                          ? "bg-emerald-50/10 dark:bg-emerald-900/10"
                          : selectedAssignmentId === assign.user_id
                            ? "bg-white dark:bg-[#1A0F35]"
                            : "bg-slate-50/50 dark:bg-[#1A0F35]/50",
                      
                      // Border colors
                      ['Submitted', 'Under Review'].includes(assign.status)
                        ? "border-orange-400 hover:border-orange-500" 
                        : (assign.status === 'Approved' || assign.status === 'Completed')
                          ? "border-emerald-500 hover:border-emerald-600" 
                          : selectedAssignmentId === assign.user_id
                            ? "border-[#7C3AED] dark:border-violet-500"
                            : "border-slate-100 dark:border-violet-500/10",
                      
                      // Selected shadow/ring focus indicator
                      selectedAssignmentId === assign.user_id && "ring-2 ring-offset-2 ring-[#7C3AED]/40 dark:ring-violet-400/70 ring-offset-white dark:ring-offset-[#130C24] shadow-lg dark:shadow-violet-500/20"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Custom checkbox */}
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedAssignmentIds.includes(assign.user_id)) {
                              setSelectedAssignmentIds(prev => prev.filter(id => id !== assign.user_id));
                            } else {
                              setSelectedAssignmentIds(prev => [...prev, assign.user_id]);
                            }
                          }}
                          className={cn(
                            "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all",
                            selectedAssignmentIds.includes(assign.user_id)
                              ? "bg-[#7C3AED] border-[#7C3AED]"
                              : "bg-white dark:bg-[#130C24] border-slate-300 dark:border-violet-500/40"
                          )}
                        >
                          {selectedAssignmentIds.includes(assign.user_id) && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <div className="w-9 h-9 bg-white dark:bg-[#1A0F35] rounded-xl flex items-center justify-center font-black text-indigo-600 dark:text-violet-400 shadow-sm border border-slate-100 dark:border-violet-500/20 overflow-hidden shrink-0">
                          {assign.faculty_pic ? (
                            <img src={`${import.meta.env.VITE_API_URL}/${assign.faculty_pic}`} alt={assign.faculty_name} className="w-full h-full object-cover" />
                          ) : (
                            assign.faculty_name.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFacultyId(assign.user_id);
                              setIsFacultyModalOpen(true);
                            }}
                            className="text-xs font-black text-[#1E184B] dark:text-indigo-100 hover:text-[#7C3AED] dark:hover:text-violet-400 transition-colors truncate block text-left w-full cursor-pointer"
                          >
                            {assign.faculty_name}
                          </button>
                          <p className="text-[9px] font-bold text-slate-400 dark:text-violet-400/60 truncate max-w-[130px]">{assign.faculty_email}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 gap-1.5">
                        <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border shadow-sm", 
                          assign.status === 'Approved' || assign.status === 'Completed' ? 'bg-emerald-500 border-emerald-600 text-white animate-pulse' :
                          ['Submitted', 'Under Review'].includes(assign.status) ? 'bg-orange-500 border-orange-600 text-white' :
                          assign.status === 'Rework Required' ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-500/20 text-rose-500 dark:text-rose-400' :
                          'bg-indigo-50 dark:bg-violet-900/20 border-indigo-100 dark:border-violet-500/20 text-indigo-500 dark:text-violet-300'
                        )}>
                          {['Submitted', 'Under Review'].includes(assign.status) ? 'Review Pending' : 
                           assign.status === 'Approved' || assign.status === 'Completed' ? 'Reviewed' : 
                           assign.status}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFaculty(task.id, assign.user_id, assign.faculty_name);
                          }}
                          className="px-2 py-0.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded text-[8px] font-black uppercase tracking-wider transition-all border border-rose-100/50 dark:border-rose-500/20 flex items-center gap-0.5 shadow-sm bg-white dark:bg-[#130C24]"
                          title="Remove faculty member from task"
                        >
                          <X className="w-2.5 h-2.5" /> Remove
                        </button>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-[8px] font-bold text-slate-400 dark:text-violet-400/50">{assign.progress}%</span>
                          <div className="w-12 h-1 bg-slate-200 dark:bg-violet-900/40 rounded-full overflow-hidden">
                            <div className="h-full bg-[#7C3AED] dark:bg-violet-500" style={{ width: `${assign.progress}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 border-2 border-dashed border-slate-200 dark:border-violet-500/15 rounded-3xl text-center">
                  <Users className="w-8 h-8 text-slate-300 dark:text-violet-900/60 mx-auto mb-3" />
                  <p className="text-[10px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest">No assignments found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (7/12 width): Dynamic Workspace Area */}
        <div className="lg:col-span-7 space-y-6">
          {selectedAssignmentIds.length > 0 ? (
            
            /* BULK EVALUATION WORKSPACE (Rendered on Right Side) */
            (() => {
              const eligibleCount = selectedAssignmentIds.filter(userId => {
                const assign = task.assignments.find(a => a.user_id === userId);
                return assign && ['Submitted', 'Under Review'].includes(assign.status);
              }).length;

              return (
                <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-4 sm:p-6 md:p-8 shadow-xl shadow-slate-200/20 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                  
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-sm font-black text-[#1E184B] uppercase tracking-widest flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-[#7C3AED]" /> Bulk Evaluation Protocol
                      </h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                        Applying reviews & scores in batch
                      </p>
                    </div>
                    <span className="px-3 py-1.5 bg-[#7C3AED] text-white text-[10px] font-black rounded-xl uppercase tracking-widest">
                      {selectedAssignmentIds.length} Selected
                    </span>
                  </div>

                  {eligibleCount === 0 ? (
                    <div className="p-6 bg-amber-50/20 border-2 border-dashed border-amber-200/60 rounded-2xl text-center space-y-3">
                      <Clock className="w-8 h-8 text-amber-500 mx-auto animate-pulse" />
                      <h4 className="text-xs font-black text-[#1E184B] uppercase tracking-widest">Awaiting Selected Submissions</h4>
                      <p className="text-[10px] font-bold text-slate-400 max-w-xs mx-auto">
                        None of the selected operatives have submitted their work yet. Bulk scoring, merit allocation, and batch review decisions are locked.
                      </p>
                    </div>
                  ) : (
                    <>
                      {selectedAssignmentIds.length > eligibleCount && (
                        <div className="p-3.5 bg-rose-50 border border-rose-100/60 rounded-xl text-[10px] font-bold text-rose-900 leading-relaxed">
                          ⚠️ Note: {selectedAssignmentIds.length - eligibleCount} selected operative(s) have not submitted their work yet and will be skipped during bulk evaluation.
                        </div>
                      )}
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Review Decision</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 p-1.5 bg-slate-50 border-2 border-slate-100 rounded-2xl">
                            <button 
                              type="button"
                              onClick={() => setBulkReviewData({...bulkReviewData, status: 'Approved'})}
                              className={cn(
                                "py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                                bulkReviewData.status === 'Approved' 
                                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" 
                                  : "text-slate-500 hover:text-[#1E184B] hover:bg-slate-100"
                              )}
                            >
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                              Approve Selected
                            </button>
                            <button 
                              type="button"
                              onClick={() => setBulkReviewData({...bulkReviewData, status: 'Rework Required'})}
                              className={cn(
                                "py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                                bulkReviewData.status === 'Rework Required' 
                                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" 
                                  : "text-slate-500 hover:text-[#1E184B] hover:bg-slate-100"
                              )}
                            >
                              <RotateCcw className="w-4 h-4 shrink-0" />
                              Request Rework
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest">Merit ({bulkReviewData.points})</label>
                            </div>
                            <input 
                              type="range" min="0" max="50" step="5" 
                              value={bulkReviewData.points} 
                              onChange={e => {
                                const pts = parseInt(e.target.value) || 0;
                                setBulkReviewData({
                                  ...bulkReviewData, 
                                  points: pts,
                                  bonus_points: pts === 0 ? 0 : bulkReviewData.bonus_points
                                });
                              }}
                              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#7C3AED]"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className={cn("text-[10px] font-black uppercase tracking-widest transition-all", bulkReviewData.points === 0 ? "text-slate-300" : "text-[#1E184B]")}>
                                Bonus (+{bulkReviewData.points === 0 ? 0 : bulkReviewData.bonus_points})
                              </label>
                            </div>
                            <input 
                              type="range" min="0" max="5" step="1" 
                              disabled={bulkReviewData.points === 0}
                              value={bulkReviewData.points === 0 ? 0 : bulkReviewData.bonus_points} 
                              onChange={e => setBulkReviewData({...bulkReviewData, bonus_points: parseInt(e.target.value) || 0})}
                              className={cn(
                                "w-full h-1.5 rounded-lg appearance-none cursor-pointer transition-all",
                                bulkReviewData.points === 0 ? "bg-slate-50 accent-slate-200 cursor-not-allowed opacity-50" : "bg-slate-100 accent-amber-500"
                              )}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Department Remarks</label>
                          <textarea 
                            value={bulkReviewData.remarks} 
                            onChange={e => setBulkReviewData({...bulkReviewData, remarks: e.target.value})}
                            placeholder="Add bulk remarks for selected operatives..."
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold text-[#1E184B] p-4 min-h-[90px] resize-none focus:outline-none focus:bg-white focus:border-[#7C3AED] transition-all"
                          />
                        </div>
                      </div>

                      <button 
                        type="button"
                        onClick={handleBulkReviewSubmit}
                        className="w-full py-4 bg-[#7C3AED] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-[#6D28D9] transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" /> 
                        Submit Bulk Review
                      </button>
                    </>
                  )}

                  {/* Bulk Alerts Transmission Panel inside Right Workspace */}
                  <div className="border-t border-slate-100 pt-6 space-y-4">
                    <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-rose-500 animate-bounce" /> Bulk Alert Transmission
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <button 
                        type="button"
                        onClick={() => handleBulkReminders('Gentle Reminder')}
                        className="py-3.5 px-2 bg-slate-50 hover:bg-[#7C3AED] hover:text-white text-[#7C3AED] hover:shadow-lg hover:shadow-indigo-500/20 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 group active:scale-95"
                      >
                        <Info className="w-5 h-5 text-[#7C3AED] group-hover:text-white transition-colors" /> Gentle
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleBulkReminders('Reminder')}
                        className="py-3.5 px-2 bg-slate-50 hover:bg-amber-500 hover:text-white text-amber-600 hover:shadow-lg hover:shadow-amber-500/20 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 group active:scale-95"
                      >
                        <Bell className="w-5 h-5 text-amber-500 group-hover:text-white transition-colors" /> Reminder
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleBulkReminders('Warning')}
                        className="py-3.5 px-2 bg-slate-50 hover:bg-rose-600 hover:text-white text-rose-600 hover:shadow-lg hover:shadow-rose-500/20 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 group active:scale-95"
                      >
                        <AlertTriangle className="w-5 h-5 text-rose-600 group-hover:text-white transition-colors" /> Warning
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : selectedAssignmentId ? (
            
            /* INDIVIDUAL EVALUATION WORKSPACE */
            (() => {
              const currentAssign = task.assignments.find(a => a.user_id === selectedAssignmentId);
              if (!currentAssign) return null;

              return (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                  
                  {/* Operative Header & Evidence Container */}
                  <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-4 sm:p-6 md:p-8 shadow-xl shadow-slate-200/20 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-sm overflow-hidden shrink-0">
                          {currentAssign.faculty_pic ? (
                            <img src={`${import.meta.env.VITE_API_URL}/${currentAssign.faculty_pic}`} className="w-full h-full object-cover" />
                          ) : (
                            currentAssign.faculty_name.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Currently Evaluating</p>
                          <p className="text-sm font-black text-[#1E184B]">{currentAssign.faculty_name}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap sm:flex-col items-center sm:items-end gap-2 text-right justify-between w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveFaculty(task.id, currentAssign.user_id, currentAssign.faculty_name)}
                            className="px-2.5 py-1 text-rose-600 hover:text-white border border-rose-200 hover:bg-rose-600 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1 shadow-sm bg-white whitespace-nowrap"
                            title="Remove faculty member from this task entirely"
                          >
                            <X className="w-3 h-3" /> Remove From Task
                          </button>
                          <span className={cn("px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-sm shrink-0", getStatusConfig(currentAssign.status).bg)}>
                            {currentAssign.status}
                          </span>
                        </div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider sm:mt-1.5 shrink-0">Progress: {currentAssign.progress}%</p>
                      </div>
                    </div>

                    {/* Delay & Timeline metrics */}
                    {currentAssign.submitted_at && (
                      <div className="p-4 bg-indigo-50/20 dark:bg-indigo-950/15 border border-indigo-100/50 dark:border-indigo-900/35 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Clock className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                          <div>
                            <p className="text-[8px] font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest">Submitted Date</p>
                            <p className="text-[10px] font-bold text-indigo-700/70 dark:text-indigo-400/80">{formatDate(currentAssign.submitted_at)}</p>
                          </div>
                        </div>
                        {currentAssign.is_delayed === 1 && (
                          <div className="text-right">
                            <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/35 text-rose-600 dark:text-rose-400 rounded-lg text-[8px] font-black uppercase tracking-widest">Delay Checked</span>
                            <p className="text-[10px] font-bold text-rose-500/70 dark:text-rose-400/80 mt-1">
                              {Math.max(1, Math.ceil((new Date(currentAssign.submitted_at).getTime() - new Date(task.deadline).getTime()) / (1000 * 3600 * 24)))} Days Late
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUBMISSIONS & EVIDENCE (Grouped directly inside evaluation panel) */}
                    <div className="space-y-3 pt-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Submitted Evidence Deliverables</h4>
                      
                      {currentAssign.submission_link && (
                        <div className="p-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 bg-emerald-100/50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                              <BookOpen className="w-4.5 h-4.5" />
                            </div>
                            <div className="min-w-0 flex flex-col">
                              <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Evidence URL</p>
                              <a href={currentAssign.submission_link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#7C3AED] hover:underline truncate max-w-[200px] sm:max-w-sm break-all">
                                {currentAssign.submission_link}
                              </a>
                            </div>
                          </div>
                          <a href={currentAssign.submission_link} target="_blank" rel="noopener noreferrer" className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/10 shrink-0">
                            Open Link
                          </a>
                        </div>
                      )}

                      {task.attachments.filter(a => a.entity_type === 'Task_Submission' && a.uploader_id === selectedAssignmentId).map(att => (
                        <div key={att.id} className="flex items-center justify-between p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100 group">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-black text-[#1E184B] truncate max-w-[180px] sm:max-w-sm">{att.file_name}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{formatDate(att.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => handlePreview(att)} className="p-2 bg-white text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100"><Eye className="w-4 h-4" /></button>
                            <a href={getDownloadUrl(att.file_path)} download className="p-2 bg-white text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100"><Download className="w-4 h-4" /></a>
                          </div>
                        </div>
                      ))}

                      {(!currentAssign.submission_link && 
                        task.attachments.filter(a => a.entity_type === 'Task_Submission' && a.uploader_id === selectedAssignmentId).length === 0) && (
                        <p className="text-[10px] font-bold text-slate-400 italic p-6 border-2 border-dashed rounded-2xl text-center bg-slate-50/50">
                          No deliverables or evidence submitted by this operative yet.
                        </p>
                      )}
                    </div>

                    {/* Remarks from Faculty */}
                    <div className="space-y-2.5 pt-2 border-t border-slate-100/60">
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Remarks from Faculty</h4>
                      {currentAssign.public_remarks && (
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 px-2 py-0.5 bg-indigo-500 text-white text-[6px] font-black uppercase tracking-widest rounded-bl-md">Public</div>
                          <p className="text-[11px] font-medium text-[#1E184B]/80 italic">"{currentAssign.public_remarks}"</p>
                        </div>
                      )}
                      {currentAssign.private_remarks && (
                        <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 px-2 py-0.5 bg-amber-500 text-white text-[6px] font-black uppercase tracking-widest rounded-bl-md">Private to HOD</div>
                          <p className="text-[11px] font-medium text-amber-900/80 italic">"{currentAssign.private_remarks}"</p>
                        </div>
                      )}
                      {(!currentAssign.public_remarks && !currentAssign.private_remarks) && (
                        <p className="text-[10px] font-bold text-slate-400 italic">No comments or remarks provided by faculty.</p>
                      )}
                    </div>
                  </div>

                  {/* Active Assessment Controls & Sliders */}
                  <div className="bg-white dark:bg-[#130C24] rounded-[2rem] border-2 border-slate-100 dark:border-violet-500/15 p-6 md:p-8 shadow-xl shadow-slate-200/20 dark:shadow-violet-900/20 space-y-6">
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-violet-400/70 uppercase tracking-widest flex items-center gap-1.5"><Award className="w-4 h-4 text-[#7C3AED] dark:text-violet-400" /> Assessment Configurator & Triggers</h3>
                    
                    {!['Submitted', 'Under Review', 'Approved', 'Completed'].includes(currentAssign.status) ? (
                      <div className="p-6 bg-amber-50/20 dark:bg-amber-900/10 border-2 border-dashed border-amber-200/60 dark:border-amber-500/25 rounded-2xl text-center space-y-3">
                        <Clock className="w-8 h-8 text-amber-500 dark:text-amber-400 mx-auto animate-pulse" />
                        <h4 className="text-xs font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest">Awaiting Operative Submission</h4>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-violet-400/60 max-w-xs mx-auto">
                          Merit scoring, bonus allocations, and review buttons are locked. Awaiting operative's deliverables before assessment can be executed.
                        </p>
                      </div>
                    ) : (
                      /* Decision Buttons (Approve / Rework) */
                      <div className="space-y-3">
                        {currentAssign.status !== 'Approved' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <button 
                              type="button" 
                              onClick={() => handleApproveContribution(task.id, currentAssign.user_id, currentAssign.points)} 
                              className="py-3.5 sm:py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-md shadow-emerald-500/10 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                            >
                              <CheckCircle2 className="w-4 h-4 shrink-0" /> Approve Contribution
                            </button>
                            <button 
                              type="button" 
                              onClick={() => updateReviewStatus(task.id, { status: 'Rework Required' }, currentAssign.user_id)} 
                              className="py-3.5 sm:py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-md shadow-orange-500/10 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                            >
                              <RotateCcw className="w-4 h-4 shrink-0" /> Request Rework
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl text-center flex items-center justify-center gap-3">
                              <CheckCircle2 className="w-6 h-6 text-emerald-500 dark:text-emerald-400 shrink-0 animate-bounce" />
                              <div className="text-left">
                                <p className="text-[10px] font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-widest">Contribution Approved</p>
                                <p className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400/70">Finalized metrics recorded in database.</p>
                              </div>
                            </div>
                            <button 
                              type="button"
                              onClick={() => updateReviewStatus(task.id, { status: 'Rework Required' }, currentAssign.user_id)} 
                              className="w-full py-3.5 bg-orange-50/50 dark:bg-orange-900/15 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-500/20 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-orange-500 dark:hover:bg-orange-600 hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                              <RotateCcw className="w-4 h-4" /> Revoke & Ask for Rework
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Push Alerts triggers if not approved and not submitted */}
                    {!['Approved', 'Completed', 'Submitted', 'Under Review'].includes(currentAssign.status) && (
                      <div className="p-4 bg-slate-50 dark:bg-[#1A0F35] rounded-2xl border border-slate-100 dark:border-violet-500/15 space-y-3">
                        <h4 className="text-[9px] font-black text-slate-400 dark:text-violet-400/60 uppercase tracking-widest flex items-center gap-1.5"><Bell className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" /> Dispatch Push Reminders</h4>
                        <div className="grid grid-cols-3 gap-2">
                          <button 
                            type="button"
                            onClick={() => handleSendReminder(task.id, currentAssign.user_id, 'Gentle Reminder')}
                            className="py-2 px-1 bg-white dark:bg-[#130C24] hover:bg-indigo-600 dark:hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-violet-500/15 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all flex flex-col items-center gap-1 shadow-sm"
                          >
                            <Info className="w-3.5 h-3.5" /> Gentle
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleSendReminder(task.id, currentAssign.user_id, 'Reminder')}
                            className="py-2 px-1 bg-white dark:bg-[#130C24] hover:bg-amber-500 dark:hover:bg-amber-600 hover:text-white text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-violet-500/15 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all flex flex-col items-center gap-1 shadow-sm"
                          >
                            <Bell className="w-3.5 h-3.5" /> Reminder
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleSendReminder(task.id, currentAssign.user_id, 'Warning')}
                            className="py-2 px-1 bg-white dark:bg-[#130C24] hover:bg-rose-600 dark:hover:bg-rose-700 hover:text-white text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-violet-500/15 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all flex flex-col items-center gap-1 shadow-sm"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" /> Warning
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Merit / Bonus score sliders & feedback - only visible if work has been submitted */}
                    {['Submitted', 'Under Review', 'Approved', 'Completed'].includes(currentAssign.status) && (
                      <div className="space-y-4 pt-2">
                        <div>
                          <div className="flex justify-between mb-1.5">
                            <label className="text-[9px] font-black text-[#1E184B] dark:text-indigo-200 uppercase tracking-widest">Merit Score</label>
                            <span className="text-[10px] font-black text-[#7C3AED] dark:text-violet-400 bg-[#7C3AED]/10 dark:bg-violet-500/15 px-2 py-0.5 rounded-lg">{currentAssign.points || 0} / 50</span>
                          </div>
                          <input 
                            type="range" min="0" max="50" step="5" 
                            value={currentAssign.points || 0} 
                            onChange={(e) => {
                              const pts = parseInt(e.target.value);
                              const updatedAssignments = task.assignments.map(a => 
                                a.user_id === selectedAssignmentId ? { ...a, points: pts, bonus_points: pts === 0 ? 0 : a.bonus_points } : a
                              );
                              setTask({ ...task, assignments: updatedAssignments });
                              
                              // Trigger debounced points & bonus update
                              debouncedUpdatePoints(
                                task.id,
                                currentAssign.user_id,
                                pts,
                                pts === 0 ? 0 : currentAssign.bonus_points
                              );
                            }}
                            className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#7C3AED] dark:accent-[#8B5CF6]" 
                          />
                        </div>

                        <div>
                          <div className="flex justify-between mb-1.5">
                            <label className="text-[9px] font-black text-[#1E184B] dark:text-indigo-200 uppercase tracking-widest">Incentive Bonus</label>
                            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-lg">+{currentAssign.bonus_points || 0} pts</span>
                          </div>
                          <input 
                            type="range" min="0" max="5" step="1" 
                            disabled={currentAssign.points === 0}
                            value={currentAssign.bonus_points || 0} 
                            onChange={(e) => {
                              const bonus = parseInt(e.target.value);
                              const updatedAssignments = task.assignments.map(a => 
                                a.user_id === selectedAssignmentId ? { ...a, bonus_points: bonus } : a
                              );
                              setTask({ ...task, assignments: updatedAssignments });

                              // Trigger debounced points & bonus update
                              debouncedUpdatePoints(
                                task.id,
                                currentAssign.user_id,
                                currentAssign.points,
                                bonus
                              );
                            }}
                            className={cn(
                              "w-full h-1.5 rounded-lg appearance-none cursor-pointer transition-all",
                              currentAssign.points === 0 ? "bg-slate-50 dark:bg-slate-900 accent-slate-200 dark:accent-slate-800 cursor-not-allowed opacity-50" : "bg-slate-100 dark:bg-slate-800 accent-amber-500"
                            )}
                          />
                        </div>

                        <div className="space-y-2 pt-2">
                          <label className="text-[9px] font-black text-slate-400 dark:text-violet-400/60 uppercase tracking-widest ml-1">Individual Evaluation Feedback</label>
                          <textarea 
                            placeholder="Provide specific feedback remarks for this operative..."
                            value={currentAssign.remarks || ''}
                            onChange={(e) => {
                              const rem = e.target.value;
                              const updatedAssignments = task.assignments.map(a => 
                                a.user_id === selectedAssignmentId ? { ...a, remarks: rem } : a
                              );
                              setTask({ ...task, assignments: updatedAssignments });
                            }}
                            onBlur={(e) => updateReviewStatus(task.id, { remarks: e.target.value }, currentAssign.user_id)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A0F35] border border-slate-100 dark:border-violet-500/15 rounded-2xl text-xs font-bold text-[#1E184B] dark:text-indigo-100 placeholder:text-slate-400 dark:placeholder:text-violet-400/40 focus:outline-none focus:bg-white dark:focus:bg-[#1A0F35] focus:border-[#7C3AED] dark:focus:border-violet-500 transition-all min-h-[80px] resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Collaborative Discussion Chain & Flags (Intel Center) */}
                  <div className="bg-white dark:bg-[#130C24] rounded-[2rem] border-2 border-slate-100 dark:border-violet-500/15 p-6 md:p-8 shadow-xl shadow-slate-200/20 dark:shadow-violet-900/20 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-violet-500/15 pb-4">
                      <h3 className="text-xs font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-[#7C3AED] dark:text-violet-400" />
                        Discussion Intel Chain
                      </h3>
                      <span className="px-2.5 py-0.5 bg-[#7C3AED]/10 dark:bg-violet-500/15 text-[#7C3AED] dark:text-violet-400 text-[8px] font-black rounded-full uppercase">
                        {(task.comments?.length || 0)} Entries
                      </span>
                    </div>

                    {/* Overall flag control */}
                    <div className="space-y-3 bg-slate-50 dark:bg-[#1A0F35] p-4 rounded-2xl border border-slate-100 dark:border-violet-500/15">
                      <h4 className="text-[9px] font-black text-slate-400 dark:text-violet-400/60 uppercase tracking-[0.2em]">Overall Task Flag Color</h4>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { color: null, label: 'None', bg: 'bg-slate-200' },
                          { color: 'Red', label: 'Critical', bg: 'bg-rose-500' },
                          { color: 'Orange', label: 'Delayed', bg: 'bg-orange-500' },
                          { color: 'Yellow', label: 'Check', bg: 'bg-amber-400' },
                          { color: 'Green', label: 'Perfect', bg: 'bg-emerald-500' }
                        ].map((f) => (
                          <button
                            key={f.label}
                            type="button"
                            onClick={() => updateReviewStatus(task.id, { flag_color: f.color })}
                            className={cn(
                              "h-8 rounded-xl transition-all flex items-center justify-center p-0.5",
                              task.flag_color === f.color ? "ring-2 ring-offset-2 ring-[#7C3AED] opacity-100 scale-105" : "opacity-40 hover:opacity-85"
                            )}
                            title={f.label}
                          >
                            <div className={cn("w-full h-full rounded-lg", f.bg)} />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Comments bubble list */}
                    <div className="space-y-4 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar bg-slate-50/50 dark:bg-[#0E0820]/50 p-4 rounded-2xl border border-slate-100 dark:border-violet-500/10">
                      {task.comments && task.comments.length > 0 ? (
                        task.comments.map((com) => (
                          <div key={`com-${com.id}`} className={cn(
                            "p-3 rounded-2xl space-y-1.5 border animate-in fade-in slide-in-from-bottom-2",
                            com.user_id === user.id 
                              ? "bg-[#7C3AED] border-[#7C3AED] ml-6 text-white shadow-md shadow-[#7C3AED]/10" 
                              : "bg-white dark:bg-[#130C24] border-slate-100 dark:border-violet-500/15 mr-6"
                          )}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className={cn("text-[9px] font-black uppercase tracking-widest truncate max-w-[80px]", com.user_id === user.id ? "text-white/80" : "text-[#7C3AED]")}>
                                  {com.user_id === user.id ? "You" : com.user_name}
                                </span>
                              </div>
                              <span className={cn("text-[7px] font-bold shrink-0", com.user_id === user.id ? "text-white/40" : "text-slate-400")}>
                                {formatDate(com.created_at)}
                              </span>
                            </div>
                            <p className={cn("text-xs font-medium leading-relaxed break-words", com.user_id === user.id ? "text-white" : "text-[#1E184B]/80")}>
                              {com.comment}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center">
                          <MessageSquare className="w-6 h-6 text-slate-300 mx-auto mb-2 opacity-20" />
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No comments logged yet</p>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleAddComment} className="relative mt-2">
                      <input 
                        type="text"
                        placeholder="Guidance or intelligence input..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="w-full pl-5 pr-12 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-[#1E184B] focus:outline-none focus:bg-white focus:border-[#7C3AED] transition-all"
                      />
                      <button 
                        type="submit"
                        disabled={isSubmittingComment || !newComment.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#7C3AED] text-white rounded-xl hover:bg-[#6D28D9] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isSubmittingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      </button>
                    </form>
                  </div>

                </div>
              );
            })()
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-12 bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl shadow-slate-200/20 h-[400px]">
              <Users className="w-12 h-12 text-[#7C3AED]/20 mb-4 animate-pulse" />
              <h4 className="text-sm font-black text-[#1E184B] uppercase tracking-widest">Evaluation Desk</h4>
              <p className="text-xs font-bold text-slate-400 mt-2 max-w-sm">Select an operative from the assignment roster on the left to begin reviewing their evidence, scoring performance, and sending feedback remarks.</p>
            </div>
          )}
        </div>

      </div>

      {/* 3. Unaccepted Broadcast Faculty Section (Only for Broadcasted Tasks) */}
      {task.assignment_mode === 'broadcast' && (() => {
        // Find faculty who have NOT accepted yet (no assignment record)
        const acceptedUserIds = task.assignments.map(a => a.user_id);
        const unacceptedFaculty = allFaculty.filter(f => !acceptedUserIds.includes(f.id));

        return (
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 mt-8 animate-in fade-in slide-in-from-bottom-6 duration-300">
            <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-6 md:p-8 shadow-xl shadow-slate-200/20 space-y-6">
              
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-black text-[#1E184B] uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-500 animate-pulse" />
                    Unaccepted Broadcast Operatives
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                    Faculty members who have not accepted this department broadcast task yet
                  </p>
                </div>
                
                {unacceptedFaculty.length > 0 && (
                  <div className="flex items-center gap-3">
                    {selectedUnacceptedFacultyIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleBulkPingFaculty}
                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 active:scale-95"
                      >
                        <Bell className="w-4 h-4 text-white animate-bounce" />
                        Bulk Ping Selected ({selectedUnacceptedFacultyIds.length})
                      </button>
                    )}
                    <span className="bg-amber-50 text-amber-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border border-amber-100 shadow-sm">
                      {unacceptedFaculty.length} Pending Acceptance
                    </span>
                  </div>
                )}
              </div>

              {unacceptedFaculty.length > 0 ? (
                <div className="space-y-4">
                  {/* Select All Banner for Unaccepted Faculty */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <input 
                        type="checkbox"
                        checked={
                          selectedUnacceptedFacultyIds.length > 0 &&
                          selectedUnacceptedFacultyIds.length === unacceptedFaculty.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUnacceptedFacultyIds(unacceptedFaculty.map(f => f.id));
                          } else {
                            setSelectedUnacceptedFacultyIds([]);
                          }
                        }}
                        className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-500"
                      />
                      <span>Select All Unaccepted Operatives</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {unacceptedFaculty.map(fac => (
                      <div 
                        key={`unaccepted-${fac.id}`}
                        className={cn(
                          "p-4 border-2 rounded-2xl flex items-center justify-between gap-3 bg-slate-50/30 dark:bg-[#110A24]/40 transition-all hover:shadow-sm",
                          selectedUnacceptedFacultyIds.includes(fac.id) ? "border-amber-400 dark:border-amber-500 bg-amber-50/5 dark:bg-amber-500/5" : "border-slate-100 dark:border-slate-800/80"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input 
                            type="checkbox"
                            checked={selectedUnacceptedFacultyIds.includes(fac.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUnacceptedFacultyIds(prev => [...prev, fac.id]);
                              } else {
                                setSelectedUnacceptedFacultyIds(prev => prev.filter(id => id !== fac.id));
                              }
                            }}
                            className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-500 shrink-0"
                          />
                          <div className="w-9 h-9 bg-white dark:bg-[#1A1235] rounded-xl flex items-center justify-center font-black text-[#7C3AED] dark:text-[#A78BFA] shadow-sm border border-slate-100 dark:border-slate-800/80 overflow-hidden shrink-0">
                            {fac.profile_pic ? (
                              <img src={`${import.meta.env.VITE_API_URL}/${fac.profile_pic}`} alt={fac.name} className="w-full h-full object-cover" />
                            ) : (
                              fac.name.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-[#1E184B] truncate">{fac.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 truncate">{fac.email}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handlePingFaculty(task.id, fac.id, fac.name)}
                          className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-500/10 flex items-center gap-1.5 active:scale-95 shrink-0"
                          title="Send interactive push notice to accept this broadcast task"
                        >
                          <Bell className="w-3.5 h-3.5" /> Ping
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 border-2 border-dashed border-slate-200 rounded-3xl text-center bg-slate-50/20">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 animate-pulse animate-duration-1000" />
                  <h4 className="text-xs font-black text-[#1E184B] uppercase tracking-widest">Complete Team Alignment</h4>
                  <p className="text-[10px] font-bold text-slate-400 max-w-sm mx-auto mt-2 leading-relaxed">
                    Every active faculty member in your department has accepted this broadcasted task mission.
                  </p>
                </div>
              )}

            </div>
          </div>
        );
      })()}

      {/* Universal Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && previewFile && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsPreviewOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-[2.5rem] w-full max-w-5xl h-[80vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h3 className="text-lg md:text-xl font-black text-[#1E184B] truncate">{previewFile.name}</h3>
                <button onClick={() => setIsPreviewOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <div className="flex-1 bg-slate-50 relative">
                {['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(previewFile.type) ? (
                  <img src={previewFile.url} alt="Preview" className="absolute inset-0 w-full h-full object-contain" />
                ) : previewFile.type === 'pdf' ? (
                  <iframe src={previewFile.url} className="w-full h-full border-none" title="PDF Preview" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
                    <FileText className="w-16 h-16 text-slate-200" />
                    <p className="text-sm font-bold text-slate-400">Preview not available for this file type.</p>
                    <a href={getDownloadUrl(previewFile.url.replace(`${import.meta.env.VITE_API_URL}/`, ''))} download className="px-6 py-3 bg-[#7C3AED] text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#6D28D9] transition-all">Download File</a>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Collaborator Profile Modal */}
      <CollaboratorProfileModal 
        isOpen={isFacultyModalOpen}
        onClose={() => {
          setIsFacultyModalOpen(false);
          setSelectedFacultyId(null);
        }}
        userId={selectedFacultyId}
      />
    </div>
  );
}
