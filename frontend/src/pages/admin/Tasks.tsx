import React, { useState, useEffect, type ReactNode } from 'react';
import { 
  Search, 
  Building2, 
  School, 
  User, 
  Calendar, 
  Trash2, 
  Eye,
  AlertCircle,
  Clock,
  CheckCircle2,
  RefreshCw,
  X,
  FileText,
  Tag,
  Target,
  Download,
  MessageSquare,
  History,
  Shield,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatDate, getDownloadUrl } from "@/lib/utils";
import CustomSelect from '@/components/common/CustomSelect';

interface Attachment {
  id: number;
  file_name: string;
  file_path: string;
  entity_type: string;
  created_at: string;
}

interface Review {
  id: number;
  remarks: string;
  points: number;
  bonus_points: number;
  status: string;
  reviewer_name: string;
  created_at: string;
}

interface Task {
  progress: ReactNode;
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  task_type: string;
  deadline: string;
  college_id: number;
  college_name: string;
  department_id: number;
  department_name: string;
  assigned_to_id: number | null;
  assigned_to_name: string | null;
  assigned_to_email: string | null;
  assigned_by_name: string | null;
  assigned_by_email: string | null;
  created_at: string;
  points: number;
  bonus_points: number;
  remarks: string;
  attachments?: Attachment[];
  reviews?: Review[];
}

interface College {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
  college_id: number;
}

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCollege, setSelectedCollege] = useState<any>('');
  const [selectedDept, setSelectedDept] = useState<any>('');
  const [selectedStatus, setSelectedStatus] = useState<any>('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [tasksRes, collegesRes, deptsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/admin/tasks.php`, { credentials: 'include' }),
        fetch(`${import.meta.env.VITE_API_URL}/admin/colleges.php`, { credentials: 'include' }),
        fetch(`${import.meta.env.VITE_API_URL}/admin/departments.php`, { credentials: 'include' })
      ]);

      const tasksData = await tasksRes.json();
      const collegesData = await collegesRes.json();
      const deptsData = await deptsRes.json();

      if (tasksData.status === 'success') setTasks(tasksData.data);
      if (collegesData.status === 'success') setColleges(collegesData.data);
      if (deptsData.status === 'success') setDepartments(deptsData.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Polling for real-time updates every 5 seconds
    const interval = setInterval(() => {
      fetchData(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const openViewModal = (task: Task) => {
    setViewingTask(task);
    setShowModal(true);
  };

  const handleDeleteTask = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this task? This action cannot be undone.')) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/tasks.php?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        setTasks(tasks.filter(t => t.id !== id));
      }
    } catch (error) {
      alert('Failed to delete task');
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCollege = !selectedCollege || task.college_id === parseInt(selectedCollege);
    const matchesDept = !selectedDept || task.department_id === parseInt(selectedDept);
    const matchesStatus = !selectedStatus || task.status === selectedStatus;
    return matchesSearch && matchesCollege && matchesDept && matchesStatus;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'In Progress': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Assigned': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'Submitted': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Under Review': return 'bg-purple-50 text-purple-600 border-purple-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'text-rose-500';
      case 'High': return 'text-orange-500';
      case 'Medium': return 'text-amber-500';
      default: return 'text-emerald-500';
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#7C3AED]/10 rounded-xl">
              <Shield className="w-5 h-5 text-[#7C3AED]" />
            </div>
            <span className="text-[10px] font-black text-[#7C3AED] uppercase tracking-[0.2em]">Institutional Oversight</span>
          </div>
          <h1 className="text-4xl font-black text-[#1E1B4B] tracking-tight">Mission Records</h1>
          <p className="text-[#4C1D95]/60 mt-1 font-medium">Monitoring academic and administrative workflows globally.</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`${import.meta.env.VITE_API_URL}/admin/export_tasks.php`}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border border-slate-200 text-[#1E1B4B] font-bold text-sm hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            EXPORT CSV
          </a>
          <button 
            onClick={() => fetchData()}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border border-[#7C3AED]/10 text-[#7C3AED] font-bold text-sm hover:bg-[#7C3AED]/5 transition-all"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            REFRESH SYNC
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-6 rounded-[32px] border border-[#7C3AED]/10 shadow-xl shadow-[#7C3AED]/5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative group md:col-span-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#7C3AED] transition-colors" />
            <input 
              type="text" 
              placeholder="Search by mission title..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-[11px] bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-[#7C3AED] transition-all text-sm font-medium placeholder:text-slate-300"
            />
          </div>

          <CustomSelect 
            options={colleges.map(c => ({ value: c.id, label: c.name }))}
            value={selectedCollege}
            onChange={(val) => { setSelectedCollege(val); setSelectedDept(''); }}
            placeholder="All Colleges"
            icon={<School className="w-5 h-5" />}
          />

          <CustomSelect 
            options={departments
              .filter(d => !selectedCollege || d.college_id === parseInt(selectedCollege))
              .map(d => ({ value: d.id, label: d.name }))
            }
            value={selectedDept}
            onChange={(val) => setSelectedDept(val)}
            disabled={!selectedCollege}
            placeholder="All Departments"
            icon={<Building2 className="w-5 h-5" />}
          />

          <CustomSelect 
            options={[
              { value: 'Assigned', label: 'Assigned' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Submitted', label: 'Submitted' },
              { value: 'Under Review', label: 'Under Review' },
              { value: 'Completed', label: 'Completed' }
            ]}
            value={selectedStatus}
            onChange={(val) => setSelectedStatus(val)}
            placeholder="All Statuses"
            icon={<Target className="w-5 h-5" />}
          />
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-[32px] border border-[#7C3AED]/10 shadow-xl shadow-[#7C3AED]/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Mission Details</th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Personnel</th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status / Priority</th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Intelligence Progress</th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Rewards</th>
                <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-20 text-center"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#7C3AED]/20" /></td></tr>
              ) : filteredTasks.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-20 text-center"><AlertCircle className="w-8 h-8 mx-auto text-slate-200 mb-2" /><p className="text-sm font-bold text-slate-400">No records found.</p></td></tr>
              ) : filteredTasks.map((task) => (
                <motion.tr layout key={task.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-6 min-w-[300px]">
                    <p className="text-sm font-black text-[#1E1B4B] line-clamp-1">{task.title}</p>
                    <p className="text-[11px] text-slate-400 font-medium line-clamp-1 mt-1">{task.description}</p>
                    <div className="flex items-center gap-4 mt-3 font-bold text-slate-400 text-[10px]">
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {formatDate(task.deadline)}</span>
                      <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> {task.task_type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">{task.college_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E1B4B]">{task.department_name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500"><User className="w-3.5 h-3.5" /></div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Assigned To</p>
                          <p className="text-[11px] font-bold text-[#1E1B4B]">{task.assigned_to_name || 'Global Broadcast'}</p>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="space-y-2">
                      <div className={cn("inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", getStatusStyle(task.status))}>{task.status}</div>
                      <div className={cn("flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest", getPriorityStyle(task.priority))}>{task.priority}</div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="space-y-2 w-32">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-[#1E1B4B]">{task.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${task.progress}%` }}
                          className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            task.progress === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-[#7C3AED] to-blue-500"
                          )}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    {(task.points > 0 || task.bonus_points > 0) ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[9px] font-black border border-emerald-100">
                            {task.points} PTS
                          </div>
                        </div>
                        {task.bonus_points > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md text-[9px] font-black border border-amber-100">
                              +{task.bonus_points} BONUS
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-300 italic">Pending Review</span>
                    )}
                  </td>
                  <td className="px-6 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openViewModal(task)} 
                        className="p-2.5 rounded-xl bg-white border border-slate-100 text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white hover:shadow-lg transition-all"
                        title="View Full Audit Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteTask(task.id)} 
                        className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-300 hover:text-rose-500 hover:border-rose-100 transition-all"
                        title="Purge Record"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Audit Modal (View Only) */}
      <AnimatePresence>
        {showModal && viewingTask && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-[#1E1B4B]/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-[#F8FAFC] rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-8 bg-white border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border", getStatusStyle(viewingTask.status))}>
                    <Target className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-[#1E1B4B]">{viewingTask.title}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mission ID: FS-{viewingTask.id.toString().padStart(4, '0')}</span>
                      <div className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className={cn("text-[10px] font-black uppercase tracking-widest", getPriorityStyle(viewingTask.priority))}>{viewingTask.priority} Priority</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-3 rounded-full hover:bg-slate-50 text-slate-400 transition-colors"><X /></button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                {/* Core Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Organizational Unit</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <School className="w-5 h-5 text-[#7C3AED]" />
                        <span className="text-sm font-bold text-[#1E1B4B]">{viewingTask.college_name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-slate-400" />
                        <span className="text-sm font-bold text-[#1E1B4B]/60">{viewingTask.department_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Assigned Personnel</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 font-bold text-xs">
                          {viewingTask.assigned_to_name?.[0] || 'B'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1E1B4B]">{viewingTask.assigned_to_name || 'Broadcast Mode'}</p>
                          <p className="text-[10px] font-medium text-slate-400">{viewingTask.assigned_to_email || 'Multiple Faculty'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Authority & Timeline</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-slate-400" />
                        <span className="text-sm font-bold text-[#1E1B4B]/60">HOD: {viewingTask.assigned_by_name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-rose-500" />
                        <span className="text-sm font-bold text-[#1E1B4B]">Due: {formatDate(viewingTask.deadline)}</span>
                      </div>
                    </div>
                    {(viewingTask.status !== 'Rework Required' && (viewingTask.points > 0 || viewingTask.bonus_points > 0)) && (
                      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2">
                        <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black border border-emerald-100">
                          {viewingTask.points} PTS
                        </div>
                        {viewingTask.bonus_points > 0 && (
                          <div className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black border border-amber-100">
                            +{viewingTask.bonus_points} BONUS
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Description & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-[#1E1B4B] uppercase tracking-widest flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#7C3AED]" />
                      Mission Briefing
                    </h3>
                    <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm min-h-[160px]">
                      <p className="text-sm text-slate-600 font-medium leading-relaxed">
                        {viewingTask.description || "No detailed description provided for this mission."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-[#1E1B4B] uppercase tracking-widest flex items-center gap-2">
                      <History className="w-4 h-4 text-[#7C3AED]" />
                      Audit Timeline & Status
                    </h3>
                    <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm min-h-[160px] space-y-4">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Status</span>
                        <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", getStatusStyle(viewingTask.status))}>
                          {viewingTask.status}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400">
                        <div className="flex flex-col">
                          <span className="uppercase text-[9px] opacity-60 mb-1">Created At</span>
                          <span className="text-[#1E1B4B]">{formatDate(viewingTask.created_at)}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 opacity-20" />
                        <div className="flex flex-col">
                          <span className="uppercase text-[9px] opacity-60 mb-1">Target Deadline</span>
                          <span className="text-[#1E1B4B]">{formatDate(viewingTask.deadline)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attachments Section */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-[#1E1B4B] uppercase tracking-widest flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#7C3AED]" />
                    Mission Attachments ({viewingTask.attachments?.length || 0})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {viewingTask.attachments && viewingTask.attachments.length > 0 ? (
                      viewingTask.attachments.map((att) => (
                        <div key={att.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-[#7C3AED]/20 transition-all">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#7C3AED]/5 group-hover:text-[#7C3AED] transition-colors">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-xs font-bold text-[#1E1B4B] truncate">{att.file_name}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">{att.entity_type.replace('_', ' ')}</p>
                            </div>
                          </div>
                          <a href={getDownloadUrl(att.file_path)} download className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-8 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                        <p className="text-xs font-bold text-slate-400 italic">No attachments discovered for this mission.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Remarks Section */}
                <div className="space-y-4 pb-4">
                  <h3 className="text-xs font-black text-[#1E1B4B] uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#7C3AED]" />
                    Submission Remarks & Evaluations ({viewingTask.reviews?.length || 0})
                  </h3>
                  <div className="space-y-3">
                    {/* Show Main Task Remarks if present */}
                    {viewingTask.remarks && (
                      <div className="bg-[#7C3AED]/5 p-6 rounded-[28px] border border-[#7C3AED]/10 shadow-sm space-y-2">
                        <p className="text-[9px] font-black text-[#7C3AED] uppercase tracking-widest">Final Decision Remarks</p>
                        <p className="text-sm text-slate-700 font-medium italic">
                          "{viewingTask.remarks}"
                        </p>
                      </div>
                    )}

                    {viewingTask.reviews && viewingTask.reviews.length > 0 ? (
                      viewingTask.reviews.map((rev) => (
                        <div key={rev.id} className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                <Shield className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-xs font-black text-[#1E1B4B]">{rev.reviewer_name}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(rev.created_at)}</p>
                              </div>
                            </div>
                            {viewingTask.status !== 'Rework Required' && (
                              <div className="flex items-center gap-2">
                                <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black border border-emerald-100">
                                  {rev.points} PTS
                                </div>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 font-medium italic border-l-4 border-slate-100 pl-4 py-1">
                            "{rev.remarks}"
                          </p>
                        </div>
                      ))
                    ) : !viewingTask.remarks && (
                      <div className="py-8 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                        <p className="text-xs font-bold text-slate-400 italic">No evaluative remarks recorded yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-white border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-8 py-3 bg-[#1E1B4B] text-white rounded-2xl font-black text-xs hover:bg-[#1E1B4B]/90 transition-all"
                >
                  CLOSE RECORD
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tasks;
