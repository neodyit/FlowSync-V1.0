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
import { ArrowLeft } from 'lucide-react';
import SEO from '@/components/SEO';
import { cn, formatDate, getDownloadUrl } from '@/lib/utils';
import Swal from 'sweetalert2';
import { useNavigate, useParams } from 'react-router-dom';
import DateTimePicker from '@/components/ui/DateTimePicker';

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


const HODTaskForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const showGroup = user.features ? (user.features.task_group !== false) : true;
  const showBroadcast = user.features ? (user.features.task_broadcast !== false) : true;
  
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [groups, setGroups] = useState<{id: number, name: string, members: {id: number}[]}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openSelect, setOpenSelect] = useState<'priority' | 'faculty' | 'category' | 'group' | null>(null);
  const [facultySearchQuery, setFacultySearchQuery] = useState('');
  const [systemSettings, setSystemSettings] = useState({ pause_new_tasks: 'false' });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  
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

  const fetchGroups = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/groups.php`, { credentials: 'include' });
      const data = await response.json();
      if (data.status === 'success') setGroups(data.data);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  const fetchFaculty = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/faculty.php`, { credentials: 'include' });
      const data = await response.json();
      if (data.status === 'success') setFacultyList(data.data);
    } catch (error) {
      console.error('Failed to fetch faculty:', error);
    }
  };

  const fetchTaskDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/tasks.php`, { credentials: 'include' });
      const data = await response.json();
      if (data.status === 'success') {
        setTasks(data.data);
        if (data.settings) setSystemSettings(data.settings);
        
        if (id) {
          const task = data.data.find((t: Task) => t.id === parseInt(id));
          if (task) {
            setFormData({
              id: task.id,
              title: task.title,
              description: task.description || '',
              deadline: task.deadline ? task.deadline.replace(' ', 'T').substring(0, 16) : '',
              priority: task.priority,
              task_type: task.task_type,
              category: task.category || 'General',
              assignment_mode: task.assignment_mode || (task.assigned_to_id ? 'individual' : 'broadcast'),
              assigned_to_ids: task.assignments ? task.assignments.map((a: any) => a.user_id.toString()) : (task.assigned_to_id ? [task.assigned_to_id.toString()] : []),
              task_link: task.task_link || '',
              attachments: []
            });
            setTimeout(() => setIsDirty(false), 100);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculty();
    fetchGroups();
    fetchTaskDetails();
  }, [id]);

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
        navigate('/hod/tasks');
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

  const handleBack = () => {
    if (isDirty) {
      Swal.fire({
        title: 'Unsaved Changes',
        text: 'You have unsaved changes. Are you sure you want to leave?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f43f5e',
        cancelButtonColor: '#cbd5e1',
        confirmButtonText: 'Yes, leave',
        cancelButtonText: 'Stay'
      }).then((result) => {
        if (result.isConfirmed) navigate('/hod/tasks');
      });
    } else {
      navigate('/hod/tasks');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-32">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-8">
        <SEO title={id ? "Edit Mission" : "Deploy New Mission"} />
        
        {/* Header Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBack}
              className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all text-slate-500 hover:text-[#7C3AED] hover:border-[#7C3AED]/30 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-[#1E184B] tracking-tight">{id ? "Refine Mission Parameters" : "Deploy New Mission"}</h1>
              <p className="text-sm font-bold text-slate-400 mt-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#7C3AED] animate-pulse" />
                {id ? "Update existing task intelligence" : "Configure and assign a new operational task"}
              </p>
            </div>
          </div>
        </div>

        {systemSettings.pause_new_tasks === 'true' && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-rose-50 text-rose-600 p-5 rounded-3xl text-xs font-black uppercase tracking-widest flex items-center gap-4 border border-rose-100 shadow-sm shadow-rose-100/50"
          >
            <div className="p-2 bg-rose-100 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <p>Task Creation is currently suspended by Central Command. You may save this mission as a Draft.</p>
          </motion.div>
        )}

        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
          {isLoading ? (
            <div className="py-32 flex flex-col items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-[#7C3AED]/20 rounded-full blur-xl animate-pulse" />
                <Loader2 className="w-10 h-10 animate-spin text-[#7C3AED] relative z-10" />
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-6">Decrypting task intelligence...</p>
            </div>
          ) : (
            <form onSubmit={(e) => handleCreateOrUpdate(e)} className="flex flex-col">
              
              <div className="p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-16">
                
                {/* ----------------- LEFT COLUMN: MISSION DETAILS ----------------- */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                  
                  {/* Title Section */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest ml-2 flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-[#7C3AED]" /> Mission Designation
                    </label>
                    <input 
                      type="text" required
                      placeholder="e.g., Operation End Semester Exam"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] text-sm font-bold text-[#1E184B] focus:border-[#7C3AED] focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/10 outline-none transition-all placeholder:text-slate-300"
                    />
                  </div>

                  {/* Grid: Deadline & Priority */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest ml-2 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#7C3AED]" /> Deadline Protocol
                      </label>
                      <DateTimePicker 
                        required
                        value={formData.deadline}
                        onChange={(val) => setFormData({...formData, deadline: val})}
                      />
                      {formData.deadline && (
                        <p className="text-[10px] font-black text-[#7C3AED] ml-2 mt-1 uppercase tracking-widest animate-in fade-in duration-300">
                          Formatted: {formatDate(formData.deadline)}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2 relative">
                      <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest ml-2 flex items-center gap-2">
                        <Flag className="w-3.5 h-3.5 text-[#7C3AED]" /> Threat / Priority Level
                      </label>
                      <div className="relative group dropdown-container">
                        <button
                          type="button"
                          onClick={() => setOpenSelect(openSelect === 'priority' ? null : 'priority')}
                          className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] text-xs font-bold flex items-center justify-between hover:border-[#7C3AED]/30 hover:bg-white transition-all group-focus:border-[#7C3AED] outline-none"
                        >
                          <span className={cn(
                            "flex items-center gap-2",
                            formData.priority === 'Critical' ? 'text-rose-600' :
                            formData.priority === 'High' ? 'text-orange-500' :
                            formData.priority === 'Medium' ? 'text-amber-500' : 'text-emerald-500'
                          )}>
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              formData.priority === 'Critical' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' :
                              formData.priority === 'High' ? 'bg-orange-500' :
                              formData.priority === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                            )} />
                            {formData.priority}
                          </span>
                          <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", openSelect === 'priority' && "rotate-180")} />
                        </button>
                        
                        <AnimatePresence>
                          {openSelect === 'priority' && (
                            <>
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl z-[320] overflow-hidden p-2 grid grid-cols-2 gap-2"
                              >
                                {['Low', 'Medium', 'High', 'Critical'].map((p) => (
                                  <button
                                    key={p} type="button"
                                    onClick={() => { setFormData({...formData, priority: p as any}); setOpenSelect(null); }}
                                    className={cn(
                                      "px-4 py-3 rounded-xl text-center text-[10px] font-black uppercase tracking-widest transition-all border",
                                      formData.priority === p 
                                        ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-md shadow-[#7C3AED]/20" 
                                        : "bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100 hover:text-[#7C3AED]"
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

                  {/* Grid: Type & Category */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest ml-2 flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-[#7C3AED]" /> Mission Type
                      </label>
                      <input 
                        type="text"
                        placeholder="e.g., Documentation"
                        value={formData.task_type}
                        onChange={(e) => setFormData({...formData, task_type: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] text-xs font-bold text-[#1E184B] focus:border-[#7C3AED] focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/10 outline-none transition-all placeholder:text-slate-300"
                      />
                    </div>
                    <div className="space-y-2 relative">
                      <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest ml-2 flex items-center gap-2">
                        <Award className="w-3.5 h-3.5 text-[#7C3AED]" /> Classification Category
                      </label>
                      <div className="relative group dropdown-container">
                        <button
                          type="button"
                          onClick={() => setOpenSelect(openSelect === 'category' ? null : 'category')}
                          className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] text-xs font-bold text-[#1E184B] flex items-center justify-between hover:border-[#7C3AED]/30 hover:bg-white transition-all outline-none"
                        >
                          <span className="text-[#1E184B]">{formData.category}</span>
                          <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", openSelect === 'category' && "rotate-180")} />
                        </button>
                        
                        <AnimatePresence>
                          {openSelect === 'category' && (
                            <>
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl z-[320] overflow-hidden p-2 grid grid-cols-2 gap-2"
                              >
                                {['Academic', 'Administrative', 'Research', 'Documentation', 'Examination', 'Event', 'Other'].map((c) => (
                                  <button
                                    key={c} type="button"
                                    onClick={() => { setFormData({...formData, category: c}); setOpenSelect(null); }}
                                    className={cn(
                                      "w-full px-4 py-3 rounded-xl text-left text-[10px] font-black uppercase tracking-widest transition-all",
                                      formData.category === c ? "bg-[#7C3AED] text-white" : "text-slate-500 hover:bg-slate-50 hover:text-[#7C3AED]"
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

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest ml-2 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-[#7C3AED]" /> Mission Intelligence (Briefing)
                    </label>
                    <textarea 
                      placeholder="Enter detailed intelligence, objectives, and parameters for the operational unit..."
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] text-sm font-bold text-[#1E184B] focus:border-[#7C3AED] focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/10 outline-none transition-all min-h-[160px] resize-y placeholder:text-slate-300 leading-relaxed custom-scrollbar"
                    />
                  </div>

                  {/* Reference URL */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                      <Info className="w-3.5 h-3.5 text-slate-400" /> External Reference Link (Optional)
                    </label>
                    <input 
                      type="url"
                      placeholder="https://"
                      value={formData.task_link}
                      onChange={(e) => setFormData({...formData, task_link: e.target.value})}
                      className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-[1.5rem] text-xs font-bold text-[#1E184B] focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10 outline-none transition-all placeholder:text-slate-300"
                    />
                  </div>
                </div>

                {/* ----------------- RIGHT COLUMN: ASSIGNMENT & MATERIALS ----------------- */}
                <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
                  
                  {/* Assignment Control Box */}
                  <div className="bg-slate-50/50 p-6 xl:p-8 rounded-[2rem] border-2 border-slate-100/60 space-y-6 relative">
                    <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none -z-10">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#7C3AED]/5 rounded-bl-full" />
                    </div>
                    
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#7C3AED]" /> Deployment Mode
                      </label>
                      <div className="flex flex-col gap-4">
                        
                        {/* Targeted Option */}
                        <div className="space-y-3">
                          <button 
                            type="button"
                            onClick={() => { setFormData({...formData, assignment_mode: 'individual', assigned_to_ids: []}); setOpenSelect(null); }}
                            className={cn(
                              "w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left",
                              formData.assignment_mode === 'individual' 
                                ? "bg-white border-[#7C3AED] shadow-xl shadow-[#7C3AED]/10 ring-4 ring-[#7C3AED]/5" 
                                : "bg-white border-transparent hover:border-slate-200"
                            )}
                          >
                            <div className={cn(
                              "p-2.5 rounded-xl transition-colors",
                              formData.assignment_mode === 'individual' ? "bg-[#7C3AED]/10 text-[#7C3AED]" : "bg-slate-100 text-slate-400"
                            )}>
                              <User className="w-5 h-5" />
                            </div>
                            <div>
                              <p className={cn("text-xs font-black uppercase tracking-widest", formData.assignment_mode === 'individual' ? "text-[#1E184B]" : "text-slate-400")}>Targeted</p>
                              <p className="text-[9px] font-bold text-slate-400 mt-0.5">Specific faculty</p>
                            </div>
                          </button>

                          <AnimatePresence mode="wait">
                            {formData.assignment_mode === 'individual' && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="space-y-2 relative pl-2 border-l-2 border-slate-100"
                              >
                                <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest ml-1">Target Faculty</label>
                                <div className="relative group dropdown-container">
                                  <button
                                    type="button"
                                    onClick={() => { setOpenSelect(openSelect === 'faculty' ? null : 'faculty'); setFacultySearchQuery(''); }}
                                    className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-[1.25rem] text-xs font-bold text-[#1E184B] flex items-center justify-between hover:border-[#7C3AED]/30 transition-all outline-none"
                                  >
                                    <span className={formData.assigned_to_ids.length > 0 ? "text-[#1E184B]" : "text-slate-400"}>
                                      {formData.assigned_to_ids.length > 0 
                                        ? `${formData.assigned_to_ids.length} Facult${formData.assigned_to_ids.length > 1 ? 'ies' : 'y'} enlisted` 
                                        : "Select personnel..."}
                                    </span>
                                    <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", openSelect === 'faculty' && "rotate-180")} />
                                  </button>
                                  
                                  <AnimatePresence>
                                    {openSelect === 'faculty' && (
                                      <>
                                        <motion.div
                                          initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                          className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl z-[320] overflow-hidden flex flex-col max-h-[400px]"
                                        >
                                          <div className="p-3 border-b border-slate-50 bg-slate-50/50">
                                            <div className="relative">
                                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                              <input 
                                                type="text" autoFocus placeholder="Scan registry by name or email..."
                                                value={facultySearchQuery} onChange={(e) => setFacultySearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#1E184B] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/10 outline-none transition-all placeholder:text-slate-300"
                                              />
                                            </div>
                                          </div>
                                          <div className="p-2 overflow-y-auto custom-scrollbar">
                                            {facultyList.filter(f => f.name.toLowerCase().includes(facultySearchQuery.toLowerCase()) || f.email.toLowerCase().includes(facultySearchQuery.toLowerCase())).length === 0 ? (
                                              <div className="py-8 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">No personnel match parameters</div>
                                            ) : (
                                              facultyList.filter(f => f.name.toLowerCase().includes(facultySearchQuery.toLowerCase()) || f.email.toLowerCase().includes(facultySearchQuery.toLowerCase())).map((f) => {
                                                const isSelected = formData.assigned_to_ids.includes(f.id.toString());
                                                return (
                                                  <button
                                                    key={f.id} type="button"
                                                    onClick={() => { 
                                                      const idStr = f.id.toString();
                                                      setFormData(prev => ({
                                                        ...prev, 
                                                        assigned_to_ids: prev.assigned_to_ids.includes(idStr) ? prev.assigned_to_ids.filter(id => id !== idStr) : [...prev.assigned_to_ids, idStr]
                                                      })); 
                                                    }}
                                                    className={cn(
                                                      "w-full px-4 py-3 rounded-xl text-left transition-all flex items-center justify-between mb-1",
                                                      isSelected ? "bg-[#7C3AED] text-white shadow-md shadow-[#7C3AED]/20" : "bg-white hover:bg-slate-50 text-slate-500 hover:text-[#7C3AED]"
                                                    )}
                                                  >
                                                    <div className="flex flex-col">
                                                      <span className="text-xs font-black">{f.name}</span>
                                                      <span className={cn("text-[9px] font-bold mt-0.5", isSelected ? "text-white/70" : "text-slate-400")}>{f.email}</span>
                                                    </div>
                                                    {isSelected && <CheckCircle2 className="w-5 h-5 text-white" />}
                                                  </button>
                                                );
                                              })
                                            )}
                                          </div>
                                        </motion.div>
                                      </>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Group Option */}
                        {(showGroup || formData.assignment_mode === 'group') && (
                          <div className="space-y-3">
                            <button 
                              type="button"
                              onClick={() => { setFormData({...formData, assignment_mode: 'group', assigned_to_ids: []}); setOpenSelect(null); }}
                              className={cn(
                                "w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left",
                                formData.assignment_mode === 'group' 
                                  ? "bg-white border-[#7C3AED] shadow-xl shadow-[#7C3AED]/10 ring-4 ring-[#7C3AED]/5" 
                                  : "bg-white border-transparent hover:border-slate-200"
                              )}
                            >
                              <div className={cn(
                                "p-2.5 rounded-xl transition-colors",
                                formData.assignment_mode === 'group' ? "bg-[#7C3AED]/10 text-[#7C3AED]" : "bg-slate-100 text-slate-400"
                              )}>
                                <Users className="w-5 h-5" />
                              </div>
                              <div>
                                <p className={cn("text-xs font-black uppercase tracking-widest", formData.assignment_mode === 'group' ? "text-[#1E184B]" : "text-slate-400")}>Group</p>
                                <p className="text-[9px] font-bold text-slate-400 mt-0.5">Pre-defined group</p>
                              </div>
                            </button>

                            <AnimatePresence mode="wait">
                              {formData.assignment_mode === 'group' && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                  className="space-y-2 relative pl-2 border-l-2 border-slate-100"
                                >
                                  <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest ml-1">Target Group</label>
                                  <div className="relative group dropdown-container">
                                    <button
                                      type="button"
                                      onClick={() => setOpenSelect(openSelect === 'group' ? null : 'group')}
                                      className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-[1.25rem] text-xs font-bold text-[#1E184B] flex items-center justify-between hover:border-[#7C3AED]/30 transition-all outline-none"
                                    >
                                      <span className={formData.assigned_to_ids.length > 0 ? "text-[#1E184B]" : "text-slate-400"}>
                                        {formData.assigned_to_ids.length > 0 
                                          ? `${formData.assigned_to_ids.length} Faculty${formData.assigned_to_ids.length > 1 ? 's' : ''} enlisted` 
                                          : "Select Group..."}
                                      </span>
                                      <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", openSelect === 'group' && "rotate-180")} />
                                    </button>
                                    
                                    <AnimatePresence>
                                      {openSelect === 'group' && (
                                        <>
                                          <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl z-[320] overflow-hidden flex flex-col max-h-[350px]"
                                          >
                                            <div className="p-2 overflow-y-auto custom-scrollbar">
                                              {groups.length === 0 ? (
                                                <div className="py-8 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">No Groups available</div>
                                              ) : (
                                                groups.map((g) => {
                                                  const isSelected = g.members.length > 0 && g.members.every(m => formData.assigned_to_ids.includes(m.id.toString())) && g.members.length === formData.assigned_to_ids.length;
                                                  return (
                                                    <button
                                                      key={g.id} type="button"
                                                      onClick={() => { 
                                                        setFormData(prev => ({ ...prev, assigned_to_ids: g.members.map(m => m.id.toString()) })); 
                                                        setOpenSelect(null);
                                                      }}
                                                      className={cn(
                                                        "w-full px-4 py-3 rounded-xl text-left transition-all mb-1",
                                                        isSelected ? "bg-[#7C3AED] text-white shadow-md shadow-[#7C3AED]/20" : "text-slate-500 hover:bg-slate-50 hover:text-[#7C3AED]"
                                                      )}
                                                    >
                                                      <div className="flex items-center justify-between">
                                                        <span className="text-xs font-black">{g.name}</span>
                                                        <span className={cn(
                                                          "text-[9px] font-bold px-2 py-0.5 rounded-lg",
                                                          isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
                                                        )}>{g.members.length} Units</span>
                                                      </div>
                                                    </button>
                                                  );
                                                })
                                              )}
                                              <div className="px-2 pt-2 pb-1 border-t border-slate-50 mt-1">
                                                <a href="/hod/groups" target="_blank" className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                                  <Plus className="w-3.5 h-3.5" /> Manage Group
                                                </a>
                                              </div>
                                            </div>
                                          </motion.div>
                                        </>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {/* Broadcast Option */}
                        {(showBroadcast || formData.assignment_mode === 'broadcast') && (
                          <div className="space-y-3">
                            <button 
                              type="button"
                              onClick={() => { setFormData({...formData, assignment_mode: 'broadcast', assigned_to_ids: []}); setOpenSelect(null); }}
                              className={cn(
                                "w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left",
                                formData.assignment_mode === 'broadcast' 
                                  ? "bg-white border-[#7C3AED] shadow-xl shadow-[#7C3AED]/10 ring-4 ring-[#7C3AED]/5" 
                                  : "bg-white border-transparent hover:border-slate-200"
                              )}
                            >
                              <div className={cn(
                                "p-2.5 rounded-xl transition-colors",
                                formData.assignment_mode === 'broadcast' ? "bg-[#7C3AED]/10 text-[#7C3AED]" : "bg-slate-100 text-slate-400"
                              )}>
                                <Send className="w-5 h-5" />
                              </div>
                              <div>
                                <p className={cn("text-xs font-black uppercase tracking-widest", formData.assignment_mode === 'broadcast' ? "text-[#1E184B]" : "text-slate-400")}>Broadcast</p>
                                <p className="text-[9px] font-bold text-slate-400 mt-0.5">All active personnel</p>
                              </div>
                            </button>
                          </div>
                        )}

                      </div>
                    </div>
                  </div>

                  {/* Materials Upload Box */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-[#1E184B] dark:text-indigo-300 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#7C3AED] dark:text-violet-400" /> Material Assets
                    </label>
                    <div className="relative group">
                      <input 
                        type="file" multiple
                        onChange={(e) => {
                          const newFiles = Array.from(e.target.files || []);
                          setFormData(prev => ({...prev, attachments: [...prev.attachments, ...newFiles]}));
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                      />
                      <div className="px-6 py-10 bg-slate-50 dark:bg-[#1A0F35]/60 border-2 border-dashed border-slate-200 dark:border-violet-500/20 rounded-[2rem] flex flex-col items-center justify-center gap-4 group-hover:border-[#7C3AED]/40 dark:group-hover:border-violet-500/50 transition-all group-hover:bg-[#7C3AED]/5 dark:group-hover:bg-violet-500/10 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-100/50 dark:to-violet-900/10" />
                        <div className="w-14 h-14 bg-white dark:bg-[#130C24] rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200/50 dark:shadow-violet-900/40 text-slate-400 dark:text-violet-400/50 group-hover:text-[#7C3AED] dark:group-hover:text-violet-400 group-hover:scale-110 transition-all relative z-10 border border-transparent dark:border-violet-500/10">
                          <Plus className="w-6 h-6" />
                        </div>
                        <div className="text-center relative z-10">
                          <p className="text-[11px] font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest">Transmit Documents</p>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-violet-400/60 mt-1.5">Drop files to attach to this mission</p>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {formData.attachments.length > 0 && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-1 gap-2 mt-4">
                          {formData.attachments.map((file, idx) => (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                              key={`${file.name}-${idx}`} 
                              className="flex items-center justify-between p-3.5 bg-white dark:bg-[#130C24] border-2 border-slate-100 dark:border-violet-500/15 rounded-[1.25rem] shadow-sm hover:border-slate-200 dark:hover:border-violet-500/30 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-indigo-50 dark:bg-violet-900/30 text-indigo-600 dark:text-violet-400 rounded-xl">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-black text-[#1E184B] dark:text-indigo-100 truncate max-w-[180px] sm:max-w-[240px]">{file.name}</span>
                                  <span className="text-[9px] font-bold text-slate-400 dark:text-violet-400/60 uppercase tracking-widest mt-0.5">{(file.size / 1024).toFixed(1)} KB</span>
                                </div>
                              </div>
                              <button 
                                type="button"
                                onClick={() => setFormData(prev => ({...prev, attachments: prev.attachments.filter((_, i) => i !== idx)}))}
                                className="p-2 bg-slate-50 dark:bg-[#1A0F35] hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 dark:text-violet-400/50 hover:text-rose-500 dark:hover:text-rose-400 rounded-xl transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

              </div>

              {/* ----------------- BOTTOM ACTION BAR ----------------- */}
              <div className="bg-slate-50 dark:bg-[#0E0820] border-t border-slate-100 dark:border-violet-500/10 p-6 lg:px-10 lg:py-6 flex flex-col sm:flex-row items-center justify-between gap-6 rounded-b-[2.5rem]">
                <p className="text-[10px] font-bold text-slate-400 dark:text-violet-400/60 uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> All systems ready for deployment
                </p>
                <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
                  <button 
                    type="button"
                    onClick={(e) => handleCreateOrUpdate(e as any, true)}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-[#130C24] text-slate-600 dark:text-indigo-300 hover:text-[#7C3AED] dark:hover:text-violet-300 rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 active:scale-95 border-2 border-slate-200 dark:border-violet-500/20 hover:border-[#7C3AED]/30 dark:hover:border-violet-500/40 shadow-sm hover:shadow-md"
                  >
                    {isSubmitting ? 'Processing...' : formData.id ? 'Save Draft' : 'Save as Draft'}
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting || (systemSettings.pause_new_tasks === 'true' && (!formData.id || tasks.find(t=>t.id===formData.id)?.status === 'Draft'))}
                    className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[#7C3AED]/25 dark:shadow-violet-900/50 hover:shadow-2xl hover:shadow-[#7C3AED]/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Transmitting...
                      </>
                    ) : (
                      <>
                        {formData.id && tasks.find(t=>t.id===formData.id)?.status !== 'Draft' ? 'Update Mission Params' : 'Initialize Mission'}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default HODTaskForm;
