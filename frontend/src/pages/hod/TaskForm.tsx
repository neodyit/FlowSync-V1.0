import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  User, 
  Calendar,
  Layers,
  Pencil,
  Trash2,
  X,
  FileText,
  Download,
  Eye,
  Loader2,
  RotateCcw,
  Flag,
  Award,
  Users,
  Trophy,
  BookOpen,
  ArrowRight,
  Send,
  MessageSquare,
  Bell,
  AlertTriangle,
  Info,
  Tag,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';
import { cn, formatDate, getDownloadUrl } from '@/lib/utils';
import Swal from 'sweetalert2';
import { useSearchParams } from 'react-router-dom';

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
  entity_type: string;
  created_at: string;
  uploader_id: number;
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
  submission_link?: string | null;
}

interface ExtensionRequest {
  id: number;
  task_id: number;
  user_id: number;
  task_title: string;
  task_desc: string;
  faculty_name: string;
  current_deadline: string;
  requested_deadline: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requested_at: string;
  hod_remarks: string | null;
}

interface Task {
  created_at: string;
  id: number;
  title: string;
  description: string;
  deadline: string;
  priority: 'High' | 'Medium' | 'Low' | 'Critical';
  task_type: string;
  category: string;
  status: string;
  assignment_mode?: 'individual' | 'group' | 'broadcast';
  assigned_to_id: number | null;
  assigned_to_name: string | null;
  assigned_to_pic: string | null;
  points: number;
  bonus_points: number;
  aggregated_points?: number;
  aggregated_bonus_points?: number;
  flag_color: string | null;
  task_link?: string | null;
  assignments: Assignment[];
  attachments: Attachment[];
  comments?: {
    id: number;
    user_id: number;
    user_name: string;
    comment: string;
    created_at: string;
  }[];
}

const HODTasks: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Assigned' | 'Group' | 'Broadcasted' | 'Review Pending' | 'Active' | 'Completed' | 'Extensions' | 'Drafts'>('All');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [extensionRequests, setExtensionRequests] = useState<ExtensionRequest[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openSelect, setOpenSelect] = useState<'priority' | 'faculty' | 'category' | 'group' | null>(null);
  const [facultySearchQuery, setFacultySearchQuery] = useState('');
  const [mobileDetailTab, setMobileDetailTab] = useState<'mission' | 'evaluation'>('mission');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{url: string, name: string, type: string} | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<number[]>([]);
  const [bulkReviewData, setBulkReviewData] = useState({ status: 'Approved', points: 0, bonus_points: 0, remarks: '' });
  const [isBulkStatusDropdownOpen, setIsBulkStatusDropdownOpen] = useState(false);
  const [systemSettings, setSystemSettings] = useState({ pause_new_tasks: 'false' });
  const [groups, setGroups] = useState<{id: number, name: string, members: {id: number}[]}[]>([]);
  // Form State
  const [formData, setFormData] = useState({
    id: null as number | null,
    title: '',
    description: '',
    deadline: '',
    priority: 'Medium',
    task_type: 'Other',
    category: 'General',
    assignment_mode: 'individual',
    assigned_to_ids: [] as string[],
    task_link: '',
    attachments: [] as File[]
  });

  const fetchGroups = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/groups.php`, { credentials: 'include' });
      const data = await response.json();
      if (data.status === 'success') {
        setGroups(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  const fetchTasks = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/tasks.php`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        setTasks(data.data);
        if (data.settings) {
          setSystemSettings(data.settings);
        }
        
        setSelectedTask(prev => {
          if (!prev) return null;
          const updated = data.data.find((t: Task) => t.id === prev.id);
          return updated || prev;
        });

        // Handle deep link
        const deepTaskId = searchParams.get('taskId');
        if (deepTaskId) {
          const task = data.data.find((t: Task) => t.id === parseInt(deepTaskId));
          if (task) {
            setSelectedTask(task);
            setIsDetailModalOpen(true);
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('taskId');
            setSearchParams(newParams, { replace: true });
          }
        }
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const fetchFaculty = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/faculty.php`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        setFacultyList(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch faculty:', error);
    }
  };

  const fetchExtensionRequests = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/extensions.php?role=HOD`, {
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
    fetchFaculty();
    fetchExtensionRequests();
    fetchGroups();

    // Polling for real-time updates every 5 seconds
    const interval = setInterval(() => {
      fetchTasks(true);
      fetchExtensionRequests();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleReviewExtension = async (requestId: number, status: 'Approved' | 'Rejected', remarks: string = '') => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/extensions.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          request_id: requestId,
          status,
          hod_remarks: remarks
        })
      });

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: `Request ${status}`,
          timer: 1500,
          showConfirmButton: false
        });
        fetchExtensionRequests();
        fetchTasks();
      }
    } catch (error) {
      Swal.fire('Error', 'Failed to process request', 'error');
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
          fetchTasks();
          setIsDetailModalOpen(false);
        }
      } catch (error) {
        Swal.fire('Error', 'Failed to update task status', 'error');
      }
    }
  };

  useEffect(() => {
    const deepTaskId = searchParams.get('taskId');
    if (deepTaskId && tasks.length > 0) {
      const task = tasks.find(t => t.id === parseInt(deepTaskId));
      if (task) {
        setSelectedTask(task);
        setIsDetailModalOpen(true);
      }
    }
  }, [searchParams, tasks]);

  const handleCreateOrUpdate = async (e: React.FormEvent, isDraft = false) => {
    e?.preventDefault();
    setIsSubmitting(true);

    const submitData = new FormData();
    submitData.append('is_draft', isDraft.toString());
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'attachments') {
        (value as File[]).forEach(file => submitData.append('attachments[]', file));
      } else if (key === 'assigned_to_ids') {
        (value as string[]).forEach(id => submitData.append('assigned_to_ids[]', id));
      } else if (value !== null) {
        submitData.append(key, value.toString());
      }
    });

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/tasks.php`, {
        method: 'POST',
        body: submitData,
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        Swal.fire('Success', data.message, 'success');
        setIsModalOpen(false);
        resetForm();
        fetchTasks();
        // Trigger immediate notification refresh
        window.dispatchEvent(new CustomEvent('refresh-notifications'));
      } else {
        Swal.fire('Error', data.message, 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Failed to save task', 'error');
    } finally {
      setIsSubmitting(false);
    }
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
        fetchTasks();
        window.dispatchEvent(new CustomEvent('refresh-notifications'));
        if (selectedTask && selectedTask.id === taskId) {
          if (userId) {
            // Update the specific assignment in local state if needed
            const updatedAssignments = selectedTask.assignments.map(a => 
              a.user_id === userId ? { ...a, ...updates } : a
            );
            setSelectedTask({ ...selectedTask, assignments: updatedAssignments });
          } else {
            setSelectedTask({ ...selectedTask, ...updates });
          }
        }
      } else {
        Swal.fire('Error', data.message || 'Update failed', 'error');
      }
    } catch (error) {
      console.error("Update error:", error);
      Swal.fire('Error', 'Network error or server crash', 'error');
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
        confirmButtonText: 'Yes, Approve without marks'
      });
      if (!result.isConfirmed) return;
    }
    updateReviewStatus(taskId, { status: 'Approved' }, userId);
  };

  const handleBulkReviewSubmit = async () => {
    if (!selectedTask || selectedAssignmentIds.length === 0) return;
    
    if (bulkReviewData.status === 'Approved' && bulkReviewData.points === 0) {
      const result = await Swal.fire({
        title: 'No Marks Assigned',
        text: 'You have not given any points yet. Do you want to continue without giving marks?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#10B981',
        cancelButtonColor: '#64748B',
        confirmButtonText: 'Yes, Approve without marks'
      });
      if (!result.isConfirmed) return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/tasks.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          id: selectedTask.id, 
          ...bulkReviewData, 
          user_ids: selectedAssignmentIds 
        })
      });
      const data = await response.json();
      if (data.status === 'success') {
        fetchTasks();
        window.dispatchEvent(new CustomEvent('refresh-notifications'));
        setSelectedAssignmentIds([]);
        setBulkReviewData({ status: 'Approved', points: 0, bonus_points: 0, remarks: '' });
        Swal.fire('Success', 'Bulk review completed', 'success');
        if (selectedTask) {
           const updatedAssignments = selectedTask.assignments.map(a => 
             selectedAssignmentIds.includes(a.user_id) ? { ...a, ...bulkReviewData } : a
           );
           setSelectedTask({ ...selectedTask, assignments: updatedAssignments });
        }
      } else {
        Swal.fire('Error', data.message || 'Update failed', 'error');
      }
    } catch (error) {
      console.error("Update error:", error);
      Swal.fire('Error', 'Network error or server crash', 'error');
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
        const refreshResponse = await fetch(`${import.meta.env.VITE_API_URL}/hod/tasks.php`, { credentials: 'include' });
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

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Delete Task?',
      text: "This cannot be undone.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      confirmButtonText: 'Yes, Delete'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/tasks.php?id=${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        const data = await response.json();
        if (data.status === 'success') {
          Swal.fire('Deleted', 'Task has been removed.', 'success');
          fetchTasks();
          // Trigger immediate notification refresh
          window.dispatchEvent(new CustomEvent('refresh-notifications'));
        }
      } catch (error) {
        Swal.fire('Error', 'Deletion failed', 'error');
      }
    }
  };

  const handlePreview = (file: any) => {
    const url = `${import.meta.env.VITE_API_URL}/${file.file_path}`;
    const ext = file.file_name.split('.').pop().toLowerCase();
    setPreviewFile({ url, name: file.file_name, type: ext });
    setIsPreviewOpen(true);
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
          customClass: { popup: 'rounded-[2rem]' }
        });
        // Optionally refresh task to see updated history counts
        fetchTasks(true);
      } else {
        Swal.fire('Notice', data.message, 'info');
      }
    } catch (error) {
      Swal.fire('Error', 'Failed to send reminder', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      id: null,
      title: '',
      description: '',
      deadline: '',
      priority: 'Medium',
      task_type: 'Other',
      category: 'General',
      assignment_mode: 'individual',
      assigned_to_ids: [],
      task_link: '',
      attachments: []
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Draft': return { color: 'text-slate-500', bg: 'bg-slate-500', icon: Clock };
      case 'Assigned': return { color: 'text-blue-500', bg: 'bg-blue-500', label: 'Pending' };
      case 'Broadcasted': return { color: 'text-indigo-500', bg: 'bg-indigo-500', label: 'Broadcast' };
      case 'Accepted': return { color: 'text-indigo-500', bg: 'bg-indigo-500', label: 'Accepted' };
      case 'In Progress': return { color: 'text-amber-500', bg: 'bg-amber-500', label: 'Working' };
      case 'Submitted': return { color: 'text-purple-500', bg: 'bg-purple-500', label: 'Review' };
      case 'Approved':
      case 'Completed': return { color: 'text-emerald-500', bg: 'bg-emerald-500', label: 'Done' };
      case 'Rejected': return { color: 'text-rose-500', bg: 'bg-rose-500', label: 'Rejected' };
      case 'Rework Required': return { color: 'text-orange-500', bg: 'bg-orange-500', label: 'Rework' };
      default: return { color: 'text-slate-400', bg: 'bg-slate-400', label: status };
    }
  };

  const getFlagConfig = (color: string | null) => {
    switch (color) {
      case 'Red': return { bg: 'bg-rose-500', text: 'text-white', label: 'Critical' };
      case 'Orange': return { bg: 'bg-orange-500', text: 'text-white', label: 'Delayed' };
      case 'Yellow': return { bg: 'bg-amber-400', text: 'text-black', label: 'Attention' };
      case 'Green': return { bg: 'bg-emerald-500', text: 'text-white', label: 'Optimized' };
      default: return null;
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assigned_to_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterStartDate) {
      const start = new Date(filterStartDate);
      start.setHours(0, 0, 0, 0);
      if (new Date(t.created_at) < start) return false;
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      if (new Date(t.created_at) > end) return false;
    }

    switch (activeTab) {
      case 'Assigned': return t.assignment_mode === 'individual';
      case 'Group': return t.assignment_mode === 'group';
      case 'Broadcasted': return t.status === 'Broadcasted';
      case 'Review Pending': 
        return ['Submitted', 'Under Review'].includes(t.status) || 
               t.assignments.some(a => ['Submitted', 'Under Review'].includes(a.status));
      case 'Active': 
        return ['Assigned', 'Accepted', 'In Progress', 'Rework Required'].includes(t.status) ||
               t.assignments.some(a => ['Accepted', 'In Progress', 'Rework Required'].includes(a.status));
      case 'Completed': 
        return ['Completed', 'Approved'].includes(t.status);
      case 'Drafts':
        return t.status === 'Draft';
      case 'All':
      default: 
        return !['Completed', 'Approved'].includes(t.status);
    }
  });

  const filterCount = (tab: typeof activeTab) => {
    return tasks.filter(t => {
      if (filterStartDate) {
        const start = new Date(filterStartDate);
        start.setHours(0, 0, 0, 0);
        if (new Date(t.created_at) < start) return false;
      }
      if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(t.created_at) > end) return false;
      }
      switch (tab) {
        case 'Assigned': return t.assignment_mode === 'individual';
        case 'Group': return t.assignment_mode === 'group';
        case 'Broadcasted': return t.status === 'Broadcasted';
        case 'Review Pending': 
          return ['Submitted', 'Under Review'].includes(t.status) || 
                 t.assignments.some(a => ['Submitted', 'Under Review'].includes(a.status));
        case 'Active': 
          return ['Assigned', 'Accepted', 'In Progress', 'Rework Required'].includes(t.status) ||
                 t.assignments.some(a => ['Accepted', 'In Progress', 'Rework Required'].includes(a.status));
        case 'Completed': 
          return ['Completed', 'Approved'].includes(t.status);
        case 'Drafts': return t.status === 'Draft';
        case 'Extensions': return false; // Handled separately
        case 'All':
        default: return !['Completed', 'Approved'].includes(t.status);
      }
    }).length;
  };

  const tabs: {id: typeof activeTab, label: string, count: number}[] = [
    { id: 'All', label: 'All Tasks', count: filterCount('All') },
    { id: 'Assigned', label: 'Assigned', count: filterCount('Assigned') },
    { id: 'Group', label: 'Group', count: filterCount('Group') },
    { id: 'Broadcasted', label: 'Broadcasted', count: filterCount('Broadcasted') },
    { id: 'Active', label: 'Active', count: filterCount('Active') },
    { id: 'Review Pending', label: 'Review Pending', count: filterCount('Review Pending') },
    { id: 'Extensions', label: 'Extensions', count: extensionRequests.filter(r => {
      if (r.status !== 'Pending') return false;
      if (filterStartDate) {
        const start = new Date(filterStartDate);
        start.setHours(0, 0, 0, 0);
        if (new Date(r.requested_at) < start) return false;
      }
      if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(r.requested_at) > end) return false;
      }
      return true;
    }).length },
    { id: 'Completed', label: 'Completed', count: filterCount('Completed') },
    { id: 'Drafts', label: 'Drafts', count: filterCount('Drafts') },
  ];

  return (
    <div className="space-y-8 pb-20">
      <SEO title="Task Management" description="Create, monitor, and review departmental tasks." />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#1E184B] tracking-tight">Mission Control</h1>
          <p className="text-[#1E184B]/60 mt-1 font-bold flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#7C3AED]" />
            Orchestrate departmental workflows and projects.
          </p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-3 px-8 py-4 bg-[#7C3AED] text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:bg-[#6D28D9] transition-all shadow-xl shadow-[#7C3AED]/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Assign New Task
        </button>
      </div>
      {/* Extension Requests Banner (Only show when NOT on Extensions tab) */}
      {activeTab !== 'Extensions' && extensionRequests.filter(r => r.status === 'Pending').length > 0 && (
        <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2 mb-4 px-2">
            <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
            <h3 className="text-xs font-black text-[#1E184B] uppercase tracking-[0.2em]">{`Immediate Attention: Extension Requests`}</h3>
            <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded-lg text-[9px] font-black">{extensionRequests.filter(r => r.status === 'Pending').length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {extensionRequests.filter(r => r.status === 'Pending').slice(0, 3).map((req) => (
              <div key={req.id} className="bg-white p-6 rounded-[2.5rem] border border-rose-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                <div className="relative z-10 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">{req.faculty_name}</p>
                      <h4 className="text-sm font-black text-[#1E184B] truncate">{req.task_title}</h4>
                    </div>
                    <Clock className="w-5 h-5 text-rose-200" />
                  </div>
                  
                  <div className="flex items-center gap-4 py-3 border-y border-slate-50">
                    <div className="flex-1 text-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Old</p>
                      <p className="text-[10px] font-bold text-slate-400 line-through">{formatDate(req.current_deadline)}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-rose-500" />
                    <div className="flex-1 text-center">
                      <p className="text-[8px] font-black text-rose-600 uppercase">New</p>
                      <p className="text-[11px] font-black text-[#1E184B]">{formatDate(req.requested_deadline)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleReviewExtension(req.id, 'Approved')}
                      className="py-3 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/10"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => {
                        Swal.fire({
                          title: 'Reject Request',
                          input: 'text',
                          inputLabel: 'Reason for rejection',
                          showCancelButton: true,
                          confirmButtonColor: '#f43f5e'
                        }).then((result) => {
                          if (result.isConfirmed) {
                            handleReviewExtension(req.id, 'Rejected', result.value);
                          }
                        });
                      }}
                      className="py-3 bg-white text-rose-500 border border-rose-100 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-50 transition-all"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                activeTab === tab.id 
                  ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-lg shadow-[#7C3AED]/20" 
                  : "bg-white text-slate-400 border-slate-100 hover:border-[#7C3AED]/20 hover:text-[#7C3AED]"
              )}
            >
              {tab.label}
              <span className={cn(
                "px-2 py-0.5 rounded-lg text-[9px]",
                activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#7C3AED] transition-colors" />
            <input 
              type="text" 
              placeholder={activeTab === 'Extensions' ? "Search requests or faculty..." : "Search tasks, faculty, or IDs..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-[#1E184B] focus:outline-none focus:ring-4 focus:ring-[#7C3AED]/10 focus:border-[#7C3AED] transition-all placeholder:text-slate-300"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-3xl p-1.5 focus-within:border-[#7C3AED] focus-within:ring-4 focus-within:ring-[#7C3AED]/10 transition-all">
            <div className="relative px-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">From</span>
              <input 
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="pl-14 pr-4 py-2.5 bg-transparent text-sm font-bold text-[#1E184B] focus:outline-none cursor-pointer"
              />
            </div>
            <div className="w-px h-6 bg-slate-200"></div>
            <div className="relative px-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">To</span>
              <input 
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-transparent text-sm font-bold text-[#1E184B] focus:outline-none cursor-pointer"
              />
            </div>
            {(filterStartDate || filterEndDate) && (
              <button 
                onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                className="p-2 mr-1 hover:bg-rose-50 text-rose-500 rounded-full transition-colors"
                title="Clear Dates"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      {activeTab === 'Extensions' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {extensionRequests
            .filter(req => {
              if (req.status !== 'Pending') return false;
              
              if (filterStartDate) {
                const start = new Date(filterStartDate);
                start.setHours(0, 0, 0, 0);
                if (new Date(req.requested_at) < start) return false;
              }
              if (filterEndDate) {
                const end = new Date(filterEndDate);
                end.setHours(23, 59, 59, 999);
                if (new Date(req.requested_at) > end) return false;
              }

              return req.task_title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                     req.faculty_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                     req.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
                     req.task_desc.toLowerCase().includes(searchQuery.toLowerCase());
            })
            .map((req) => (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={req.id}
                className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all space-y-6"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                      req.status === 'Pending' ? "bg-amber-100 text-amber-600" :
                      req.status === 'Approved' ? "bg-emerald-100 text-emerald-600" :
                      "bg-rose-100 text-rose-600"
                    )}>
                      {req.status}
                    </span>
                    <h4 className="text-lg font-black text-[#1E184B] mt-3 leading-tight">{req.task_title}</h4>
                    <p className="text-[10px] text-slate-400 font-bold line-clamp-1 max-w-xs">{req.task_desc}</p>
                    <p className="text-xs font-bold text-[#7C3AED] mt-1">{req.faculty_name}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <Clock className="w-5 h-5 text-[#7C3AED]" />
                  </div>
                </div>

                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Request Reason</p>
                  <p className="text-[11px] font-medium text-[#1E184B] leading-relaxed italic">
                    {req.reason ? `"${req.reason}"` : <span className="text-slate-300">No reason provided.</span>}
                  </p>
                </div>

                <div className="flex items-center gap-6 py-4 border-y border-slate-50">
                  <div className="flex-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Current</p>
                    <p className="text-xs font-bold text-slate-400 line-through">{formatDate(req.current_deadline)}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#7C3AED]" />
                  <div className="flex-1 text-right">
                    <p className="text-[8px] font-black text-[#7C3AED] uppercase mb-1">Requested</p>
                    <p className="text-sm font-black text-[#1E184B]">{formatDate(req.requested_deadline)}</p>
                  </div>
                </div>

                {req.status === 'Pending' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleReviewExtension(req.id, 'Approved')}
                      className="py-4 bg-[#7C3AED] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#6D28D9] transition-all shadow-lg shadow-[#7C3AED]/20"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => {
                        Swal.fire({
                          title: 'Reject Request',
                          input: 'text',
                          inputLabel: 'Reason for rejection',
                          showCancelButton: true,
                          confirmButtonColor: '#f43f5e'
                        }).then((result) => {
                          if (result.isConfirmed) {
                            handleReviewExtension(req.id, 'Rejected', result.value);
                          }
                        });
                      }}
                      className="py-4 bg-white text-rose-500 border border-rose-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all"
                    >
                      Reject
                    </button>
                  </div>
                ) : req.hod_remarks && (
                  <div className="p-4 bg-slate-50/30 rounded-2xl border border-slate-100/30">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Review Remarks</p>
                    <p className="text-[11px] font-medium text-slate-500 leading-relaxed italic">"{req.hod_remarks}"</p>
                  </div>
                )}
              </motion.div>
            ))}
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-72 bg-white rounded-[2.5rem] animate-pulse border border-slate-100" />)}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-[3rem] border border-dashed border-[#7C3AED]/20 p-24 text-center">
          <div className="w-20 h-20 bg-[#7C3AED]/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-[#7C3AED]/20" />
          </div>
          <h3 className="text-2xl font-black text-[#1E184B]/40 uppercase tracking-widest">No matching missions</h3>
          <p className="text-slate-400 font-bold mt-2">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredTasks.map((task, idx) => {
              const config = getStatusConfig(task.status);
              const flag = getFlagConfig(task.flag_color);
              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={task.id}
                  className="bg-white rounded-[2.5rem] border border-slate-100 p-7 shadow-sm hover:shadow-2xl hover:shadow-[#7C3AED]/10 transition-all group relative overflow-hidden"
                >
                  {flag && (
                    <div className={cn("absolute top-0 right-0 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-bl-2xl flex items-center gap-1", flag.bg, flag.text)}>
                      <Flag className="w-3 h-3 fill-current" />
                      {flag.label}
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-5">
                    <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border", config.bg.replace('bg-', 'text-'), config.bg.replace('bg-', 'bg-').replace('500', '50'))}>
                      {task.status}
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => { setSelectedTask(task); setIsDetailModalOpen(true); }}
                        className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-[#7C3AED] hover:text-white transition-all shadow-sm"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {(task.status !== 'Completed' && task.status !== 'Approved') && (
                        <>
                          <button 
                            onClick={() => { 
                              setFormData({
                                id: task.id,
                                title: task.title,
                                description: task.description || '',
                                deadline: task.deadline ? task.deadline.replace(' ', 'T').substring(0, 16) : '',
                                priority: task.priority,
                                task_type: task.task_type,
                                category: task.category || 'General',
                                assignment_mode: task.assignment_mode || (task.assigned_to_id ? 'individual' : 'broadcast'),
                                assigned_to_ids: task.assignments ? task.assignments.map(a => a.user_id.toString()) : (task.assigned_to_id ? [task.assigned_to_id.toString()] : []),
                                task_link: task.task_link || '',
                                attachments: []
                              }); 
                              setIsModalOpen(true); 
                            }}
                            className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(task.id)}
                            className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-[#1E184B] mb-2 group-hover:text-[#7C3AED] transition-colors truncate">{task.title}</h3>
                  <p className="text-slate-400 text-sm font-medium mb-6 line-clamp-2 leading-relaxed">
                    {task.description || "No additional context provided."}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Deadline</span>
                      </div>
                      <p className="text-xs font-black text-[#1E184B]">{formatDate(task.deadline)}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Award className="w-3 h-3 text-[#7C3AED]" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Score</span>
                      </div>
                      <p className="text-xs font-black text-[#1E184B]">{Number(task.aggregated_points ?? task.points) + Number(task.aggregated_bonus_points ?? task.bonus_points)} pts</p>
                    </div>
                  </div>

                  {(task.assignment_mode === 'group' || task.assignment_mode === 'broadcast' || task.status === 'Broadcasted' || (!task.assigned_to_id && task.assignments && task.assignments.length > 0)) && (() => {
                    const totalAccepted = task.assignments?.length || 0;
                    const submittedCount = task.assignments?.filter(a => ['Submitted', 'Under Review', 'Approved', 'Completed'].includes(a.status)).length || 0;
                    const progressPercentage = totalAccepted > 0 ? Math.round((submittedCount / totalAccepted) * 100) : 0;
                    
                    return (
                      <div className="mb-6 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <span>Progress</span>
                          <span className="text-[#7C3AED]">{submittedCount} / {totalAccepted} Submitted</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[#7C3AED] to-[#38bdf8] rounded-full transition-all duration-500 relative" 
                            style={{ width: `${progressPercentage}%` }}
                          >
                            <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-[#7C3AED]/10 rounded-full flex items-center justify-center overflow-hidden border border-[#7C3AED]/20">
                        {task.assigned_to_pic ? (
                          <img 
                            src={`${import.meta.env.VITE_API_URL}/${task.assigned_to_pic}`} 
                            alt={task.assigned_to_name || ''} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          task.assignment_mode === 'group' ? <Users className="w-4 h-4 text-[#7C3AED]" /> :
                          task.assignment_mode === 'broadcast' ? <Send className="w-4 h-4 text-[#7C3AED]" /> :
                          <User className="w-4 h-4 text-[#7C3AED]" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assigned To</span>
                        <span className="text-[11px] font-black text-[#1E184B] truncate max-w-[120px]">
                          {task.assignment_mode === 'group' ? "Group Task" : 
                           task.assignment_mode === 'broadcast' ? "Broadcasted" : 
                           task.assigned_to_name || "Unassigned"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Priority</span>
                      <span className={cn(
                        "text-[10px] font-black uppercase",
                        task.priority === 'High' || task.priority === 'Critical' ? 'text-rose-500' : 
                        task.priority === 'Medium' ? 'text-amber-500' : 'text-emerald-500'
                      )}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Task Creation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[#1E184B]/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[2.5rem] w-full max-w-xl lg:max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-[#1E184B]">{formData.id ? 'Refine Mission' : 'Deploy New Mission'}</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Task Assignment</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
                    <X className="w-5 h-5 text-slate-300" />
                  </button>
                </div>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar">
                {systemSettings.pause_new_tasks === 'true' && (
                  <div className="mb-6 bg-rose-50 text-rose-600 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-start gap-3 border border-rose-100">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <p>Task Creation is closed by Admin, You can save it in Draft and publish later.</p>
                  </div>
                )}
                <form onSubmit={(e) => handleCreateOrUpdate(e)} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-[#1E184B] uppercase tracking-widest ml-1">Mission Title</label>
                    <input 
                      type="text" required
                      placeholder="e.g., End Semester Examination Coordination"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-[#1E184B] focus:ring-4 focus:ring-[#7C3AED]/5 outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-[#1E184B] uppercase tracking-widest ml-1">Deadline</label>
                      <input 
                        type="datetime-local" required
                        value={formData.deadline}
                        onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-[#1E184B] focus:ring-4 focus:ring-[#7C3AED]/5 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5 relative">
                      <label className="text-[9px] font-black text-[#1E184B] uppercase tracking-widest ml-1">Priority</label>
                      <div className="relative group">
                        <button
                          type="button"
                          onClick={() => setOpenSelect(openSelect === 'priority' ? null : 'priority')}
                          className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-[#1E184B] flex items-center justify-between hover:border-[#7C3AED]/20 transition-all"
                        >
                          <span className={cn(
                            formData.priority === 'Critical' ? 'text-rose-500' :
                            formData.priority === 'High' ? 'text-orange-500' :
                            formData.priority === 'Medium' ? 'text-amber-500' : 'text-emerald-500'
                          )}>{formData.priority}</span>
                          <Filter className="w-3.5 h-3.5 text-slate-300" />
                        </button>
                        
                        <AnimatePresence>
                          {openSelect === 'priority' && (
                            <>
                              <div className="fixed inset-0 z-[310]" onClick={() => setOpenSelect(null)} />
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl z-[320] overflow-hidden p-2"
                              >
                                {['Low', 'Medium', 'High', 'Critical'].map((p) => (
                                  <button
                                    key={p} type="button"
                                    onClick={() => { setFormData({...formData, priority: p as any}); setOpenSelect(null); }}
                                    className={cn(
                                      "w-full px-4 py-3 rounded-xl text-left text-[10px] font-black uppercase tracking-widest transition-all",
                                      formData.priority === p ? "bg-[#7C3AED] text-white" : "text-slate-400 hover:bg-slate-50 hover:text-[#7C3AED]"
                                    )}
                                  >
                                    {p}
                                  </button>
                                ))}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 relative">
                      <label className="text-[9px] font-black text-[#1E184B] uppercase tracking-widest ml-1">Mission Type</label>
                      <input 
                        type="text"
                        placeholder="e.g., Documentation"
                        value={formData.task_type}
                        onChange={(e) => setFormData({...formData, task_type: e.target.value})}
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-[#1E184B] focus:ring-4 focus:ring-[#7C3AED]/5 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5 relative">
                      <label className="text-[9px] font-black text-[#1E184B] uppercase tracking-widest ml-1">Category</label>
                      <div className="relative group">
                        <button
                          type="button"
                          onClick={() => setOpenSelect(openSelect === 'category' ? null : 'category')}
                          className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-[#1E184B] flex items-center justify-between hover:border-[#7C3AED]/20 transition-all"
                        >
                          <span className="text-[#1E184B]">{formData.category}</span>
                          <Tag className="w-3.5 h-3.5 text-slate-300" />
                        </button>
                        
                        <AnimatePresence>
                          {openSelect === 'category' && (
                            <>
                              <div className="fixed inset-0 z-[310]" onClick={() => setOpenSelect(null)} />
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl z-[320] overflow-hidden p-2"
                              >
                                {['Academic', 'Administrative', 'Research', 'Documentation', 'Examination', 'Event', 'Other'].map((c) => (
                                  <button
                                    key={c} type="button"
                                    onClick={() => { setFormData({...formData, category: c}); setOpenSelect(null); }}
                                    className={cn(
                                      "w-full px-4 py-3 rounded-xl text-left text-[10px] font-black uppercase tracking-widest transition-all",
                                      formData.category === c ? "bg-[#7C3AED] text-white" : "text-slate-400 hover:bg-slate-50 hover:text-[#7C3AED]"
                                    )}
                                  >
                                    {c}
                                  </button>
                                ))}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-[#1E184B] uppercase tracking-widest ml-1">Mission Intelligence (Description)</label>
                    <textarea 
                      placeholder="Detailed instructions for the faculty..."
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-[#1E184B] focus:ring-4 focus:ring-[#7C3AED]/5 outline-none transition-all h-24 resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-[#7C3AED] uppercase tracking-widest ml-1">Reference URL / Task Link (Optional)</label>
                    <input 
                      type="url"
                      placeholder="e.g., https://academic-portal.com/instructions"
                      value={formData.task_link}
                      onChange={(e) => setFormData({...formData, task_link: e.target.value})}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-[#1E184B] focus:ring-4 focus:ring-[#7C3AED]/5 outline-none transition-all"
                    />
                  </div>
                  </div>

                  <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-[#1E184B] uppercase tracking-widest ml-1">Assignment Mode</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        type="button"
                        onClick={() => { setFormData({...formData, assignment_mode: 'individual', assigned_to_ids: []}); setOpenSelect(null); }}
                        className={cn(
                          "py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                          formData.assignment_mode === 'individual' ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-lg shadow-[#7C3AED]/20" : "bg-slate-50 text-slate-400 border-slate-100"
                        )}
                      >Individual</button>
                      <button 
                        type="button"
                        onClick={() => { setFormData({...formData, assignment_mode: 'group', assigned_to_ids: []}); setOpenSelect(null); }}
                        className={cn(
                          "py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                          formData.assignment_mode === 'group' ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-lg shadow-[#7C3AED]/20" : "bg-slate-50 text-slate-400 border-slate-100"
                        )}
                      >Group</button>
                      <button 
                        type="button"
                        onClick={() => { setFormData({...formData, assignment_mode: 'broadcast', assigned_to_ids: []}); setOpenSelect(null); }}
                        className={cn(
                          "py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                          formData.assignment_mode === 'broadcast' ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-lg shadow-[#7C3AED]/20" : "bg-slate-50 text-slate-400 border-slate-100"
                        )}
                      >Broadcast</button>
                    </div>
                  </div>

                  {formData.assignment_mode === 'group' && (
                    <div className="space-y-1.5 relative">
                      <label className="text-[9px] font-black text-[#1E184B] uppercase tracking-widest ml-1">Select Group</label>
                      <div className="relative group">
                        <button
                          type="button"
                          onClick={() => setOpenSelect(openSelect === 'group' ? null : 'group')}
                          className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-[#1E184B] flex items-center justify-between hover:border-[#7C3AED]/20 transition-all"
                        >
                          <span className={formData.assigned_to_ids.length > 0 ? "text-[#1E184B]" : "text-slate-300"}>
                            {formData.assigned_to_ids.length > 0 
                              ? `${formData.assigned_to_ids.length} member${formData.assigned_to_ids.length > 1 ? 's' : ''} in selected group` 
                              : "Choose a group..."}
                          </span>
                          <Users className="w-3.5 h-3.5 text-slate-300" />
                        </button>
                        
                        <AnimatePresence>
                          {openSelect === 'group' && (
                            <>
                              <div className="fixed inset-0 z-[310]" onClick={() => setOpenSelect(null)} />
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl z-[320] overflow-hidden flex flex-col max-h-[350px]"
                              >
                                <div className="p-1 overflow-y-auto custom-scrollbar">
                                  {groups.length === 0 ? (
                                    <div className="py-8 text-center">
                                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No groups found</p>
                                    </div>
                                  ) : (
                                    groups.map((g) => {
                                      // Check if all members of this group are currently selected
                                      const isSelected = g.members.length > 0 && g.members.every(m => formData.assigned_to_ids.includes(m.id.toString())) && g.members.length === formData.assigned_to_ids.length;
                                      return (
                                        <button
                                          key={g.id} type="button"
                                          onClick={() => { 
                                            setFormData(prev => ({
                                              ...prev, 
                                              assigned_to_ids: g.members.map(m => m.id.toString())
                                            })); 
                                            setOpenSelect(null);
                                          }}
                                          className={cn(
                                            "w-full px-4 py-3 rounded-xl text-left transition-all",
                                            isSelected ? "bg-[#7C3AED] text-white" : "text-slate-500 hover:bg-slate-50 hover:text-[#7C3AED]"
                                          )}
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-black">{g.name}</span>
                                            <span className={cn(
                                              "text-[9px] font-bold px-2 py-0.5 rounded-lg",
                                              isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
                                            )}>{g.members.length} Members</span>
                                          </div>
                                        </button>
                                      );
                                    })
                                  )}
                                  <a href="/hod/groups" target="_blank" className="w-full mt-2 block text-center px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                    + Manage Groups
                                  </a>
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {formData.assignment_mode === 'individual' && (
                    <div className="space-y-1.5 relative">
                      <label className="text-[9px] font-black text-[#1E184B] uppercase tracking-widest ml-1">Select Faculty</label>
                      <div className="relative group">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenSelect(openSelect === 'faculty' ? null : 'faculty');
                            setFacultySearchQuery('');
                          }}
                          className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-[#1E184B] flex items-center justify-between hover:border-[#7C3AED]/20 transition-all"
                        >
                          <span className={formData.assigned_to_ids.length > 0 ? "text-[#1E184B]" : "text-slate-300"}>
                            {formData.assigned_to_ids.length > 0 
                              ? `${formData.assigned_to_ids.length} member${formData.assigned_to_ids.length > 1 ? 's' : ''} selected` 
                              : "Choose members..."}
                          </span>
                          <User className="w-3.5 h-3.5 text-slate-300" />
                        </button>
                        
                        <AnimatePresence>
                          {openSelect === 'faculty' && (
                            <>
                              <div className="fixed inset-0 z-[310]" onClick={() => setOpenSelect(null)} />
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl z-[320] overflow-hidden flex flex-col max-h-[350px]"
                              >
                                <div className="p-2 border-b border-slate-50">
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                    <input 
                                      type="text" 
                                      autoFocus
                                      placeholder="Search name or email..."
                                      value={facultySearchQuery}
                                      onChange={(e) => setFacultySearchQuery(e.target.value)}
                                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-[10px] font-bold text-[#1E184B] focus:ring-0 outline-none"
                                    />
                                  </div>
                                </div>
                                <div className="p-1 overflow-y-auto custom-scrollbar">
                                  {facultyList.filter(f => 
                                    f.name.toLowerCase().includes(facultySearchQuery.toLowerCase()) || 
                                    f.email.toLowerCase().includes(facultySearchQuery.toLowerCase())
                                  ).length === 0 ? (
                                    <div className="py-8 text-center">
                                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No members found</p>
                                    </div>
                                  ) : (
                                    facultyList.filter(f => 
                                      f.name.toLowerCase().includes(facultySearchQuery.toLowerCase()) || 
                                      f.email.toLowerCase().includes(facultySearchQuery.toLowerCase())
                                    ).map((f) => (
                                      <button
                                        key={f.id} type="button"
                                        onClick={() => { 
                                          const idStr = f.id.toString();
                                          setFormData(prev => ({
                                            ...prev, 
                                            assigned_to_ids: prev.assigned_to_ids.includes(idStr) 
                                              ? prev.assigned_to_ids.filter(id => id !== idStr)
                                              : [...prev.assigned_to_ids, idStr]
                                          })); 
                                        }}
                                        className={cn(
                                          "w-full px-4 py-3 rounded-xl text-left transition-all flex items-center justify-between",
                                          formData.assigned_to_ids.includes(f.id.toString()) ? "bg-[#7C3AED] text-white" : "text-slate-500 hover:bg-slate-50 hover:text-[#7C3AED]"
                                        )}
                                      >
                                        <div className="flex flex-col">
                                          <span className="text-xs font-black">{f.name}</span>
                                          <span className={cn(
                                            "text-[9px] font-bold",
                                            formData.assigned_to_ids.includes(f.id.toString()) ? "text-white/70" : "text-slate-400"
                                          )}>{f.email}</span>
                                        </div>
                                        {formData.assigned_to_ids.includes(f.id.toString()) && (
                                          <CheckCircle2 className="w-4 h-4 text-white" />
                                        )}
                                      </button>

                                    ))
                                  )}
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-[#1E184B] uppercase tracking-widest ml-1">Reference Materials</label>
                    <div className="relative group">
                      <input 
                        type="file" multiple
                        onChange={(e) => {
                          const newFiles = Array.from(e.target.files || []);
                          setFormData(prev => ({...prev, attachments: [...prev.attachments, ...newFiles]}));
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="px-6 py-8 bg-slate-50 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center gap-3 group-hover:border-[#7C3AED]/20 transition-all group-hover:bg-[#7C3AED]/5">
                        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm text-slate-400 group-hover:text-[#7C3AED] transition-all">
                          <Plus className="w-5 h-5" />
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest">Attach Files</p>
                          <p className="text-[9px] font-bold text-slate-400 mt-1">Upload reference documents or assets</p>
                        </div>
                      </div>
                    </div>

                    {formData.attachments.length > 0 && (
                      <div className="grid grid-cols-1 gap-2 mt-4">
                        {formData.attachments.map((file, idx) => (
                          <motion.div 
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            key={`${file.name}-${idx}`} 
                            className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-[#1E184B] truncate max-w-[180px]">{file.name}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{(file.size / 1024).toFixed(1)} KB</span>
                              </div>
                            </div>
                            <button 
                              type="button"
                              onClick={() => setFormData(prev => ({...prev, attachments: prev.attachments.filter((_, i) => i !== idx)}))}
                              className="p-2 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-xl transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                  </div>

                  <div className="lg:col-span-2 flex gap-4 pt-4 border-t border-slate-50 mt-4">
                    <button 
                      type="button"
                      onClick={(e) => handleCreateOrUpdate(e as any, true)}
                      disabled={isSubmitting}
                      className="flex-1 py-4 bg-slate-100 text-slate-500 hover:text-[#7C3AED] hover:bg-slate-200 rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 active:scale-95 border border-slate-200"
                    >
                      {isSubmitting ? 'Saving...' : formData.id ? 'Update Draft' : 'Create Draft'}
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting || (systemSettings.pause_new_tasks === 'true' && (!formData.id || tasks.find(t=>t.id===formData.id)?.status === 'Draft'))}
                      className="flex-[2] py-4 bg-[#7C3AED] text-white rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[#7C3AED]/20 hover:bg-[#6D28D9] transition-all disabled:opacity-50 disabled:bg-slate-300 disabled:shadow-none active:scale-95"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Deploying...
                        </span>
                      ) : (
                        formData.id && tasks.find(t=>t.id===formData.id)?.status !== 'Draft' ? 'Update Mission' : 'Launch Mission'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Task Detail & Review Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedTask && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-[2.5rem] md:rounded-[3.5rem] w-full max-w-7xl h-full md:h-auto md:max-h-[95vh] overflow-hidden flex flex-col md:flex-row shadow-2xl"
            >
              {/* Mobile Tab Switcher */}
              <div className="md:hidden flex p-2 bg-slate-50 border-b border-slate-100 sticky top-0 z-[130]">
                <button 
                  onClick={() => setMobileDetailTab('mission')}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2",
                    mobileDetailTab === 'mission' ? "bg-white text-[#7C3AED] shadow-sm" : "text-slate-400"
                  )}
                >
                  <FileText className="w-4 h-4" />
                  Mission Details
                </button>
                <button 
                  onClick={() => setMobileDetailTab('evaluation')}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2",
                    mobileDetailTab === 'evaluation' ? "bg-white text-[#7C3AED] shadow-sm" : "text-slate-400"
                  )}
                >
                  <Trophy className="w-4 h-4" />
                  Evaluation
                </button>
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="ml-auto p-3 text-slate-400 hover:text-rose-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className={cn(
                "flex-1 flex flex-col p-6 md:p-10 overflow-y-auto custom-scrollbar bg-slate-50/50",
                mobileDetailTab === 'mission' ? "flex" : "hidden md:flex"
              )}>
                <div className="flex items-center justify-between mb-8">
                  <div className={cn(
                    "px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border",
                    getStatusConfig(selectedTask.status).bg.replace('bg-', 'bg-').replace('500', '50'),
                    getStatusConfig(selectedTask.status).color
                  )}>
                    {selectedTask.status}
                  </div>
                  {selectedTask.status !== 'Completed' && (
                    <button 
                      onClick={() => handleManualComplete(selectedTask.id)}
                      className="px-4 py-1.5 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Mark Mission Complete
                    </button>
                  )}
                  <div className="hidden md:flex items-center gap-6 text-slate-400">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
                      <Calendar className="w-4 h-4" />
                      Created: {formatDate(selectedTask.created_at)}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-rose-500">
                      <Clock className="w-4 h-4" />
                      Deadline: {formatDate(selectedTask.deadline)}
                    </div>
                  </div>
                </div>

                <h2 className="text-3xl font-black text-[#1E184B] leading-tight mb-4">{selectedTask.title}</h2>
                <p className="text-slate-500 font-bold text-sm leading-relaxed mb-10 whitespace-pre-wrap">
                  {selectedTask.description || "No description provided."}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm col-span-1 sm:col-span-2">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-500" />
                        Assignment Report
                      </div>
                      <div className="flex items-center gap-4">
                        {selectedTask.assignments.some(a => ['Submitted', 'Under Review', 'Approved'].includes(a.status)) && (
                          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-2 py-1 rounded-lg">
                            <input 
                              type="checkbox"
                              checked={
                                selectedTask.assignments.filter(a => ['Submitted', 'Under Review', 'Approved'].includes(a.status)).length > 0 &&
                                selectedTask.assignments.filter(a => ['Submitted', 'Under Review', 'Approved'].includes(a.status)).every(a => selectedAssignmentIds.includes(a.user_id))
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAssignmentIds(selectedTask.assignments.filter(a => ['Submitted', 'Under Review', 'Approved'].includes(a.status)).map(a => a.user_id));
                                } else {
                                  setSelectedAssignmentIds([]);
                                }
                              }}
                              className="w-3 h-3 rounded text-[#7C3AED] border-slate-300 focus:ring-[#7C3AED]"
                            />
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Select All</span>
                          </label>
                        )}
                        <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg text-[9px]">{selectedTask.assignments.length} Accepted</span>
                      </div>
                    </h3>
                    
                    <div className="space-y-3">
                      {selectedTask.assignments.length > 0 ? (
                        selectedTask.assignments.map(assign => (
                          <div key={assign.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-2xl gap-4">
                            <div className="flex items-center gap-3">
                              {['Submitted', 'Under Review', 'Approved'].includes(assign.status) && (
                                <input 
                                  type="checkbox"
                                  checked={selectedAssignmentIds.includes(assign.user_id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedAssignmentIds(prev => [...prev, assign.user_id]);
                                    } else {
                                      setSelectedAssignmentIds(prev => prev.filter(id => id !== assign.user_id));
                                    }
                                  }}
                                  className="w-4 h-4 rounded text-[#7C3AED] border-slate-300 focus:ring-[#7C3AED] shrink-0"
                                />
                              )}
                              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-sm border border-slate-100 overflow-hidden">
                                {assign.faculty_pic ? (
                                  <img 
                                    src={`${import.meta.env.VITE_API_URL}/${assign.faculty_pic}`} 
                                    alt={assign.faculty_name} 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  assign.faculty_name.charAt(0)
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-black text-[#1E184B]">{assign.faculty_name}</p>
                                <p className="text-[9px] font-bold text-slate-400 truncate max-w-[150px]">{assign.faculty_email}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                              <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#7C3AED]" style={{ width: `${assign.progress}%` }} />
                                  </div>
                                  <span className="text-[10px] font-black text-[#1E184B]">{assign.progress}%</span>
                                </div>
                              </div>

                                <div className="flex flex-col min-w-[120px]">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Protocol Metrics</span>
                                  <div className="flex flex-col gap-1.5 mt-1">
                                    <span className={cn(
                                      "text-[10px] font-black uppercase",
                                      getStatusConfig(assign.status).color
                                    )}>{assign.status}</span>
                                    
                                    {assign.submitted_at && (
                                      <div className="flex items-center gap-1 text-slate-500">
                                        <Clock className="w-3 h-3" />
                                        <span className="text-[9px] font-bold">
                                          {formatDate(assign.submitted_at)}
                                        </span>
                                      </div>
                                    )}

                                    {assign.is_delayed === 1 && assign.submitted_at && (
                                      <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest w-fit border border-rose-100">
                                        Delayed by {Math.max(1, Math.ceil((new Date(assign.submitted_at).getTime() - new Date(selectedTask.deadline).getTime()) / (1000 * 3600 * 24)))} Days
                                      </span>
                                    )}

                                    {(assign.points > 0 || assign.bonus_points > 0) && (
                                      <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest w-fit border border-amber-100">
                                        {assign.points + assign.bonus_points} Merit Points
                                      </span>
                                    )}

                                    {/* Reminder Metrics */}
                                    {(assign.reminder_count > 0 || assign.warning_count > 0) && (
                                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                        {assign.reminder_count > 0 && (
                                          <span className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-indigo-100">
                                            <Bell className="w-2.5 h-2.5" /> {assign.reminder_count} Reminders
                                          </span>
                                        )}
                                        {assign.warning_count > 0 && (
                                          <span className="flex items-center gap-1 bg-rose-50 text-rose-600 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-rose-100">
                                            <AlertTriangle className="w-2.5 h-2.5" /> {assign.warning_count} Warnings
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <button 
                                  onClick={() => {
                                    setSelectedAssignmentId(assign.user_id);
                                    setMobileDetailTab('evaluation');
                                  }}
                                  className="px-4 py-2 bg-white text-[#7C3AED] border border-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#7C3AED] hover:text-white transition-all shadow-sm"
                                >
                                  Review
                                </button>
                              </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs font-black text-slate-400 italic p-4 text-center border-2 border-dashed rounded-2xl">
                          {selectedTask.status === 'Broadcasted' ? "Waiting for faculties to accept this mission." : "No assignments found."}
                        </p>
                      )}
                    </div>
                  </div>

                  {(selectedTask.assigned_to_id) && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        Task Score
                      </h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-black text-[#1E184B]">{Number(selectedTask.aggregated_points ?? selectedTask.points) + Number(selectedTask.aggregated_bonus_points ?? selectedTask.bonus_points)}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Earned Points</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-amber-500">+{Number(selectedTask.aggregated_bonus_points ?? selectedTask.bonus_points)} Bonus</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Incentive</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-8">
                  {/* Reference / Submission Link */}
                  {selectedTask.task_link && (
                    <div>
                      <h3 className="text-xs font-black text-[#1E184B] uppercase tracking-widest mb-4 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-emerald-500" />
                        Reference / Submission Link
                      </h3>
                      <div className="p-5 bg-emerald-50/30 border-2 border-emerald-100/50 rounded-3xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-emerald-100/50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Reference URL</p>
                            <a 
                              href={selectedTask.task_link} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-xs font-bold text-[#7C3AED] hover:underline break-all"
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

                  {/* Instructional Assets */}
                  <div>
                    <h3 className="text-xs font-black text-[#1E184B] uppercase tracking-widest mb-4 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#7C3AED]" />
                      HOD Reference Files
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {selectedTask.task_link && (
                        <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 flex items-center justify-between group hover:border-[#7C3AED]/30 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                              <Layers className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Reference URL</span>
                              <a 
                                href={selectedTask.task_link} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-xs font-black text-[#7C3AED] hover:underline truncate max-w-[250px]"
                              >
                                {selectedTask.task_link}
                              </a>
                            </div>
                          </div>
                          <a 
                            href={selectedTask.task_link} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="px-3.5 py-2.5 bg-white text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white rounded-xl transition-all shadow-sm font-black text-[9px] uppercase tracking-widest"
                          >
                            Visit Link
                          </a>
                        </div>
                      )}

                      {selectedTask.attachments.filter(a => a.entity_type === 'Task').map(att => (
                        <div key={att.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 group">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-[#7C3AED]" />
                            <span className="text-xs font-black text-[#1E184B] truncate max-w-[250px]">{att.file_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handlePreview(att)} className="p-2 bg-slate-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><Eye className="w-4 h-4" /></button>
                            <a href={getDownloadUrl(att.file_path)} download className="p-2 bg-slate-50 text-[#7C3AED] rounded-xl hover:bg-[#7C3AED] hover:text-white transition-all"><Download className="w-4 h-4" /></a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Faculty Evidence */}
                  <div>
                    <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Evidence for {selectedTask.assignments.find(a => a.user_id === selectedAssignmentId)?.faculty_name || "Faculty"}
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 italic">Faculty Submissions</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {(() => {
                        const currentAssign = selectedTask.assignments.find(a => a.user_id === selectedAssignmentId);
                        if (currentAssign?.submission_link) {
                          return (
                            <div className="p-5 bg-emerald-50/30 border-2 border-emerald-100/50 rounded-3xl flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 bg-emerald-100/50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                                  <BookOpen className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Faculty Submission URL</p>
                                  <a 
                                    href={currentAssign.submission_link} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-xs font-bold text-[#7C3AED] hover:underline break-all"
                                  >
                                    {currentAssign.submission_link}
                                  </a>
                                </div>
                              </div>
                              <a 
                                href={currentAssign.submission_link} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all whitespace-nowrap shadow-md shadow-emerald-500/10"
                              >
                                Open Link
                              </a>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {selectedTask.attachments.filter(a => a.entity_type === 'Task_Submission' && a.uploader_id === selectedAssignmentId).map(att => (
                        <div key={att.id} className="flex items-center justify-between p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100 group">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-emerald-600" />
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-[#1E184B] truncate max-w-[250px]">{att.file_name}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(att.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handlePreview(att)} className="p-2 bg-white text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><Eye className="w-4 h-4" /></button>
                            <a href={getDownloadUrl(att.file_path)} download className="p-2 bg-white text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><Download className="w-4 h-4" /></a>
                          </div>
                        </div>
                      ))}
                      {(selectedTask.attachments.filter(a => a.entity_type === 'Task_Submission' && a.uploader_id === selectedAssignmentId).length === 0 &&
                        !selectedTask.assignments.find(a => a.user_id === selectedAssignmentId)?.submission_link) && (
                        <p className="text-[10px] font-bold text-slate-400 italic p-6 border-2 border-dashed rounded-3xl text-center">No evidence or link submitted by this faculty yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Evaluation & Review */}
              <div className={cn(
                "w-full md:w-[420px] bg-white border-l border-slate-100 p-6 md:p-10 flex-col shrink-0 overflow-y-auto custom-scrollbar",
                mobileDetailTab === 'evaluation' ? "flex flex-1 md:flex-none" : "hidden md:flex"
              )}>
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h3 className="text-xl font-black text-[#1E184B]">Evaluation</h3>
                    {selectedAssignmentId && selectedAssignmentIds.length === 0 && (
                      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">
                        {selectedTask.assignments.find(a => a.user_id === selectedAssignmentId)?.faculty_name || 'Faculty'}
                      </p>
                    )}
                  </div>
                  <button onClick={() => setIsDetailModalOpen(false)} className="hidden md:block p-2 hover:bg-slate-50 rounded-xl"><X className="w-6 h-6 text-slate-400" /></button>
                </div>

                <div className="space-y-10 flex-1">
                  {selectedAssignmentIds.length > 0 ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-3xl text-center">
                        <Users className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
                        <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Bulk Review Mode</p>
                        <p className="text-[9px] font-bold text-indigo-600 mt-1 leading-relaxed">
                          {selectedAssignmentIds.length} faculties selected for review.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Action</label>
                          <div className="relative">
                            <button 
                              onClick={() => setIsBulkStatusDropdownOpen(!isBulkStatusDropdownOpen)}
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black text-[#1E184B] p-4 flex justify-between items-center focus:ring-2 focus:ring-indigo-500 hover:border-indigo-200 transition-all"
                            >
                              {bulkReviewData.status === 'Approved' ? 'Approve All' : 'Request Rework All'}
                              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isBulkStatusDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {isBulkStatusDropdownOpen && (
                              <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border-2 border-slate-100 rounded-xl shadow-xl overflow-hidden z-20">
                                <button 
                                  onClick={() => { setBulkReviewData({...bulkReviewData, status: 'Approved'}); setIsBulkStatusDropdownOpen(false); }}
                                  className={`w-full text-left px-4 py-3 text-xs font-black transition-colors ${bulkReviewData.status === 'Approved' ? 'bg-indigo-600 text-white' : 'text-[#1E184B] hover:bg-slate-50'}`}
                                >
                                  Approve All
                                </button>
                                <button 
                                  onClick={() => { setBulkReviewData({...bulkReviewData, status: 'Rework Required'}); setIsBulkStatusDropdownOpen(false); }}
                                  className={`w-full text-left px-4 py-3 text-xs font-black transition-colors ${bulkReviewData.status === 'Rework Required' ? 'bg-indigo-600 text-white' : 'text-[#1E184B] hover:bg-slate-50'}`}
                                >
                                  Request Rework All
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Points</label>
                              <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{bulkReviewData.points}</span>
                            </div>
                            <input 
                              type="range" 
                              min="0"
                              max="50"
                              step="5"
                              value={bulkReviewData.points} 
                              onChange={e => setBulkReviewData({...bulkReviewData, points: parseInt(e.target.value) || 0})}
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Bonus Points</label>
                              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{bulkReviewData.bonus_points}</span>
                            </div>
                            <input 
                              type="range" 
                              min="0"
                              max="5"
                              step="1"
                              value={bulkReviewData.bonus_points} 
                              onChange={e => setBulkReviewData({...bulkReviewData, bonus_points: parseInt(e.target.value) || 0})}
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Remarks (Optional)</label>
                          <textarea 
                            value={bulkReviewData.remarks} 
                            onChange={e => setBulkReviewData({...bulkReviewData, remarks: e.target.value})}
                            placeholder="Add remarks for all selected faculties..."
                            className="w-full bg-slate-50 border-none rounded-xl text-xs font-medium text-[#1E184B] p-4 min-h-[100px] resize-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <button 
                        onClick={handleBulkReviewSubmit}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" /> 
                        Submit Bulk Review
                      </button>
                    </div>
                  ) : selectedAssignmentId ? (
                    (() => {
                      const currentAssign = selectedTask.assignments.find(a => a.user_id === selectedAssignmentId);
                      if (!currentAssign) return null;
                      
                      return (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          {/* Submission Info */}
                          {currentAssign.submitted_at && (
                            <div className="p-5 bg-indigo-50/30 border border-indigo-100 rounded-3xl flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white rounded-2xl shadow-sm">
                                  <Clock className="w-5 h-5 text-indigo-500" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Submitted On</p>
                                  <p className="text-xs font-bold text-indigo-700/70">{formatDate(currentAssign.submitted_at)}</p>
                                </div>
                              </div>
                              {currentAssign.is_delayed === 1 && (
                                <div className="text-right">
                                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Delay Tracked</p>
                                  <p className="text-xs font-bold text-rose-500/70">
                                    {Math.max(1, Math.ceil((new Date(currentAssign.submitted_at).getTime() - new Date(selectedTask.deadline).getTime()) / (1000 * 3600 * 24)))} Days Late
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Remarks from Faculty */}
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Remarks from Faculty</h4>
                            
                            <div className="space-y-3">
                              {currentAssign.public_remarks && (
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative overflow-hidden group">
                                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-indigo-500 text-white text-[7px] font-black uppercase tracking-widest rounded-bl-lg">Public</div>
                                  <p className="text-xs font-medium text-[#1E184B]/80 italic">"{currentAssign.public_remarks}"</p>
                                </div>
                              )}
                              
                              {currentAssign.private_remarks && (
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl relative overflow-hidden group">
                                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-amber-500 text-white text-[7px] font-black uppercase tracking-widest rounded-bl-lg">Private to HOD</div>
                                  <p className="text-xs font-medium text-amber-900/80 italic">"{currentAssign.private_remarks}"</p>
                                </div>
                              )}

                              {(!currentAssign.public_remarks && !currentAssign.private_remarks) && (
                                <p className="text-[10px] font-bold text-slate-400 italic">No remarks provided by faculty.</p>
                              )}
                            </div>
                          </div>

                          {/* Status Actions */}
                          {['Submitted', 'Under Review'].includes(currentAssign.status) ? (
                            <div className="space-y-3">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Review Outcome for {currentAssign.faculty_name}</h4>
                              <button onClick={() => handleApproveContribution(selectedTask.id, currentAssign.user_id, currentAssign.points)} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" /> Approve Contribution</button>
                              <button onClick={() => updateReviewStatus(selectedTask.id, { status: 'Rework Required' }, currentAssign.user_id)} className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" /> Request Rework</button>
                            </div>
                          ) : currentAssign.status === 'Approved' ? (
                            <div className="space-y-4">
                              <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl text-center">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                                <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Contribution Approved</p>
                                <p className="text-[9px] font-bold text-emerald-600 mt-1 leading-relaxed">
                                  {currentAssign.faculty_name}'s work has been finalized.
                                </p>
                              </div>
                              <button 
                                onClick={() => updateReviewStatus(selectedTask.id, { status: 'Rework Required' }, currentAssign.user_id)} 
                                className="w-full py-4 bg-orange-50/50 text-orange-600 border border-orange-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center gap-2"
                              >
                                <RotateCcw className="w-4 h-4" /> 
                                Revoke & Ask for Rework
                              </button>
                            </div>
                          ) : (
                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl text-center">
                              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                              <p className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest">In Progress</p>
                              <p className="text-[9px] font-bold text-slate-400 mt-1 leading-relaxed">
                                {currentAssign.faculty_name} is currently working on this mission ({currentAssign.progress}%).
                              </p>
                            </div>
                          )}

                          {/* Follow-up & Reminders */}
                          {!['Submitted', 'Under Review', 'Approved', 'Completed'].includes(currentAssign.status) && (
                            <div className="space-y-4 pt-8 border-t border-slate-100">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Bell className="w-3 h-3 text-[#7C3AED]" /> Push Mission Reminders
                              </h4>
                              <div className="grid grid-cols-3 gap-2">
                                <button 
                                  onClick={() => handleSendReminder(selectedTask.id, currentAssign.user_id, 'Gentle Reminder')}
                                  className="py-3 px-2 bg-indigo-50 text-indigo-600 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex flex-col items-center gap-1 border border-indigo-100 shadow-sm"
                                >
                                  <Info className="w-4 h-4" /> Gentle
                                </button>
                                <button 
                                  onClick={() => handleSendReminder(selectedTask.id, currentAssign.user_id, 'Reminder')}
                                  className="py-3 px-2 bg-amber-50 text-amber-600 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all flex flex-col items-center gap-1 border border-amber-100 shadow-sm"
                                >
                                  <Bell className="w-4 h-4" /> Reminder
                                </button>
                                <button 
                                  onClick={() => handleSendReminder(selectedTask.id, currentAssign.user_id, 'Warning')}
                                  className="py-3 px-2 bg-rose-50 text-rose-600 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all flex flex-col items-center gap-1 border border-rose-100 shadow-sm"
                                >
                                  <AlertTriangle className="w-4 h-4" /> Warning
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Evaluation Controls */}
                          <div className="space-y-8 pt-8 border-t border-slate-100">
                            <div className="space-y-6">
                              <div>
                                <div className="flex justify-between mb-2">
                                  <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest">Merit Points</label>
                                  <span className="text-[10px] font-black text-[#7C3AED] bg-[#7C3AED]/10 px-2 py-0.5 rounded-lg">{currentAssign.points} / 50</span>
                                </div>
                                <input 
                                  type="range" min="0" max="50" step="5" 
                                  value={currentAssign.points || 0} 
                                  onChange={(e) => {
                                    const pts = parseInt(e.target.value);
                                    const updatedAssignments = selectedTask.assignments.map(a => 
                                      a.user_id === selectedAssignmentId ? { ...a, points: pts, bonus_points: pts === 0 ? 0 : a.bonus_points } : a
                                    );
                                    setSelectedTask({ ...selectedTask, assignments: updatedAssignments });
                                  }}
                                  onMouseUp={() => updateReviewStatus(selectedTask.id, { 
                                    points: currentAssign.points,
                                    bonus_points: currentAssign.points === 0 ? 0 : currentAssign.bonus_points
                                  }, currentAssign.user_id)}
                                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#7C3AED]" 
                                />
                              </div>
                              <div>
                                <div className="flex justify-between mb-2">
                                  <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest">Incentive Bonus</label>
                                  <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">+{currentAssign.bonus_points || 0} pts</span>
                                </div>
                                <input 
                                  type="range" min="0" max="5" step="1" 
                                  disabled={currentAssign.points === 0}
                                  value={currentAssign.bonus_points || 0} 
                                  onChange={(e) => {
                                    const bonus = parseInt(e.target.value);
                                    const updatedAssignments = selectedTask.assignments.map(a => 
                                      a.user_id === selectedAssignmentId ? { ...a, bonus_points: bonus } : a
                                    );
                                    setSelectedTask({ ...selectedTask, assignments: updatedAssignments });
                                  }}
                                  onMouseUp={() => updateReviewStatus(selectedTask.id, { bonus_points: currentAssign.bonus_points }, currentAssign.user_id)}
                                  className={cn(
                                    "w-full h-2 rounded-lg appearance-none cursor-pointer transition-all",
                                    currentAssign.points === 0 ? "bg-slate-50 accent-slate-200 cursor-not-allowed opacity-50" : "bg-slate-100 accent-amber-500"
                                  )}
                                />
                              </div>
                            </div>

                            <div className="space-y-3">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Individual Feedback</label>
                              <textarea 
                                placeholder="Specific feedback for this faculty..."
                                value={currentAssign.remarks || ''}
                                onChange={(e) => {
                                  const rem = e.target.value;
                                  const updatedAssignments = selectedTask.assignments.map(a => 
                                    a.user_id === selectedAssignmentId ? { ...a, remarks: rem } : a
                                  );
                                  setSelectedTask({ ...selectedTask, assignments: updatedAssignments });
                                }}
                                onBlur={(e) => updateReviewStatus(selectedTask.id, { remarks: e.target.value }, currentAssign.user_id)}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium text-[#1E184B] focus:ring-4 focus:ring-[#7C3AED]/5 outline-none transition-all min-h-[100px] resize-none"
                              ></textarea>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-100">
                      <Users className="w-12 h-12 text-slate-200 mb-4" />
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Select a faculty member</p>
                      <p className="text-[10px] font-bold text-slate-300 mt-2">to begin individual evaluation and review.</p>
                    </div>
                  )}

                  {/* Universal Task Flagging (Not specific to assignment) */}
                  <div className="space-y-4 pt-8 border-t border-slate-100 mt-auto">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Overall Task Flag</h4>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { color: null, label: 'None', bg: 'bg-slate-100' },
                        { color: 'Red', label: 'Critical', bg: 'bg-rose-500' },
                        { color: 'Orange', label: 'Delayed', bg: 'bg-orange-500' },
                        { color: 'Yellow', label: 'Check', bg: 'bg-amber-400' },
                        { color: 'Green', label: 'Perfect', bg: 'bg-emerald-500' }
                      ].map((f) => (
                        <button
                          key={f.label}
                          onClick={() => updateReviewStatus(selectedTask.id, { flag_color: f.color })}
                          className={cn(
                            "h-10 rounded-xl transition-all flex flex-col items-center justify-center gap-1 group",
                            selectedTask.flag_color === f.color ? "ring-2 ring-offset-2 ring-[#7C3AED]" : "opacity-40 hover:opacity-100"
                          )}
                          title={f.label}
                        >
                          <div className={cn("w-full h-full rounded-xl", f.bg)} />
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Collaborative Intelligence Chain */}
                  <div className="space-y-6 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-[#1E184B] uppercase tracking-widest flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-[#7C3AED]" />
                        Mission Intelligence Chain
                      </h3>
                      <span className="px-2 py-0.5 bg-[#7C3AED]/10 text-[#7C3AED] text-[8px] font-black rounded-full uppercase">
                        {(selectedTask.comments?.length || 0)} Discussion Entries
                      </span>
                    </div>

                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar bg-slate-50/50 p-4 rounded-[2rem] border border-slate-100">
                      {/* Threaded Comments */}
                      {selectedTask.comments?.map((com: any) => (
                        <div key={`com-${com.id}`} className={cn(
                          "p-4 rounded-2xl space-y-2 border animate-in fade-in slide-in-from-bottom-2",
                          com.user_id === user.id 
                            ? "bg-[#7C3AED] border-[#7C3AED] ml-8 text-white shadow-lg shadow-[#7C3AED]/10" 
                            : "bg-white border-slate-100 mr-8"
                        )}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-5 h-5 rounded-full overflow-hidden border",
                                com.user_id === user.id ? "border-[#7C3AED]/30" : "border-slate-200"
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
                                    com.user_id === user.id ? "bg-white/20 text-white" : "bg-slate-100 text-[#7C3AED]"
                                  )}>
                                    {com.user_name.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <span className={cn("text-[10px] font-black uppercase tracking-widest", com.user_id === user.id ? "text-white/80" : "text-[#7C3AED]")}>
                                {com.user_id === user.id ? "You (HOD)" : com.user_name}
                              </span>
                            </div>
                            <span className={cn("text-[8px] font-bold", com.user_id === user.id ? "text-white/40" : "text-slate-400")}>
                              {formatDate(com.created_at)}
                            </span>
                          </div>
                          <p className={cn("text-xs font-medium leading-relaxed", com.user_id === user.id ? "text-white" : "text-[#1E184B]/80")}>
                            {com.comment}
                          </p>
                        </div>
                      ))}

                      {(!selectedTask.comments?.length) && (
                        <div className="py-10 text-center">
                          <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-20" />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No intelligence shared yet</p>
                        </div>
                      )}
                    </div>

                    {/* Reply Input */}
                    <form onSubmit={handleAddComment} className="relative">
                      <input 
                        type="text"
                        placeholder="Add HOD guidance or feedback..."
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
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-black text-[#1E184B] truncate">{previewFile.name}</h3>
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
                  <div className="flex flex-col items-center justify-center h-full gap-4">
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
    </div>
  );
};

export default HODTasks;
