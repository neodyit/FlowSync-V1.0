import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Tag, 
  Clock, 
  Flag, 
  ChevronDown, 
  Layers, 
  Award, 
  FileText, 
  Info, 
  Users, 
  User, 
  Send, 
  CheckCircle2, 
  Search, 
  Plus,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import SEO from '@/components/SEO';
import { cn, formatDate } from '@/lib/utils';
import DateTimePicker from '@/components/ui/DateTimePicker';

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
  department_id: number | null;
  department_name: string | null;
  task_link: string | null;
  assignments: any[];
  attachments: Attachment[];
}

export default function IATaskForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openSelect, setOpenSelect] = useState<'priority' | 'faculty' | 'category' | 'department' | null>(null);
  const [facultySearchQuery, setFacultySearchQuery] = useState('');
  const [allowIaTaskManagement, setAllowIaTaskManagement] = useState(true);

  const [formData, setFormData] = useState({
    id: null as number | null,
    title: '',
    description: '',
    department_id: '',
    deadline: '',
    priority: 'Medium',
    task_type: 'Other',
    category: 'General',
    assignment_mode: 'individual',
    assigned_to_ids: [] as string[],
    task_link: '',
    attachments: [] as File[]
  });

  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.dropdown-container')) {
        setOpenSelect(null);
      }
    };
    if (openSelect) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openSelect]);

  useEffect(() => {
    if (formData.title || formData.description || formData.assigned_to_ids.length > 0) {
      setIsDirty(true);
    } else {
      setIsDirty(false);
    }
  }, [formData]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/ia/tasks.php`, { credentials: 'include' });
      const result = await res.json();
      if (result.status === 'success') {
        setDepartments(result.data.departments || []);
        setUsers(result.data.users || []);
        if (result.data.allow_ia_task_management !== undefined) {
          setAllowIaTaskManagement(result.data.allow_ia_task_management === 'true');
        }
        
        // If editing
        if (id) {
          const task = result.data.tasks.find((t: Task) => t.id === parseInt(id));
          if (task) {
            setFormData({
              id: task.id,
              title: task.title,
              description: task.description || '',
              department_id: task.department_id ? String(task.department_id) : '',
              deadline: task.deadline ? task.deadline.replace(' ', 'T').substring(0, 16) : '',
              priority: task.priority,
              task_type: task.task_type,
              category: task.category || 'General',
              assignment_mode: task.assignment_mode || 'individual',
              assigned_to_ids: task.assignments ? task.assignments.map((a: any) => a.user_id.toString()) : [],
              task_link: task.task_link || '',
              attachments: []
            });
            setExistingAttachments(task.attachments || []);
            setTimeout(() => setIsDirty(false), 100);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load tasks dependencies', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!allowIaTaskManagement && !isLoading) {
      MySwal.fire({
        icon: 'error',
        title: 'Task Management Disabled',
        text: 'The system administrator has disabled IA task creation/modification privileges.',
        confirmButtonColor: '#7C3AED'
      }).then(() => {
        navigate('/ia/tasks');
      });
    }
  }, [allowIaTaskManagement, isLoading]);

  // Filter users based on selected department
  const filteredUsers = React.useMemo(() => {
    if (!formData.department_id) return users;
    return users.filter(u => u.department_id === null || String(u.department_id) === formData.department_id);
  }, [users, formData.department_id]);

  const handleCreateOrUpdate = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    if (!formData.department_id) {
      MySwal.fire('Error', 'Please select a department to assign this task.', 'error');
      return;
    }
    if (formData.assignment_mode !== 'broadcast' && formData.assigned_to_ids.length === 0) {
      MySwal.fire('Error', 'Please select at least one assigned user.', 'error');
      return;
    }

    setIsSubmitting(true);
    const submitData = new FormData();
    submitData.append('is_draft', isDraft.toString());
    
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'attachments') {
        (value as File[]).forEach(file => submitData.append('attachments[]', file));
      } else if (key === 'assigned_to_ids') {
        (value as string[]).forEach(uid => submitData.append('assigned_to_ids[]', uid));
      } else if (value !== null) {
        submitData.append(key, value.toString());
      }
    });

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/ia/tasks.php`, {
        method: 'POST',
        body: submitData,
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        setIsDirty(false);
        MySwal.fire('Success', isDraft ? 'Draft saved' : 'Task successfully published', 'success');
        navigate('/ia/tasks');
      } else {
        MySwal.fire('Error', data.message || 'Operation failed', 'error');
      }
    } catch (error) {
      console.error('Failed to submit task details', error);
      MySwal.fire('Error', 'Failed to save task due to network error.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (isDirty) {
      MySwal.fire({
        title: 'Unsaved Changes',
        text: 'You have unsaved changes. Leave this page?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#7C3AED',
        cancelButtonColor: '#CBD5E1',
        confirmButtonText: 'Yes, leave',
        cancelButtonText: 'Stay'
      }).then((result) => {
        if (result.isConfirmed) navigate('/ia/tasks');
      });
    } else {
      navigate('/ia/tasks');
    }
  };

  return (
    <div className="space-y-8 pb-32">
      <SEO title={id ? "Edit Task" : "Deploy Task"} />

      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={handleBack}
          className="p-3 bg-white dark:bg-[#110A24] rounded-2xl shadow-sm border border-slate-200 dark:border-violet-500/20 hover:bg-slate-50 transition-all text-slate-500 hover:text-[#7C3AED] hover:border-[#7C3AED]/30 group cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </button>
        <div>
          <h1 className="text-3xl font-black text-[#1E1B4B] dark:text-indigo-100 tracking-tight">{id ? "Edit Task Details" : "Deploy New Task"}</h1>
          <p className="text-sm font-bold text-slate-400 dark:text-violet-400/50 mt-1">
            {id ? "Update task information and assignments" : "Configure and deploy new institutional tasks"}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#110A24]/40 backdrop-blur-md rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-violet-500/20 overflow-hidden">
        {isLoading ? (
          <div className="py-32 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-[#7C3AED]" />
            <p className="text-xs font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest mt-6">Loading task template details...</p>
          </div>
        ) : (
          <form onSubmit={(e) => handleCreateOrUpdate(e)} className="p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Form parameters */}
            <div className="lg:col-span-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#1E1B4B] dark:text-indigo-200 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-[#7C3AED]" /> Task Title
                </label>
                <input 
                  type="text" required
                  placeholder="e.g. End Semester Department Quality Audit"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-[#1A0F35]/30 border-2 border-slate-100 dark:border-violet-500/10 rounded-[1.5rem] text-sm font-bold text-[#1E1B4B] dark:text-indigo-100 focus:border-[#7C3AED] focus:bg-white dark:focus:bg-[#110A24] focus:ring-4 focus:ring-[#7C3AED]/10 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#1E1B4B] dark:text-indigo-200 uppercase tracking-widest ml-2 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#7C3AED]" /> Deadline Date & Time
                  </label>
                  <DateTimePicker 
                    required
                    value={formData.deadline}
                    onChange={(val) => setFormData({...formData, deadline: val})}
                  />
                </div>

                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black text-[#1E1B4B] dark:text-indigo-200 uppercase tracking-widest ml-2 flex items-center gap-2">
                    <Flag className="w-3.5 h-3.5 text-[#7C3AED]" /> Priority Level
                  </label>
                  <div className="relative group dropdown-container">
                    <button
                      type="button"
                      onClick={() => setOpenSelect(openSelect === 'priority' ? null : 'priority')}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-[#1A0F35]/30 border-2 border-slate-100 dark:border-violet-500/10 rounded-[1.5rem] text-xs font-bold text-[#1E1B4B] dark:text-indigo-100 flex items-center justify-between hover:border-[#7C3AED]/30 transition-all outline-none cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        {formData.priority}
                      </span>
                      <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", openSelect === 'priority' && "rotate-180")} />
                    </button>
                    
                    <AnimatePresence>
                      {openSelect === 'priority' && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/20 rounded-[1.5rem] shadow-2xl z-[320] p-2 grid grid-cols-2 gap-2"
                        >
                          {['Low', 'Medium', 'High', 'Critical'].map((p) => (
                            <button
                              key={p} type="button"
                              onClick={() => { setFormData({...formData, priority: p as any}); setOpenSelect(null); }}
                              className={cn(
                                "px-4 py-3 rounded-xl text-center text-[10px] font-black uppercase tracking-widest transition-all border cursor-pointer",
                                formData.priority === p 
                                  ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-md" 
                                  : "bg-slate-50 dark:bg-violet-950/20 text-slate-400 dark:text-indigo-200 border-transparent hover:bg-[#7C3AED]/5"
                              )}
                            >
                              {p}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#1E1B4B] dark:text-indigo-200 uppercase tracking-widest ml-2 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-[#7C3AED]" /> Task Type
                  </label>
                  <select
                    value={formData.task_type}
                    onChange={(e) => setFormData({...formData, task_type: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-[#1A0F35]/30 border-2 border-slate-100 dark:border-violet-500/10 rounded-[1.5rem] text-xs font-bold text-[#1E1B4B] dark:text-indigo-100 focus:border-[#7C3AED] focus:bg-white dark:focus:bg-[#110A24] focus:ring-4 focus:ring-[#7C3AED]/10 outline-none transition-all cursor-pointer"
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

                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black text-[#1E1B4B] dark:text-indigo-200 uppercase tracking-widest ml-2 flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-[#7C3AED]" /> Category
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. General, Audit, Review"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-[#1A0F35]/30 border-2 border-slate-100 dark:border-violet-500/10 rounded-[1.5rem] text-xs font-bold text-[#1E1B4B] dark:text-indigo-100 focus:border-[#7C3AED] focus:bg-white dark:focus:bg-[#110A24] focus:ring-4 focus:ring-[#7C3AED]/10 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#1E1B4B] dark:text-indigo-200 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[#7C3AED]" /> Description Briefing
                </label>
                <textarea 
                  placeholder="Enter detailed description objectives..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-6 py-5 bg-slate-50 dark:bg-[#1A0F35]/30 border-2 border-slate-100 dark:border-violet-500/10 rounded-[1.5rem] text-sm font-bold text-[#1E1B4B] dark:text-indigo-100 focus:border-[#7C3AED] focus:bg-white dark:focus:bg-[#110A24] focus:ring-4 focus:ring-[#7C3AED]/10 outline-none transition-all min-h-[160px] resize-y"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#1E1B4B] dark:text-indigo-200 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-slate-400" /> Reference URL Link (Optional)
                </label>
                <input 
                  type="url"
                  placeholder="https://example.com/docs"
                  value={formData.task_link}
                  onChange={(e) => setFormData({...formData, task_link: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-[#1A0F35]/30 border-2 border-slate-100 dark:border-violet-500/10 rounded-[1.5rem] text-xs font-bold text-[#1E1B4B] dark:text-indigo-100 focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10 outline-none"
                />
              </div>
            </div>

            {/* Right Column: Targets and assignments */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-slate-50 dark:bg-[#1A0F35]/25 border border-slate-100 dark:border-violet-500/10 p-6 rounded-[2rem] space-y-6">
                
                {/* Department Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#1E1B4B] dark:text-indigo-200 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#7C3AED]" /> Target Department
                  </label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({...formData, department_id: e.target.value, assigned_to_ids: []})}
                    className="w-full px-4 py-3 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-2xl text-xs font-bold text-[#1E1B4B] dark:text-indigo-100 outline-none cursor-pointer focus:border-[#7C3AED] focus:ring-2"
                  >
                    <option value="">Select Department...</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* Assignment Mode Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#1E1B4B] dark:text-indigo-200 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#7C3AED]" /> Assignment Mode
                  </label>
                  <div className="flex flex-col gap-3">
                    {[
                      { key: 'individual', title: 'Targeted Individual', desc: 'Deploy to specific faculty member(s)' },
                      { key: 'broadcast', title: 'Department Broadcast', desc: 'Deploy to all faculty in selected department' }
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        disabled={!formData.department_id}
                        onClick={() => setFormData({...formData, assignment_mode: opt.key as any, assigned_to_ids: []})}
                        className={cn(
                          "w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left cursor-pointer",
                          !formData.department_id && "opacity-50 cursor-not-allowed",
                          formData.assignment_mode === opt.key 
                            ? "bg-white dark:bg-[#110A24] border-[#7C3AED] dark:border-violet-400 shadow-md" 
                            : "bg-white dark:bg-[#110A24] border-transparent hover:border-slate-200 dark:hover:border-violet-500/20"
                        )}
                      >
                        <div className={cn(
                          "p-2 rounded-xl",
                          formData.assignment_mode === opt.key ? "bg-[#7C3AED]/10 text-[#7C3AED]" : "bg-slate-100 dark:bg-violet-950/20 text-slate-400"
                        )}>
                          {opt.key === 'individual' ? <User className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-black text-[#1E1B4B] dark:text-indigo-100 uppercase tracking-wider">{opt.title}</p>
                          <p className="text-[9px] font-bold text-slate-400 dark:text-violet-400/50 mt-0.5">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Individual assignment user list */}
                {formData.assignment_mode === 'individual' && formData.department_id && (
                  <div className="space-y-2 border-t border-slate-100 dark:border-violet-500/10 pt-4">
                    <label className="text-[10px] font-black text-[#1E1B4B] dark:text-indigo-200 uppercase tracking-widest ml-1">Assign User(s)</label>
                    <div className="relative group dropdown-container">
                      <button
                        type="button"
                        onClick={() => { setOpenSelect(openSelect === 'faculty' ? null : 'faculty'); setFacultySearchQuery(''); }}
                        className="w-full px-4 py-3 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-2xl text-xs font-bold text-[#1E1B4B] dark:text-indigo-100 flex items-center justify-between transition-all cursor-pointer"
                      >
                        <span>
                          {formData.assigned_to_ids.length > 0 
                            ? `${formData.assigned_to_ids.length} User(s) selected` 
                            : "Select users..."}
                        </span>
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      </button>

                      <AnimatePresence>
                        {openSelect === 'faculty' && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/20 rounded-[1.25rem] shadow-2xl z-[320] max-h-60 overflow-hidden flex flex-col"
                          >
                            <div className="p-2 border-b border-slate-100 dark:border-violet-500/10 bg-slate-50 dark:bg-violet-950/20">
                              <div className="relative flex items-center">
                                <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400" />
                                <input
                                  type="text"
                                  placeholder="Search name..."
                                  value={facultySearchQuery}
                                  onChange={(e) => setFacultySearchQuery(e.target.value)}
                                  className="w-full pl-8 pr-2 py-1.5 bg-white dark:bg-[#110A24] border border-slate-200 dark:border-violet-500/20 rounded-lg text-xs font-bold focus:outline-none"
                                />
                              </div>
                            </div>
                            <div className="p-1.5 overflow-y-auto custom-scrollbar flex-1">
                              {filteredUsers.filter(f => f.name.toLowerCase().includes(facultySearchQuery.toLowerCase())).map((f) => {
                                const isSelected = formData.assigned_to_ids.includes(f.id.toString());
                                return (
                                  <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => {
                                      const idStr = f.id.toString();
                                      setFormData(prev => ({
                                        ...prev,
                                        assigned_to_ids: prev.assigned_to_ids.includes(idStr) 
                                          ? prev.assigned_to_ids.filter(x => x !== idStr)
                                          : [...prev.assigned_to_ids, idStr]
                                      }));
                                    }}
                                    className={cn(
                                      "w-full px-3 py-2 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between mb-1 cursor-pointer",
                                      isSelected 
                                        ? "bg-[#7C3AED] text-white shadow-sm" 
                                        : "text-slate-500 hover:bg-[#7C3AED]/5"
                                    )}
                                  >
                                    <div className="flex flex-col">
                                      <span>{f.name}</span>
                                      <span className="text-[9px] opacity-65 font-medium">{f.role_name}</span>
                                    </div>
                                    {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 mt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-purple-500/20 cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {id ? 'Publish Task' : 'Create Task'}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => handleCreateOrUpdate(e, true)}
                  className="w-full py-4 bg-slate-100 dark:bg-violet-950/60 hover:bg-slate-200 dark:hover:bg-violet-900/60 text-[#1E1B4B] dark:text-indigo-200 rounded-2xl font-black uppercase tracking-widest text-xs cursor-pointer transition-all active:scale-95"
                >
                  Create Draft
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
