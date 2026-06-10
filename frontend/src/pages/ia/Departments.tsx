import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  User, 
  Activity, 
  FileText, 
  Users, 
  X, 
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import SEO from '@/components/SEO';

const MySwal = withReactContent(Swal);

interface Department {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  hod_id: number | null;
  hod_name: string | null;
  is_enabled: number;
  faculty_count: number;
  completed_tasks: number;
  total_tasks: number;
  engagement_score: number;
}

interface HOD {
  id: number;
  name: string;
}

interface CustomSelectProps {
  label?: string;
  value: string | number;
  onChange: (value: string | number) => void;
  options: { value: string | number; label: string }[];
  placeholder?: string;
  icon?: React.ElementType;
  disabled?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ 
  label, value, onChange, options, placeholder, icon: Icon, disabled 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value.toString() === value.toString());

  return (
    <div className="relative flex flex-col gap-1.5 w-full" ref={containerRef}>
      {label && <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">{label}</label>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between w-full px-5 py-3.5 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-2xl transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100
          ${isOpen ? 'border-[#7C3AED] dark:border-violet-400 ring-4 ring-[#7C3AED]/5 dark:ring-violet-400/5' : 'border-[#7C3AED]/10 dark:border-violet-500/20 hover:border-[#7C3AED]/30 dark:hover:border-violet-400/40'}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-violet-950/20' : 'cursor-pointer'}
        `}
      >
        <div className="flex items-center gap-3 truncate">
          {Icon && <Icon className="w-4 h-4 text-[#7C3AED] dark:text-violet-400 opacity-40" />}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-[#7C3AED] dark:text-violet-400" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-[#110A24] rounded-2xl border border-[#7C3AED]/10 dark:border-violet-500/20 shadow-2xl z-[100] overflow-hidden py-2"
          >
            <div className="max-h-60 overflow-y-auto">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full px-5 py-3 text-left text-sm font-bold transition-all flex items-center justify-between cursor-pointer
                    ${opt.value.toString() === value.toString() ? 'bg-[#7C3AED] dark:bg-violet-600 text-white' : 'text-[#1E1B4B] dark:text-indigo-200 hover:bg-[#7C3AED]/5 dark:hover:bg-violet-950/40 hover:text-[#7C3AED] dark:hover:text-violet-300'}
                  `}
                >
                  {opt.label}
                  {opt.value.toString() === value.toString() && <CheckCircle2 className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function IADepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [hods, setHods] = useState<HOD[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    hod_id: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/ia/departments.php`, { credentials: 'include' });
      const result = await res.json();
      if (result.status === 'success') {
        setDepartments(result.data.departments);
        setHods(result.data.hods);
      }
    } catch (err) {
      console.error('Failed to fetch department management data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredDepts = useMemo(() => {
    return departments.filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.code && d.code.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [departments, searchQuery]);

  const handleOpenModal = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({
        name: dept.name,
        code: dept.code || '',
        description: dept.description || '',
        hod_id: dept.hod_id?.toString() || ''
      });
    } else {
      setEditingDept(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        hod_id: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    const result = await MySwal.fire({
      title: 'Are you sure?',
      text: "Only departments with no tasks assigned can be deleted.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#7C3AED',
      cancelButtonColor: '#EF4444',
      confirmButtonText: 'Yes, delete department!'
    });

    if (result.isConfirmed) {
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        const res = await fetch(`${apiUrl}/ia/departments.php?id=${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        const data = await res.json();
        if (data.status === 'success') {
          setDepartments(departments.filter(d => d.id !== id));
          MySwal.fire('Deleted!', 'Department deleted successfully.', 'success');
        } else {
          MySwal.fire('Error!', data.message, 'error');
        }
      } catch (err: any) {
        MySwal.fire('Error!', err.message || 'Operation failed', 'error');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingDept ? 'PUT' : 'POST';
    const payload = editingDept ? { ...formData, id: editingDept.id } : formData;

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/ia/departments.php`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchData();
        setIsModalOpen(false);
        MySwal.fire('Success!', `Department ${editingDept ? 'updated' : 'created'} successfully.`, 'success');
      } else {
        MySwal.fire('Error!', data.message, 'error');
      }
    } catch (err: any) {
      MySwal.fire('Error!', err.message || 'Operation failed', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <SEO title="Department Management" description="Create and manage departments, HOD assignments, and analytics." />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#1E1B4B] dark:text-indigo-100 tracking-tight">
            Department Management
          </h1>
          <p className="text-[#4C1D95]/60 dark:text-violet-400/60 mt-1 font-medium text-xs sm:text-sm">Create departments and assign Head of Departments.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-6 py-3 rounded-2xl font-black uppercase tracking-wider text-xs shadow-xl shadow-purple-500/20 active:scale-95 cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Department
        </button>
      </div>

      {/* Filter/Search */}
      <div className="bg-white/70 dark:bg-[#1A0F35]/20 backdrop-blur-md rounded-3xl p-4 border border-[#7C3AED]/10 dark:border-violet-500/20 shadow-sm flex items-center gap-4 relative z-[50]">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7C3AED] dark:text-violet-400 opacity-40 group-focus-within:opacity-100 transition-opacity" />
          <input 
            type="text" 
            placeholder="Search by department name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-2xl outline-none focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-medium text-[#1E1B4B] dark:text-indigo-100 placeholder:text-[#1E1B4B]/30 dark:placeholder:text-indigo-100/30"
          />
        </div>
      </div>

      {/* Department Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] rounded-full animate-spin" />
          <p className="text-[#4C1D95]/60 dark:text-violet-400/60 font-black text-xs uppercase tracking-widest">Loading Departments...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredDepts.map((dept) => {
              const taskRate = dept.total_tasks > 0 ? Math.round((dept.completed_tasks / dept.total_tasks) * 100) : 0;
              return (
                <motion.div
                  key={dept.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group"
                >
                  <div className="space-y-4">
                    {/* Title & Code */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="text-lg font-black text-[#1E1B4B] dark:text-indigo-50 leading-snug group-hover:text-[#7C3AED] dark:group-hover:text-violet-400 transition-colors">
                          {dept.name}
                        </h3>
                        {dept.code && (
                          <span className="inline-block mt-1.5 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest bg-violet-50 dark:bg-violet-950/30 text-[#7C3AED] dark:text-violet-400 rounded-lg">
                            {dept.code}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => handleOpenModal(dept)}
                          className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-violet-950/20 dark:hover:bg-violet-900/30 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-indigo-200 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(dept.id)}
                          className="p-2 bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-950/10 dark:hover:bg-rose-900/20 rounded-xl text-rose-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-[#4C1D95]/60 dark:text-indigo-200/50 line-clamp-2 min-h-[2rem]">
                      {dept.description || 'No description available for this department.'}
                    </p>

                    {/* HOD Status */}
                    <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-[#1A0F35]/25 border border-slate-100 dark:border-violet-500/10 text-xs">
                      <User className="w-4 h-4 text-[#7C3AED] dark:text-violet-400 opacity-60 shrink-0" />
                      <div className="truncate">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Head of Dept</p>
                        <p className="font-bold text-[#1E1B4B] dark:text-indigo-50 truncate mt-0.5">{dept.hod_name || 'Unassigned'}</p>
                      </div>
                    </div>

                    {/* Mini Stats Grid */}
                    <div className="grid grid-cols-3 gap-2.5 text-center py-2.5">
                      <div className="p-3 rounded-2xl border border-[#7C3AED]/5 dark:border-violet-500/5">
                        <Users className="w-4 h-4 text-indigo-500 mx-auto opacity-50" />
                        <span className="block text-sm font-black text-[#1E1B4B] dark:text-indigo-50 mt-1">{dept.faculty_count}</span>
                        <span className="block text-[8px] font-black text-[#4C1D95]/40 dark:text-indigo-200/40 uppercase mt-0.5">Faculty</span>
                      </div>

                      <div className="p-3 rounded-2xl border border-[#7C3AED]/5 dark:border-violet-500/5">
                        <FileText className="w-4 h-4 text-emerald-500 mx-auto opacity-50" />
                        <span className="block text-sm font-black text-[#1E1B4B] dark:text-indigo-50 mt-1">{taskRate}%</span>
                        <span className="block text-[8px] font-black text-[#4C1D95]/40 dark:text-indigo-200/40 uppercase mt-0.5">Tasks</span>
                      </div>

                      <div className="p-3 rounded-2xl border border-[#7C3AED]/5 dark:border-violet-500/5">
                        <Activity className="w-4 h-4 text-purple-500 mx-auto opacity-50" />
                        <span className="block text-sm font-black text-[#1E1B4B] dark:text-indigo-50 mt-1">{dept.engagement_score}</span>
                        <span className="block text-[8px] font-black text-[#4C1D95]/40 dark:text-indigo-200/40 uppercase mt-0.5">Points</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredDepts.length === 0 && (
        <div className="text-center py-20 space-y-4 bg-white/40 dark:bg-[#1A0F35]/10 rounded-[3rem] border border-dashed border-[#7C3AED]/20 dark:border-violet-500/20">
          <div className="w-20 h-20 bg-[#7C3AED]/10 dark:bg-violet-950/40 rounded-full flex items-center justify-center mx-auto">
            <Building2 className="w-10 h-10 text-[#7C3AED] dark:text-violet-400 opacity-20" />
          </div>
          <h3 className="text-xl font-black text-[#1E1B4B] dark:text-indigo-100">No departments constructed</h3>
          <p className="text-sm font-bold text-[#4C1D95]/60 dark:text-violet-400/60 max-w-xs mx-auto">
            Get started by adding departments and assigning Head of Departments.
          </p>
        </div>
      )}

      {/* Create/Edit Modal */}
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
                  <h2 className="text-xl sm:text-2xl font-black text-[#1E1B4B] dark:text-indigo-100">{editingDept ? 'Edit Department details' : 'Create Department'}</h2>
                  <p className="text-xs font-bold text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest mt-1">Institutional Structuring Protocol</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-3 hover:bg-slate-100 dark:hover:bg-violet-950/40 rounded-2xl transition-colors cursor-pointer"
                >
                  <X className="w-6 h-6 text-[#1E1B4B]/40 dark:text-violet-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden space-y-6">
                <div className="space-y-6 overflow-y-auto flex-1 pr-1.5 py-1 -mr-2 scrollbar-thin">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Department Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100"
                        placeholder="Computer Science Engineering"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Department Code</label>
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100"
                        placeholder="CSE"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100 resize-none"
                      placeholder="Provide brief details about the department..."
                    />
                  </div>

                  <CustomSelect
                    label="Assign Head of Department"
                    value={formData.hod_id}
                    onChange={(val) => setFormData({ ...formData, hod_id: val.toString() })}
                    options={[
                      { value: '', label: 'Unassigned (No HOD)' },
                      ...hods.map(h => ({ value: h.id, label: h.name }))
                    ]}
                    icon={User}
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-slate-100 dark:border-violet-500/10 flex-shrink-0 mt-auto">
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl font-black shadow-xl shadow-purple-500/20 transition-all uppercase tracking-widest text-xs cursor-pointer"
                  >
                    {editingDept ? 'Update Department' : 'Construct Department'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-8 py-4 bg-slate-100 dark:bg-violet-950/60 hover:bg-slate-200 dark:hover:bg-violet-900/60 text-[#1E1B4B] dark:text-indigo-200 rounded-2xl font-black transition-all uppercase tracking-widest text-xs cursor-pointer"
                  >
                    Cancel
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
