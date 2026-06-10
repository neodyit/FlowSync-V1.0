import React, { useState, useEffect, useMemo } from 'react';
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
  Flag,
  Users,
  Building2,
  Paperclip,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';
import { cn, formatDate, getDownloadUrl } from '@/lib/utils';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

interface Department {
  id: number;
  name: string;
}

interface StaffUser {
  id: number;
  name: string;
  role_id: number;
  role_name: string;
  department_id: number | null;
  department_name: string | null;
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
  remarks: string | null;
}

interface Task {
  id: number;
  title: string;
  description: string;
  deadline: string;
  priority: 'High' | 'Medium' | 'Low' | 'Critical';
  task_type: string;
  category: string;
  status: string;
  assignment_mode: 'individual' | 'group' | 'broadcast';
  assigned_to_id: number | null;
  assigned_to_name: string | null;
  assigned_to_pic: string | null;
  points: number;
  bonus_points: number;
  aggregated_points: number;
  aggregated_bonus_points: number;
  flag_color: string | null;
  task_link: string | null;
  department_name: string | null;
  assignments: Assignment[];
  attachments: Attachment[];
  comments: any[];
}

export default function IATasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'Completed' | 'Drafts'>('All');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department_id: '',
    deadline: '',
    priority: 'Medium',
    task_type: 'Other',
    category: 'General',
    assignment_mode: 'individual',
    assigned_to_ids: [] as string[],
    task_link: ''
  });

  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/ia/tasks.php`, { credentials: 'include' });
      const result = await res.json();
      if (result.status === 'success') {
        setTasks(result.data.tasks);
        setDepartments(result.data.departments);
        setUsers(result.data.users);
      }
    } catch (err) {
      console.error('Failed to fetch task management data:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description || '',
        department_id: task.assignments[0]?.id ? String(task.assignments[0]?.user_id) : '', // select dept fallback
        deadline: task.deadline.slice(0, 16),
        priority: task.priority,
        task_type: task.task_type,
        category: task.category || 'General',
        assignment_mode: task.assignment_mode,
        assigned_to_ids: task.assignments.map(a => String(a.user_id)),
        task_link: task.task_link || ''
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        department_id: departments[0]?.id ? String(departments[0].id) : '',
        deadline: '',
        priority: 'Medium',
        task_type: 'Other',
        category: 'General',
        assignment_mode: 'individual',
        assigned_to_ids: [],
        task_link: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    const result = await MySwal.fire({
      title: 'Delete Task?',
      text: "This operation cannot be reversed.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      confirmButtonText: 'Delete'
    });

    if (result.isConfirmed) {
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        const res = await fetch(`${apiUrl}/ia/tasks.php?id=${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        const data = await res.json();
        if (data.status === 'success') {
          setTasks(tasks.filter(t => t.id !== id));
          MySwal.fire('Deleted', 'Task deleted successfully', 'success');
        }
      } catch (err) {
        MySwal.fire('Error', 'Deletion failed', 'error');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    const payload = {
      ...formData,
      is_draft: isDraft,
      id: editingTask ? editingTask.id : null
    };

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/ia/tasks.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchData();
        setIsModalOpen(false);
        MySwal.fire('Success', isDraft ? 'Draft saved' : 'Task successfully published', 'success');
      } else {
        MySwal.fire('Error', data.message, 'error');
      }
    } catch (err) {
      MySwal.fire('Error', 'Failed to save task', 'error');
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            t.description?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (activeTab === 'Active') {
        return !['Completed', 'Approved', 'Draft'].includes(t.status);
      }
      if (activeTab === 'Completed') {
        return ['Completed', 'Approved'].includes(t.status);
      }
      if (activeTab === 'Drafts') {
        return t.status === 'Draft';
      }
      return t.status !== 'Draft'; // 'All' shows everything except drafts
    });
  }, [tasks, searchQuery, activeTab]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-slate-100 text-slate-600 dark:bg-slate-900/40 dark:text-slate-400';
      case 'Assigned': return 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400';
      case 'Broadcasted': return 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400';
      case 'Accepted': return 'bg-violet-50 text-violet-600 dark:bg-violet-950/20 dark:text-violet-400';
      case 'In Progress': return 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400';
      case 'Submitted': return 'bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400';
      case 'Completed':
      case 'Approved': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400';
      case 'Rework Required': return 'bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400';
      default: return 'bg-slate-50 text-slate-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'text-red-500';
      case 'High': return 'text-orange-500';
      case 'Medium': return 'text-amber-500';
      default: return 'text-blue-500';
    }
  };

  return (
    <div className="space-y-8">
      <SEO title="Task Management" description="Create and assign institution-wide tasks." />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#1E1B4B] dark:text-indigo-100 tracking-tight">
            Institution Tasks
          </h1>
          <p className="text-[#4C1D95]/60 dark:text-violet-400/60 mt-1 font-medium text-xs sm:text-sm">Create and assign tasks at institutional, department, or individual levels.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-6 py-3 rounded-2xl font-black uppercase tracking-wider text-xs shadow-xl shadow-purple-500/20 active:scale-95 cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" />
          Assign Task
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 pb-2">
        {(['All', 'Active', 'Completed', 'Drafts'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border",
              activeTab === tab 
                ? "bg-[#7C3AED] text-white border-[#7C3AED]"
                : "bg-white dark:bg-[#110A24] text-[#4C1D95]/60 dark:text-violet-400/60 border-slate-100 dark:border-violet-500/10 hover:border-[#7C3AED]/20"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search Filter */}
      <div className="bg-white/70 dark:bg-[#1A0F35]/20 backdrop-blur-md rounded-3xl p-4 border border-[#7C3AED]/10 dark:border-violet-500/20 shadow-sm flex items-center gap-4 relative z-[50]">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7C3AED] dark:text-violet-400 opacity-40 group-focus-within:opacity-100 transition-opacity" />
          <input 
            type="text" 
            placeholder="Search by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-2xl outline-none focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-medium text-[#1E1B4B] dark:text-indigo-100 placeholder:text-[#1E1B4B]/30 dark:placeholder:text-indigo-100/30"
          />
        </div>
      </div>

      {/* Task Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] rounded-full animate-spin" />
          <p className="text-[#4C1D95]/60 dark:text-violet-400/60 font-black text-xs uppercase tracking-widest">Loading Tasks...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredTasks.map(task => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group"
              >
                <div className="space-y-4">
                  {/* Status & Priority */}
                  <div className="flex justify-between items-center">
                    <span className={cn("px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg", getStatusColor(task.status))}>
                      {task.status}
                    </span>
                    <span className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1", getPriorityColor(task.priority))}>
                      <Flag className="w-3.5 h-3.5 fill-current" /> {task.priority}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-black text-[#1E1B4B] dark:text-indigo-50 leading-snug truncate">
                      {task.title}
                    </h3>
                    <p className="text-xs text-[#4C1D95]/60 dark:text-indigo-200/50 line-clamp-2 mt-1 min-h-[2.5rem]">
                      {task.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-2 border-y border-slate-100 dark:border-violet-500/10 py-3 text-xs text-[#4C1D95]/80 dark:text-indigo-200/80">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#7C3AED] dark:text-violet-400 opacity-60" />
                      <span>{task.department_name || 'All Departments'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#7C3AED] dark:text-violet-400 opacity-60" />
                      <span>Due: {formatDate(task.deadline)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#7C3AED] dark:text-violet-400 opacity-60" />
                      <span>Mode: <span className="capitalize font-black">{task.assignment_mode}</span></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        setIsDetailOpen(true);
                      }}
                      className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-violet-950/20 dark:hover:bg-violet-900/30 text-[#4C1D95]/80 dark:text-violet-400 border border-slate-200/30 dark:border-violet-500/20 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Eye className="w-4 h-4" /> View Detail
                    </button>
                    {task.status === 'Draft' && (
                      <button
                        onClick={() => handleOpenModal(task)}
                        className="p-2.5 border border-[#7C3AED]/20 dark:border-violet-500/20 text-[#7C3AED] dark:text-violet-400 hover:bg-[#7C3AED]/5 rounded-xl cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-2.5 border border-rose-200 dark:border-rose-950/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/10 rounded-xl cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {isDetailOpen && selectedTask && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailOpen(false)}
              className="absolute inset-0 bg-[#1E1B4B]/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-[2.5rem] w-full max-w-2xl p-6 sm:p-8 md:p-10 shadow-2xl z-10 max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-[#7C3AED] rounded-t-[2.5rem]" />
              
              <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#1E1B4B] dark:text-indigo-100 truncate max-w-md">{selectedTask.title}</h2>
                  <p className="text-xs font-bold text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest mt-1">Detailed Task Protocol</p>
                </div>
                <button 
                  onClick={() => setIsDetailOpen(false)}
                  className="p-3 hover:bg-slate-100 dark:hover:bg-violet-950/40 rounded-2xl transition-colors cursor-pointer"
                >
                  <X className="w-6 h-6 text-[#1E1B4B]/40 dark:text-violet-400" />
                </button>
              </div>

              <div className="space-y-6 overflow-y-auto flex-1 pr-1.5 -mr-2 scrollbar-thin">
                <div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-violet-400/60 uppercase tracking-widest">Description</p>
                  <p className="text-sm font-medium text-[#1E1B4B] dark:text-indigo-50 mt-1">{selectedTask.description || 'No description provided.'}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 dark:text-violet-400/60 uppercase tracking-widest">Priority</span>
                    <p className="text-sm font-black text-[#1E1B4B] dark:text-indigo-50 mt-0.5">{selectedTask.priority}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 dark:text-violet-400/60 uppercase tracking-widest">Status</span>
                    <p className="text-sm font-black text-[#1E1B4B] dark:text-indigo-50 mt-0.5">{selectedTask.status}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 dark:text-violet-400/60 uppercase tracking-widest">Type</span>
                    <p className="text-sm font-black text-[#1E1B4B] dark:text-indigo-50 mt-0.5">{selectedTask.task_type}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 dark:text-violet-400/60 uppercase tracking-widest">Category</span>
                    <p className="text-sm font-black text-[#1E1B4B] dark:text-indigo-50 mt-0.5">{selectedTask.category || 'General'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-violet-400/60 uppercase tracking-widest mb-3">Assigned Faculty / HODs ({selectedTask.assignments.length})</p>
                  <div className="space-y-3">
                    {selectedTask.assignments.map(as => (
                      <div key={as.id} className="p-3.5 bg-slate-50 dark:bg-[#1A0F35]/20 border border-slate-100 dark:border-violet-500/10 rounded-2xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/20 text-[#7C3AED] dark:text-violet-400 flex items-center justify-center font-black">
                            {as.faculty_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-[#1E1B4B] dark:text-indigo-50">{as.faculty_name}</p>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-violet-400/60 mt-0.5">{as.faculty_email}</p>
                          </div>
                        </div>
                        <span className={cn("px-2.5 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg", getStatusColor(as.status))}>
                          {as.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
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
                  <h2 className="text-xl sm:text-2xl font-black text-[#1E1B4B] dark:text-indigo-100">{editingTask ? 'Edit Task Details' : 'Assign New Task'}</h2>
                  <p className="text-xs font-bold text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest mt-1">Institutional Task Structuring</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-3 hover:bg-slate-100 dark:hover:bg-violet-950/40 rounded-2xl transition-colors cursor-pointer"
                >
                  <X className="w-6 h-6 text-[#1E1B4B]/40 dark:text-violet-400" />
                </button>
              </div>

              <form onSubmit={(e) => handleSubmit(e, false)} className="flex flex-col flex-1 overflow-hidden space-y-6">
                <div className="space-y-6 overflow-y-auto flex-1 pr-1.5 py-1 -mr-2 scrollbar-thin">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Task Title</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100"
                      placeholder="e.g. Annual Syllabus Structure Submission"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100 resize-none"
                      placeholder="Provide full brief of task requirements..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Deadline Date & Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.deadline}
                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Task Category</label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100"
                        placeholder="General, Syllabus, Exam, Event..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Department</label>
                      <select
                        value={formData.department_id}
                        onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100 cursor-pointer"
                      >
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Priority</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100 cursor-pointer"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Task Type</label>
                      <select
                        value={formData.task_type}
                        onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100 cursor-pointer"
                      >
                        <option value="Academic">Academic</option>
                        <option value="Event">Event</option>
                        <option value="Research">Research</option>
                        <option value="Administrative">Administrative</option>
                        <option value="Examination">Examination</option>
                        <option value="Documentation">Documentation</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Assignment Mode</label>
                      <select
                        value={formData.assignment_mode}
                        onChange={(e) => setFormData({ ...formData, assignment_mode: e.target.value as any })}
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100 cursor-pointer"
                      >
                        <option value="individual">Individual</option>
                        <option value="broadcast">Broadcast (All Faculty in Dept)</option>
                        <option value="group">Group Assignment</option>
                      </select>
                    </div>
                  </div>

                  {formData.assignment_mode !== 'broadcast' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Assign User(s)</label>
                      <select
                        multiple
                        required
                        value={formData.assigned_to_ids}
                        onChange={(e) => {
                          const values = Array.from(e.target.selectedOptions, option => option.value);
                          setFormData({ ...formData, assigned_to_ids: values });
                        }}
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100 cursor-pointer h-28"
                      >
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.role_name} - {u.department_name || 'N/A'})</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 font-bold ml-1">Hold Ctrl (or Cmd on Mac) to select multiple users for group tasks.</p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Reference/Attachment Link (Optional)</label>
                    <input
                      type="url"
                      value={formData.task_link}
                      onChange={(e) => setFormData({ ...formData, task_link: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100"
                      placeholder="https://example.com/docs"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-slate-100 dark:border-violet-500/10 flex-shrink-0 mt-auto">
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl font-black shadow-xl shadow-purple-500/20 transition-all uppercase tracking-widest text-xs cursor-pointer"
                  >
                    Publish task
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSubmit(e, true)}
                    className="px-6 py-4 bg-slate-100 dark:bg-violet-950/60 hover:bg-slate-200 dark:hover:bg-violet-900/60 text-[#1E1B4B] dark:text-indigo-200 rounded-2xl font-black transition-all uppercase tracking-widest text-xs cursor-pointer"
                  >
                    Save draft
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
