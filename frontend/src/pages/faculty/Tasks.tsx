import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Clock, 
  AlertCircle, 
  User, 
  FileText, 
  ArrowRight,
  HandMetal,
  Calendar,
  Layers,
  ThumbsDown,
  Download,
  Eye,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';
import { cn, formatDate, getDownloadUrl } from '@/lib/utils';
import Swal from 'sweetalert2';

interface Task {
  id: number;
  title: string;
  description: string;
  deadline: string;
  priority: 'High' | 'Medium' | 'Low' | 'Critical';
  task_type: string;
  status: string;
  assigned_by_name: string;
  assigned_by_pic: string | null;
  attachment_count: number;
  participant_count: number;
  attachments: any[];
  task_link?: string | null;
  created_at: string;
}

const FacultyTasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaskFiles, setSelectedTaskFiles] = useState<Task | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{url: string, name: string, type: string} | null>(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const allowDecline = user.features ? (user.features.allow_task_decline !== false) : true;

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/faculty/tasks.php`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        setTasks(data.data);
        setPendingTasks(data.pending || []);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const taskIdParam = params.get('taskId');
    if (taskIdParam && tasks.length > 0) {
      const foundTask = tasks.find(t => t.id === parseInt(taskIdParam));
      if (foundTask) {
        setSelectedTaskFiles(foundTask);
        // Clear param from URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [tasks]);

  const handleAccept = async (taskId: number, isPendingAssigned = false) => {
    const result = await Swal.fire({
      title: 'Accept Task?',
      text: "You are committing to complete this task.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#7C3AED',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, I\'ll do it!',
      background: '#ffffff',
      customClass: {
        popup: 'rounded-[2rem] border border-[#7C3AED]/10',
        confirmButton: 'rounded-xl font-bold px-6 py-3',
        cancelButton: 'rounded-xl font-bold px-6 py-3'
      }
    });

    if (result.isConfirmed) {
      try {
        const url = isPendingAssigned 
          ? `${import.meta.env.VITE_API_URL}/faculty/my_tasks.php`
          : `${import.meta.env.VITE_API_URL}/faculty/tasks.php`;
        const method = isPendingAssigned ? 'PUT' : 'POST';
        const body = isPendingAssigned 
          ? JSON.stringify({ task_id: taskId, status: 'In Progress' })
          : JSON.stringify({ task_id: taskId, action: 'accept' });

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body
        });
        const data = await response.json();
        if (data.status === 'success') {
          Swal.fire({
            title: 'Accepted!',
            text: 'The task has been moved to your personal queue.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
          fetchTasks();
        } else {
          Swal.fire('Error', data.message, 'error');
        }
      } catch (error) {
        Swal.fire('Error', 'Connection failed', 'error');
      }
    }
  };

  const handleDeclineAssigned = async (taskId: number) => {
    const result = await Swal.fire({
      title: 'Decline Task?',
      text: "Are you sure you want to decline this assigned task?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, Decline',
      background: '#ffffff',
      customClass: {
        popup: 'rounded-[2rem]',
        confirmButton: 'rounded-xl font-bold px-6 py-3',
        cancelButton: 'rounded-xl font-bold px-6 py-3'
      }
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/faculty/my_tasks.php`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ task_id: taskId, status: 'Declined' })
        });
        const data = await response.json();
        if (data.status === 'success') {
          Swal.fire({
            title: 'Declined',
            text: 'Task declined successfully.',
            icon: 'info',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 1500
          });
          fetchTasks();
        } else {
          Swal.fire('Error', data.message, 'error');
        }
      } catch (error) {
        Swal.fire('Error', 'Connection failed', 'error');
      }
    }
  };

  const handleReject = async (taskId: number) => {
    const result = await Swal.fire({
      title: 'Ignore Task?',
      text: "This task will be removed from your feed.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, Ignore',
      background: '#ffffff',
      customClass: {
        popup: 'rounded-[2rem]',
        confirmButton: 'rounded-xl font-bold px-6 py-3',
        cancelButton: 'rounded-xl font-bold px-6 py-3'
      }
    });

    if (result.isConfirmed) {
      setTasks(tasks.filter(t => t.id !== taskId));
      Swal.fire({
        title: 'Task Ignored',
        icon: 'info',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500
      });
    }
  };

  const handlePreview = (file: any) => {
    const url = `${import.meta.env.VITE_API_URL}/${file.file_path}`;
    const ext = file.file_name.split('.').pop().toLowerCase();
    setPreviewFile({ url, name: file.file_name, type: ext });
    setIsPreviewOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
      case 'Critical': return 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/35';
      case 'Medium': return 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/35';
      case 'Low': return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/35';
      default: return 'bg-slate-50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-800';
    }
  };

  return (
    <div className="space-y-8">
      <SEO title="Departmental Broadcasts" description="Browse and accept tasks broadcasted to your department." />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#1E184B] dark:text-indigo-100 tracking-tight">Available Tasks</h1>
          <p className="text-[#1E184B]/60 dark:text-violet-400/60 mt-1 font-bold flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#7C3AED] dark:text-violet-400" />
            Departmental opportunities and shared projects.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-white dark:bg-[#1A0F35]/80 rounded-[2.5rem] animate-pulse border border-[#7C3AED]/10 dark:border-violet-500/15" />
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
                {pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskFiles(task)}
                    className="bg-amber-500/[0.02] dark:bg-amber-500/[0.01] rounded-[2.5rem] border border-amber-500/20 p-7 shadow-sm hover:shadow-2xl hover:shadow-amber-500/5 transition-all relative overflow-hidden cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4 relative">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          getPriorityColor(task.priority)
                        )}>
                          {task.priority} Priority
                        </span>
                        <div className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-amber-500/20">
                          Assigned
                        </div>
                      </div>

                      <h3 className="text-xl font-black text-[#1E184B] dark:text-indigo-100 mb-2 truncate">{task.title}</h3>
                      <p className="text-[#1E184B]/60 dark:text-violet-400/50 text-sm font-medium mb-6 line-clamp-2 leading-relaxed">
                        {task.description || "No description provided."}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className={cn("grid gap-3 pt-5 border-t border-slate-100 dark:border-violet-500/10", allowDecline ? "grid-cols-2" : "grid-cols-1")}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleAccept(task.id, true); }}
                          className="py-3 bg-[#7C3AED] text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-[#6D28D9] transition-all shadow-md shadow-[#7C3AED]/15 cursor-pointer"
                        >
                          Accept
                        </button>
                        {allowDecline && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeclineAssigned(task.id); }}
                            className="py-3 bg-white dark:bg-[#110A24] text-rose-500 dark:text-rose-400 border border-rose-100 dark:border-rose-900/35 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-50 transition-all cursor-pointer"
                          >
                            Decline
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Broadcasted Tasks Feed */}
          <section className="space-y-6">
            <h2 className="text-xs font-black text-[#1E184B]/40 dark:text-violet-400/50 uppercase tracking-[0.2em] flex items-center gap-3">
              <span className="w-8 h-[2px] bg-[#7C3AED]/20" />
              Available Broadcasts ({tasks.length})
            </h2>
            {tasks.length === 0 ? (
              <div className="bg-white dark:bg-[#1A0F35]/80 rounded-[2.5rem] border border-[#7C3AED]/10 dark:border-violet-500/15 p-20 text-center">
                <div className="w-20 h-20 bg-[#7C3AED]/5 dark:bg-[#7C3AED]/15 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <CheckSquare className="w-10 h-10 text-[#7C3AED]/20 dark:text-[#7C3AED]/35" />
                </div>
                <h2 className="text-2xl font-black text-[#1E184B]/30 dark:text-violet-400/40 uppercase tracking-widest">Feed Clear</h2>
                <p className="text-[#1E184B]/40 dark:text-violet-400/50 font-bold mt-2">No broadcasted tasks available at the moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {tasks.map((task, idx) => (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                      key={task.id}
                      onClick={() => setSelectedTaskFiles(task)}
                      className="bg-white dark:bg-[#1A0F35]/80 rounded-[2.5rem] border border-[#7C3AED]/10 dark:border-violet-500/15 p-7 flex flex-col shadow-sm hover:shadow-2xl hover:shadow-[#7C3AED]/10 dark:hover:shadow-violet-500/[0.03] transition-all group relative overflow-hidden cursor-pointer"
                    >
                      <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#7C3AED]/5 rounded-full blur-2xl group-hover:bg-[#7C3AED]/10 transition-colors" />

                      <div className="flex items-start justify-between mb-4 relative">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          getPriorityColor(task.priority)
                        )}>
                          {task.priority} Priority
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/20 text-[#7C3AED] dark:text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-indigo-100 dark:border-indigo-900/35">
                            <HandMetal className="w-3 h-3" />
                            Group Mission
                          </div>
                        </div>
                      </div>

                      <h3 className="text-xl font-black text-[#1E184B] dark:text-indigo-100 mb-2 group-hover:text-[#7C3AED] dark:group-hover:text-violet-400 transition-colors line-clamp-1">{task.title}</h3>
                      <p className="text-[#1E184B]/60 dark:text-violet-400/50 text-sm font-medium mb-8 line-clamp-3 leading-relaxed">
                        {task.description || "No description provided."}
                      </p>

                      <div className="mt-auto space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-[0.1em]">Deadline</span>
                              <span className="text-[10px] font-black text-slate-700 dark:text-indigo-100">
                                {formatDate(task.deadline)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/35">
                            <HandMetal className="w-4 h-4 text-[#7C3AED] dark:text-[#7C3AED]" />
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-[0.1em]">Joined</span>
                              <span className="text-[10px] font-black text-[#7C3AED] dark:text-[#7C3AED]">
                                {task.participant_count} Members
                              </span>
                            </div>
                          </div>
                        </div>

                        {task.task_link && (
                          <a 
                            href={task.task_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="w-full flex items-center justify-between p-3.5 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/35 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all group/link shadow-sm"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest truncate">Mission Link</span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-emerald-600 group-hover/link:translate-x-1 transition-transform" />
                          </a>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAccept(task.id); }}
                            className="flex-1 py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#7C3AED]/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                          >
                            Accept
                            <ArrowRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleReject(task.id); }}
                            className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 hover:bg-rose-500 hover:text-white rounded-2xl border border-transparent dark:border-rose-900/35 transition-all shadow-sm active:scale-95"
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-violet-400/50">
                            <div className="w-5 h-5 bg-slate-50 dark:bg-[#110A24] rounded-full flex items-center justify-center overflow-hidden border border-slate-100 dark:border-violet-500/10">
                              {task.assigned_by_pic ? (
                                <img 
                                  src={`${import.meta.env.VITE_API_URL}/${task.assigned_by_pic}`} 
                                  alt={task.assigned_by_name} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-3 h-3 text-slate-300" />
                              )}
                            </div>
                            {task.assigned_by_name}
                          </div>
                          {task.attachment_count > 0 && (
                            <span className="text-[10px] font-black text-[#7C3AED] bg-[#7C3AED]/5 dark:bg-[#7C3AED]/15 px-2 py-1 rounded-lg">
                              {task.attachment_count} Resources
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Task Details & Resource Modal */}
      <AnimatePresence>
        {selectedTaskFiles && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTaskFiles(null)}
              className="absolute inset-0 bg-[#1E184B]/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-[#130C24] rounded-[2.5rem] w-full max-w-3xl p-8 md:p-10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar border border-slate-100 dark:border-violet-500/20"
            >
              <div className="flex justify-between items-start mb-8 border-b border-slate-100 dark:border-violet-500/10 pb-5">
                <div>
                  <span className="text-[9px] font-black text-[#7C3AED] bg-[#7C3AED]/5 dark:bg-[#7C3AED]/15 px-3 py-1 rounded-lg uppercase tracking-[0.2em] inline-block mb-2">
                    Department Broadcast Mission Briefing
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black text-[#1E184B] dark:text-indigo-100 leading-tight mt-1">{selectedTaskFiles.title}</h2>
                </div>
                <button onClick={() => setSelectedTaskFiles(null)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-[#1A0F35] rounded-xl transition-all shrink-0">
                  <X className="w-6 h-6 text-slate-400 dark:text-violet-400/60" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Briefing details */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest mb-2.5">Mission Origin</h3>
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-[#1A0F35]/40 border border-slate-100 dark:border-violet-500/10 p-3.5 rounded-2xl">
                      <div className="w-10 h-10 bg-white dark:bg-[#110A24] rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 shadow-sm">
                        {selectedTaskFiles.assigned_by_pic ? (
                          <img 
                            src={`${import.meta.env.VITE_API_URL}/${selectedTaskFiles.assigned_by_pic}`} 
                            alt={selectedTaskFiles.assigned_by_name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-slate-300" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-[#1E184B] dark:text-indigo-100">{selectedTaskFiles.assigned_by_name}</span>
                        <span className="text-[9px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-wider">Department HOD</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest mb-2">Priority</h3>
                      <span className={cn(
                        "px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border block text-center",
                        getPriorityColor(selectedTaskFiles.priority)
                      )}>
                        {selectedTaskFiles.priority} Priority
                      </span>
                    </div>
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest mb-2">Joined</h3>
                      <div className="px-3 py-2 bg-indigo-50/50 dark:bg-indigo-950/10 text-[#7C3AED] dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest text-center border border-indigo-100/50 dark:border-indigo-900/35">
                        {selectedTaskFiles.participant_count} Operatives
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest mb-2">Mission Timeline</h3>
                    <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/15 border-2 border-rose-100 dark:border-rose-900/35 flex items-center gap-3 text-rose-600 dark:text-rose-400">
                      <Clock className="w-5 h-5 shrink-0 animate-pulse text-rose-600" />
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase tracking-[0.1em] text-rose-400 dark:text-rose-500/50">Submission Deadline</span>
                        <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                          {formatDate(selectedTaskFiles.deadline)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest mb-2">Mission Briefing Parameters</h3>
                    <div className="p-5 bg-slate-50 dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/15 rounded-3xl text-sm font-semibold text-[#1E184B]/80 dark:text-indigo-100/80 leading-relaxed max-h-[220px] overflow-y-auto custom-scrollbar">
                      {selectedTaskFiles.description || "No specific instructions provided."}
                    </div>
                  </div>

                  {selectedTaskFiles.task_link && (
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest mb-2">External Platform Link</h3>
                      <a 
                        href={selectedTaskFiles.task_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-950/15 hover:bg-emerald-100/80 border border-emerald-100 dark:border-emerald-900/35 rounded-2xl transition-all group shadow-sm text-emerald-800 dark:text-emerald-400 font-black text-[10px] uppercase tracking-widest"
                      >
                        <span className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-600" />
                          Launch External Workspace
                        </span>
                        <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Right Column: Attachments */}
                <div className="flex flex-col">
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest mb-3.5">
                    Mission Resources ({selectedTaskFiles.attachment_count})
                  </h3>
                  
                  {selectedTaskFiles.attachment_count > 0 ? (
                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-1 custom-scrollbar">
                      {selectedTaskFiles.attachments.map((att: any) => (
                        <div key={att.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#110A24]/40 rounded-2xl border border-slate-100 dark:border-violet-500/10 hover:border-[#7C3AED]/20 dark:hover:border-violet-400/30 transition-all group">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 bg-white dark:bg-[#1A0F35] rounded-xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-violet-500/10 shrink-0">
                              <FileText className="w-5 h-5 text-[#7C3AED]" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-black text-[#1E184B] dark:text-indigo-100 truncate max-w-[150px]" title={att.file_name}>
                                {att.file_name}
                              </span>
                              <span className="text-[8px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest">Reference File</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button 
                              onClick={() => handlePreview(att)}
                              className="p-2.5 bg-white dark:bg-[#110A24] text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-slate-150 dark:border-violet-500/10"
                              title="Preview File"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <a 
                              href={getDownloadUrl(att.file_path)} 
                              download
                              className="p-2.5 bg-white dark:bg-[#110A24] text-[#7C3AED] rounded-xl hover:bg-[#7C3AED] hover:text-white transition-all shadow-sm border border-slate-150 dark:border-violet-500/10"
                              title="Download File"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 border-2 border-dashed border-slate-100 dark:border-violet-500/10 rounded-[2rem] p-8 text-center flex flex-col items-center justify-center bg-slate-50/20 dark:bg-[#110A24]/30 min-h-[220px]">
                      <FileText className="w-8 h-8 text-slate-300 dark:text-violet-400/30 mb-3 opacity-30" />
                      <p className="text-[10px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest">No attached assets</p>
                      <p className="text-[9px] font-bold text-slate-400 dark:text-violet-400/50 mt-1 max-w-[180px]">No additional files were uploaded for this briefing.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="flex flex-wrap items-center gap-4 mt-10 pt-6 border-t border-slate-100 dark:border-violet-500/10">
                <button
                  onClick={() => { setSelectedTaskFiles(null); handleAccept(selectedTaskFiles.id, !!selectedTaskFiles.my_status); }}
                  className="flex-1 min-w-[200px] py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[#7C3AED]/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  Accept Mission Briefing
                  <ArrowRight className="w-4 h-4" />
                </button>
                {(!selectedTaskFiles.my_status || allowDecline) && (
                  <button
                    onClick={() => { 
                      setSelectedTaskFiles(null); 
                      if (selectedTaskFiles.my_status) {
                        handleDeclineAssigned(selectedTaskFiles.id);
                      } else {
                        handleReject(selectedTaskFiles.id); 
                      }
                    }}
                    className="px-6 py-4 bg-rose-50 dark:bg-rose-950/15 text-rose-500 dark:text-rose-400 hover:bg-rose-500 hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest border border-transparent dark:border-rose-900/35 transition-all shadow-sm active:scale-95"
                    title={selectedTaskFiles.my_status ? "Decline Mission" : "Ignore Mission"}
                  >
                    <ThumbsDown className="w-4.5 h-4.5" />
                  </button>
                )}
                <button
                  onClick={() => setSelectedTaskFiles(null)}
                  className="py-4 px-6 bg-slate-100 dark:bg-[#110A24] hover:bg-slate-200 dark:hover:bg-[#1A0F35] text-[#1E184B] dark:text-indigo-100 rounded-2xl font-black uppercase tracking-widest text-xs border border-transparent dark:border-violet-500/10 transition-all"
                >
                  Close Briefing
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Universal Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && previewFile && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center md:p-10 p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPreviewOpen(false)}
              className="absolute inset-0 bg-[#1E184B]/95 dark:bg-[#0E0820]/95 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full h-full bg-white dark:bg-[#130C24] border border-transparent dark:border-violet-500/20 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Preview Header */}
              <div className="flex items-center justify-between px-8 py-4 border-b border-slate-100 dark:border-violet-500/10 bg-white dark:bg-[#130C24] shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#7C3AED]/5 dark:bg-[#7C3AED]/15 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-[#7C3AED]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#1E184B] dark:text-indigo-100 truncate max-w-[200px] md:max-w-md">{previewFile.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-violet-400/50 uppercase tracking-widest">Document Preview</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <a 
                    href={getDownloadUrl(previewFile.url.replace(`${import.meta.env.VITE_API_URL}/`, ''))} 
                    download 
                    className="p-3 bg-slate-50 dark:bg-[#1A0F35] text-slate-600 dark:text-violet-400/60 rounded-xl hover:bg-[#7C3AED] hover:text-white transition-all"
                    title="Download"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                  <button 
                    onClick={() => setIsPreviewOpen(false)}
                    className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white border border-transparent dark:border-rose-900/35 transition-all shadow-sm"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Preview Content */}
              <div className="flex-1 bg-slate-100/50 dark:bg-[#0E0820] p-2 overflow-hidden relative flex items-center justify-center">
                {['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(previewFile.type) ? (
                  <img 
                    src={previewFile.url} 
                    alt={previewFile.name}
                    className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                  />
                ) : previewFile.type === 'pdf' ? (
                  <iframe 
                    src={`${previewFile.url}#toolbar=0`}
                    className="w-full h-full rounded-xl border-none"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="text-center p-10 bg-white dark:bg-[#1A0F35] rounded-[2rem] shadow-xl max-w-sm border border-transparent dark:border-violet-500/15">
                    <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h4 className="text-lg font-black text-[#1E184B] dark:text-indigo-100">Preview Unavailable</h4>
                    <p className="text-xs font-bold text-slate-400 dark:text-violet-400/60 mt-2 leading-relaxed">
                      This file format ({previewFile.type.toUpperCase()}) cannot be previewed in-browser. Please download it to view locally.
                    </p>
                    <a 
                      href={getDownloadUrl(previewFile.url.replace(`${import.meta.env.VITE_API_URL}/`, ''))} 
                      download 
                      className="inline-flex items-center gap-2 mt-6 px-8 py-3 bg-[#7C3AED] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#7C3AED]/20"
                    >
                      <Download className="w-4 h-4" />
                      Download Now
                    </a>
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

export default FacultyTasks;
