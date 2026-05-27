import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Clock, 
  User, 
  Calendar,
  Layers,
  Pencil,
  Trash2,
  X,
  Eye,
  Loader2,
  Flag,
  Award,
  Users,
  ArrowRight,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';
import { cn, formatDate, getDownloadUrl } from '@/lib/utils';
import Swal from 'sweetalert2';
import { useNavigate, useSearchParams } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  type TabType = 'All' | 'Individual' | 'Group' | 'Broadcasted' | 'Pending Submissions' | 'Review Pending' | 'Active' | 'Completed' | 'Extensions' | 'Drafts';
  const [activeTab, setActiveTab] = useState<TabType>(
    (searchParams.get('tab') as TabType) || 'All'
  );

  useEffect(() => {
    setSearchParams(prev => {
      if (activeTab === 'All') prev.delete('tab');
      else prev.set('tab', activeTab);
      return prev;
    }, { replace: true });
  }, [activeTab, setSearchParams]);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterModes, setFilterModes] = useState<string[]>([]);
  const [isModeFilterOpen, setIsModeFilterOpen] = useState(false);
  const [extensionRequests, setExtensionRequests] = useState<ExtensionRequest[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openSelect, setOpenSelect] = useState<'priority' | 'faculty' | 'category' | 'group' | null>(null);
  const [facultySearchQuery, setFacultySearchQuery] = useState('');
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
        
        // Handle deep link
        const deepTaskId = searchParams.get('taskId');
        if (deepTaskId) {
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('taskId');
          setSearchParams(newParams, { replace: true });
          navigate(`/hod/tasks/${deepTaskId}`);
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

  // handleManualComplete removed in favor of dedicated view page routing

  useEffect(() => {
    const deepTaskId = searchParams.get('taskId');
    if (deepTaskId && tasks.length > 0) {
      navigate(`/hod/tasks/${deepTaskId}`);
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

    if (filterModes.length > 0) {
      const mode = t.assignment_mode || (t.status === 'Broadcasted' ? 'broadcast' : 'individual');
      if (!filterModes.includes(mode)) return false;
    }

    switch (activeTab) {
      case 'Individual': return t.assignment_mode === 'individual' && !['Completed', 'Approved'].includes(t.status);
      case 'Pending Submissions':
        return t.assignments.some(a => !['Submitted', 'Under Review', 'Approved', 'Completed'].includes(a.status)) && !['Completed', 'Approved', 'Draft'].includes(t.status);
      case 'Group': return t.assignment_mode === 'group' && !['Completed', 'Approved'].includes(t.status);
      case 'Broadcasted': return t.status === 'Broadcasted' && !['Completed', 'Approved'].includes(t.status);
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
      
      if (filterModes.length > 0) {
        const mode = t.assignment_mode || (t.status === 'Broadcasted' ? 'broadcast' : 'individual');
        if (!filterModes.includes(mode)) return false;
      }

      switch (tab) {
        case 'Individual': return t.assignment_mode === 'individual' && !['Completed', 'Approved'].includes(t.status);
        case 'Pending Submissions':
          return t.assignments.some(a => !['Submitted', 'Under Review', 'Approved', 'Completed'].includes(a.status)) && !['Completed', 'Approved', 'Draft'].includes(t.status);
        case 'Group': return t.assignment_mode === 'group' && !['Completed', 'Approved'].includes(t.status);
        case 'Broadcasted': return t.status === 'Broadcasted' && !['Completed', 'Approved'].includes(t.status);
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
    { id: 'Individual', label: 'Individual', count: filterCount('Individual') },
    { id: 'Group', label: 'Group', count: filterCount('Group') },
    { id: 'Broadcasted', label: 'Broadcasted', count: filterCount('Broadcasted') },
    { id: 'Active', label: 'Active', count: filterCount('Active') },
    { id: 'Pending Submissions', label: 'Pending Submissions', count: filterCount('Pending Submissions') },
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
          onClick={() => navigate('/hod/tasks/new')}
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

          <div className="relative">
            <button 
              onClick={() => setIsModeFilterOpen(!isModeFilterOpen)}
              className="px-6 py-4 h-full bg-white border border-slate-100 rounded-3xl text-sm font-bold text-[#1E184B] hover:border-[#7C3AED]/30 transition-all flex items-center gap-2"
            >
              <Layers className="w-4 h-4 text-slate-400" />
              Mode Filter
              {filterModes.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-[#7C3AED] text-white text-[10px] rounded-full">{filterModes.length}</span>
              )}
            </button>
            
            <AnimatePresence>
              {isModeFilterOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 shadow-xl rounded-2xl p-3 z-50 flex flex-col gap-2"
                >
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-1">Filter by Mode</p>
                  {['individual', 'group', 'broadcast'].map(mode => (
                    <label key={mode} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors">
                      <input 
                        type="checkbox"
                        checked={filterModes.includes(mode)}
                        onChange={(e) => {
                          if (e.target.checked) setFilterModes([...filterModes, mode]);
                          else setFilterModes(filterModes.filter(m => m !== mode));
                        }}
                        className="w-4 h-4 rounded text-[#7C3AED] focus:ring-[#7C3AED]/20"
                      />
                      <span className="text-sm font-bold text-[#1E184B] capitalize">{mode}</span>
                    </label>
                  ))}
                  {filterModes.length > 0 && (
                    <button 
                      onClick={() => setFilterModes([])}
                      className="mt-2 text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest text-center py-2 bg-rose-50 rounded-lg transition-colors"
                    >
                      Clear Modes
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
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
              let displayStatus = task.status;
              if (task.assignment_mode === 'individual' && task.assignments && task.assignments.length > 0) {
                displayStatus = task.assignments[0].status;
              }
              const config = getStatusConfig(displayStatus);
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
                      {displayStatus}
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => navigate('/hod/tasks/' + task.id)}
                        className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-[#7C3AED] hover:text-white transition-all shadow-sm"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {(task.status !== 'Completed' && task.status !== 'Approved') && (
                        <>
                          <button 
                            onClick={() => navigate('/hod/tasks/edit/' + task.id)}
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
    </div>
  );
};

export default HODTasks;
