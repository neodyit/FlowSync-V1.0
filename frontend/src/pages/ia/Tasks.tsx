import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Clock, 
  Calendar,
  Pencil,
  Trash2,
  Eye,
  Flag,
  Users,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import SEO from '@/components/SEO';
import { cn, formatDate } from '@/lib/utils';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

interface Attachment {
  id: number;
  file_name: string;
  file_path: string;
  entity_type: string;
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
  department_name: string | null;
  attachments: Attachment[];
}

export default function IATasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'Completed' | 'Drafts'>('All');
  const [allowIaTaskManagement, setAllowIaTaskManagement] = useState(true);

  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/ia/tasks.php`, { credentials: 'include' });
      const result = await res.json();
      if (result.status === 'success') {
        setTasks(result.data.tasks || []);
        if (result.data.allow_ia_task_management !== undefined) {
          setAllowIaTaskManagement(result.data.allow_ia_task_management === 'true');
        }
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
        {allowIaTaskManagement && (
          <button
            onClick={() => navigate('/ia/tasks/new')}
            className="flex items-center justify-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-6 py-3 rounded-2xl font-black uppercase tracking-wider text-xs shadow-xl shadow-purple-500/20 active:scale-95 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            Assign Task
          </button>
        )}
      </div>

      {/* {!allowIaTaskManagement && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-100 dark:border-rose-900/30 font-bold text-xs uppercase tracking-wider flex items-center gap-3">
          <Clock className="w-5 h-5 text-rose-500 animate-pulse" />
          Task creation, modification, and deletion are currently not available for IA.
        </div>
      )} */}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 pb-2">
        {(['All', 'Active', 'Completed', 'Drafts'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer",
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
                      onClick={() => navigate(`/ia/tasks/${task.id}`)}
                      className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-violet-950/20 dark:hover:bg-violet-900/30 text-[#4C1D95]/80 dark:text-violet-400 border border-slate-200/30 dark:border-violet-500/20 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Eye className="w-4 h-4" /> View Detail
                    </button>
                    {task.status === 'Draft' && allowIaTaskManagement && (
                      <button
                        onClick={() => navigate(`/ia/tasks/edit/${task.id}`)}
                        className="p-2.5 border border-[#7C3AED]/20 dark:border-violet-500/20 text-[#7C3AED] dark:text-violet-400 hover:bg-[#7C3AED]/5 rounded-xl cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {allowIaTaskManagement && (
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="p-2.5 border border-rose-200 dark:border-rose-950/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/10 rounded-xl cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
