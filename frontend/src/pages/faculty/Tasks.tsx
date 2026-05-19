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
  created_at: string;
}

const FacultyTasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaskFiles, setSelectedTaskFiles] = useState<Task | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{url: string, name: string, type: string} | null>(null);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/faculty/tasks.php`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        setTasks(data.data);
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

  const handleAccept = async (taskId: number) => {
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
        const response = await fetch(`${import.meta.env.VITE_API_URL}/faculty/tasks.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ task_id: taskId, action: 'accept' })
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
      case 'Critical': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'Medium': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Low': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="space-y-8">
      <SEO title="Departmental Broadcasts" description="Browse and accept tasks broadcasted to your department." />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#1E184B] tracking-tight">Available Tasks</h1>
          <p className="text-[#1E184B]/60 mt-1 font-bold flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#7C3AED]" />
            Departmental opportunities and shared projects.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-white rounded-[2.5rem] animate-pulse border border-[#7C3AED]/10" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-[#7C3AED]/10 p-20 text-center">
          <div className="w-20 h-20 bg-[#7C3AED]/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckSquare className="w-10 h-10 text-[#7C3AED]/20" />
          </div>
          <h2 className="text-2xl font-black text-[#1E184B]/30 uppercase tracking-widest">Feed Clear</h2>
          <p className="text-[#1E184B]/40 font-bold mt-2">No broadcasted tasks available at the moment.</p>
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
                className="bg-white rounded-[2.5rem] border border-[#7C3AED]/10 p-7 flex flex-col shadow-sm hover:shadow-2xl hover:shadow-[#7C3AED]/10 transition-all group relative overflow-hidden"
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
                    <div className="px-2.5 py-1 bg-indigo-50 text-[#7C3AED] rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-indigo-100">
                      <HandMetal className="w-3 h-3" />
                      Group Mission
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-black text-[#1E184B] mb-2 group-hover:text-[#7C3AED] transition-colors line-clamp-1">{task.title}</h3>
                <p className="text-[#1E184B]/60 text-sm font-medium mb-8 line-clamp-3 leading-relaxed">
                  {task.description || "No description provided."}
                </p>

                <div className="mt-auto space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em]">Deadline</span>
                        <span className="text-[10px] font-black text-slate-700">
                          {formatDate(task.deadline)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100/50">
                      <HandMetal className="w-4 h-4 text-[#7C3AED]" />
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em]">Joined</span>
                        <span className="text-[10px] font-black text-[#7C3AED]">
                          {task.participant_count} Members
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAccept(task.id)}
                      className="flex-1 py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#7C3AED]/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      Accept
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReject(task.id)}
                      className="p-4 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95"
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                      <div className="w-5 h-5 bg-slate-50 rounded-full flex items-center justify-center overflow-hidden border border-slate-100">
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
                      <span className="text-[10px] font-black text-[#7C3AED] bg-[#7C3AED]/5 px-2 py-1 rounded-lg">
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

      {/* Resource Modal */}
      <AnimatePresence>
        {selectedTaskFiles && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTaskFiles(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-black text-[#1E184B]">Task Resources</h2>
                  <p className="text-xs font-bold text-[#1E184B]/40 uppercase tracking-widest mt-1">Review attached documentation</p>
                </div>
                <button onClick={() => setSelectedTaskFiles(null)} className="p-2 hover:bg-slate-100 rounded-xl">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="space-y-3">
                {selectedTaskFiles.attachments.map((att: any) => (
                  <div key={att.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-[#7C3AED]/20 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <FileText className="w-5 h-5 text-[#7C3AED]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-[#1E184B] truncate max-w-[150px]">{att.file_name}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reference File</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handlePreview(att)}
                        className="p-2.5 bg-white text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <a 
                        href={getDownloadUrl(att.file_path)} 
                        download
                        className="p-2.5 bg-white text-[#7C3AED] rounded-xl hover:bg-[#7C3AED] hover:text-white transition-all shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setSelectedTaskFiles(null)}
                className="w-full mt-8 py-4 bg-slate-100 hover:bg-slate-200 text-[#1E184B] rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
              >
                Close Gallery
              </button>
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
              className="absolute inset-0 bg-[#1E184B]/95 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full h-full bg-white rounded-[2rem] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Preview Header */}
              <div className="flex items-center justify-between px-8 py-4 border-b border-slate-100 bg-white shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#7C3AED]/5 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-[#7C3AED]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#1E184B] truncate max-w-[200px] md:max-w-md">{previewFile.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document Preview</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <a 
                    href={getDownloadUrl(previewFile.url.replace(`${import.meta.env.VITE_API_URL}/`, ''))} 
                    download 
                    className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-[#7C3AED] hover:text-white transition-all"
                    title="Download"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                  <button 
                    onClick={() => setIsPreviewOpen(false)}
                    className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Preview Content */}
              <div className="flex-1 bg-slate-100/50 p-2 overflow-hidden relative flex items-center justify-center">
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
                  <div className="text-center p-10 bg-white rounded-[2rem] shadow-xl max-w-sm">
                    <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h4 className="text-lg font-black text-[#1E184B]">Preview Unavailable</h4>
                    <p className="text-xs font-bold text-slate-400 mt-2 leading-relaxed">
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
