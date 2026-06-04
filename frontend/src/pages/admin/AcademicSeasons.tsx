import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Lock,
  Unlock,
  Check,
  Plus,
  Trash2,
  Copy,
  TrendingUp,
  Clock,
  CheckCircle2,
  Info,
  X,
  ChevronDown,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatDate } from '@/lib/utils';
import SEO from '@/components/SEO';
import DateTimePicker from '@/components/ui/DateTimePicker';

interface Season {
  id: number;
  college_id: number;
  name: string;
  start_date: string;
  end_date: string;
  type: 'Semester' | 'Academic Year' | 'Custom';
  description: string | null;
  status: 'Active' | 'Inactive' | 'Archived';
  is_default: number;
  is_locked: number;
  created_at: string;
  total_tasks?: number;
  completed_tasks?: number;
  avg_response_hours?: number | null;
}

interface CustomSelectProps {
  label?: string;
  value: string | number;
  onChange: (value: string | number) => void;
  options: { value: string | number; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  label, value, onChange, options, placeholder, disabled, className
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
    <div className={`relative flex flex-col gap-1.5 ${className}`} ref={containerRef}>
      {label && <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">{label}</label>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between w-full px-5 py-3.5 bg-white dark:bg-[#110A24] border rounded-2xl transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100
          ${isOpen ? 'border-[#7C3AED] dark:border-violet-400 ring-4 ring-[#7C3AED]/5 dark:ring-violet-400/5' : 'border-[#7C3AED]/10 dark:border-violet-500/20 hover:border-[#7C3AED]/30 dark:hover:border-violet-400/40'}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-violet-950/20' : 'cursor-pointer'}
        `}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-[#7C3AED] dark:text-violet-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-[#110A24] rounded-2xl border border-[#7C3AED]/10 dark:border-violet-500/20 shadow-2xl z-[150] overflow-hidden py-2"
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

const AcademicSeasons: React.FC = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [colleges, setColleges] = useState<{ id: number; name: string; short_name: string }[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState<'Semester' | 'Academic Year' | 'Custom'>('Semester');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Archived'>('Inactive');
  const [isDefault, setIsDefault] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [cloneFrom, setCloneFrom] = useState<string>('');
  const [cloneTasks, setCloneTasks] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Comparison Panel states
  const [compareSeasonA, setCompareSeasonA] = useState<number | ''>('');
  const [compareSeasonB, setCompareSeasonB] = useState<number | ''>('');

  const fetchColleges = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/colleges.php`, { credentials: 'include' });
      const data = await res.json();
      if (data.status === 'success') {
        setColleges(data.data);
        if (data.data.length > 0) {
          setSelectedCollegeId(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching colleges:', error);
    }
  };

  const fetchSeasons = async () => {
    if (!selectedCollegeId) return;
    try {
      setIsLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/academic_seasons.php?stats=1&college_id=${selectedCollegeId}`, {
        credentials: 'include'
      });
      const resData = await res.json();
      if (resData.status === 'success') {
        setSeasons(resData.data);
        if (resData.data.length > 0) {
          setCompareSeasonA(resData.data[0].id);
          if (resData.data.length > 1) {
            setCompareSeasonB(resData.data[1].id);
          } else {
            setCompareSeasonB('');
          }
        } else {
          setCompareSeasonA('');
          setCompareSeasonB('');
        }
      }
    } catch (error) {
      console.error('Error fetching academic seasons:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchColleges();
  }, []);

  useEffect(() => {
    if (selectedCollegeId) {
      fetchSeasons();
    }
  }, [selectedCollegeId]);

  const openCreateModal = () => {
    setEditingSeason(null);
    setName('');
    setStartDate('');
    setEndDate('');
    setType('Semester');
    setDescription('');
    setStatus('Inactive');
    setIsDefault(false);
    setIsLocked(false);
    setCloneFrom('');
    setCloneTasks(false);
    setIsModalOpen(true);
  };

  const openEditModal = (season: Season) => {
    setEditingSeason(season);
    setName(season.name);
    setStartDate(season.start_date);
    setEndDate(season.end_date);
    setType(season.type);
    setDescription(season.description || '');
    setStatus(season.status);
    setIsDefault(season.is_default === 1);
    setIsLocked(season.is_locked === 1);
    setCloneFrom('');
    setCloneTasks(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      id: editingSeason?.id,
      college_id: selectedCollegeId,
      name,
      start_date: startDate,
      end_date: endDate,
      type,
      description,
      status,
      is_default: isDefault ? 1 : 0,
      is_locked: isLocked ? 1 : 0,
      clone_from: cloneFrom ? parseInt(cloneFrom) : null,
      clone_tasks: cloneTasks
    };

    try {
      const url = `${import.meta.env.VITE_API_URL}/academic_seasons.php`;
      const method = editingSeason ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.status === 'success') {
        setIsModalOpen(false);
        fetchSeasons();
      } else {
        alert(data.message || 'Error occurred');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Network error');
    }
  };

  const handleToggleLock = async (season: Season) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/academic_seasons.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...season,
          college_id: selectedCollegeId,
          is_locked: season.is_locked === 1 ? 0 : 1
        }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchSeasons();
      } else {
        alert(data.message || 'Failed to update lock status');
      }
    } catch (error) {
      console.error('Error locking/unlocking season:', error);
    }
  };

  const handleSetDefault = async (season: Season) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/academic_seasons.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...season,
          college_id: selectedCollegeId,
          is_default: 1
        }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchSeasons();
      } else {
        alert(data.message || 'Failed to set default season');
      }
    } catch (error) {
      console.error('Error setting default season:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this academic season? This will not affect historical tasks/points already created.')) {
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/academic_seasons.php?id=${id}&college_id=${selectedCollegeId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchSeasons();
      } else {
        alert(data.message || 'Failed to delete season');
      }
    } catch (error) {
      console.error('Error deleting season:', error);
    }
  };

  const seasonAData = seasons.find(s => s.id === compareSeasonA);
  const seasonBData = seasons.find(s => s.id === compareSeasonB);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      <SEO title="Academic Seasons" description="Manage academic periods, terms, semesters, and configurations" />

      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#1E1B4B] dark:text-indigo-100 tracking-tight">
            Academic Seasons
          </h1>
          <p className="text-[#4C1D95]/60 dark:text-violet-400/60 mt-1 font-medium text-xs sm:text-sm">
            Configure academic cycles, locks, template cloning, and defaults.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {colleges.length > 0 && (
            <CustomSelect
              value={selectedCollegeId}
              onChange={(val) => setSelectedCollegeId(Number(val))}
              options={colleges.map(c => ({ value: c.id, label: c.name }))}
              placeholder="Select College"
              className="w-full sm:w-64"
            />
          )}
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-purple-500/20 active:scale-95 cursor-pointer text-xs sm:text-sm shrink-0"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            Create Season
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] rounded-full animate-spin" />
          <p className="text-[#4C1D95]/60 dark:text-violet-400/60 font-black text-xs uppercase tracking-widest">Synchronizing Seasons...</p>
        </div>
      ) : (
        <>
          {/* Seasons Timeline Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {seasons.map((season) => {
              const taskCompletionPercent = season.total_tasks && season.total_tasks > 0
                ? Math.round((season.completed_tasks || 0) / season.total_tasks * 100)
                : 0;

              return (
                <motion.div
                  layout
                  key={season.id}
                  className={cn(
                    "flex flex-col justify-between p-6 bg-white dark:bg-[#110A24]/30 border rounded-[2.5rem] transition-all shadow-sm",
                    season.is_default === 1
                      ? "border-[#7C3AED]/40 dark:border-violet-500/40 ring-4 ring-[#7C3AED]/5 dark:ring-violet-500/5 shadow-md"
                      : "border-[#7C3AED]/10 dark:border-violet-500/10 hover:border-[#7C3AED]/30 dark:hover:border-violet-500/30"
                  )}
                >
                  <div className="space-y-4">
                    {/* Badge header */}
                    <div className="flex justify-between items-center">
                      <span className={cn(
                        "px-3 py-1 text-[9px] font-black rounded-full uppercase tracking-wider",
                        season.status === 'Active' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                          season.status === 'Archived' ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" :
                            "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                      )}>
                        {season.status}
                      </span>
                      <div className="flex gap-1.5">
                        {season.is_default === 1 && (
                          <span className="px-2 py-0.5 text-[9px] font-black bg-[#7C3AED] text-white rounded-md tracking-wider">DEFAULT</span>
                        )}
                        {season.is_locked === 1 && (
                          <span className="px-2 py-0.5 text-[9px] font-black bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 rounded-md flex items-center gap-1">
                            <Lock className="h-3 w-3" /> LOCKED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="text-lg font-black text-[#1E1B4B] dark:text-indigo-100">{season.name}</h3>
                      <p className="text-[10px] font-black text-[#7C3AED] dark:text-violet-400 uppercase tracking-widest mt-0.5">{season.type}</p>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-indigo-200/80 bg-slate-50 dark:bg-[#0E0820]/40 px-3 py-2.5 rounded-2xl border border-slate-100 dark:border-violet-500/5">
                      <Calendar className="h-4 w-4 text-[#7C3AED] dark:text-violet-400" />
                      <span>{formatDate(season.start_date)} – {formatDate(season.end_date)}</span>
                    </div>

                    {season.description && (
                      <p className="text-slate-500 dark:text-indigo-200/60 text-xs leading-relaxed line-clamp-2">{season.description}</p>
                    )}

                    {/* Simple Quick Stats */}
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-violet-500/5">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 dark:text-indigo-200/40 uppercase tracking-wider">Tasks</p>
                        <p className="text-base font-black text-[#1E1B4B] dark:text-indigo-100 mt-0.5">{season.total_tasks || 0}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 dark:text-indigo-200/40 uppercase tracking-wider">Completion</p>
                        <p className="text-base font-black text-[#1E1B4B] dark:text-indigo-100 mt-0.5">{taskCompletionPercent}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex justify-end gap-1.5 mt-6 pt-4 border-t border-slate-100 dark:border-violet-500/5">
                    {season.is_default !== 1 && (
                      <button
                        onClick={() => handleSetDefault(season)}
                        title="Set as Default active season"
                        className="p-2.5 text-slate-400 hover:text-[#7C3AED] bg-slate-50 dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 hover:border-[#7C3AED]/20 rounded-xl transition-all cursor-pointer"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleLock(season)}
                      title={season.is_locked === 1 ? "Unlock season" : "Lock season"}
                      className="p-2.5 text-slate-400 hover:text-amber-500 bg-slate-50 dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 hover:border-amber-500/20 rounded-xl transition-all cursor-pointer"
                    >
                      {season.is_locked === 1 ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => openEditModal(season)}
                      title="Edit settings"
                      className="p-2.5 text-slate-400 hover:text-[#7C3AED] bg-slate-50 dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 hover:border-slate-300 dark:hover:border-violet-500/30 rounded-xl transition-all cursor-pointer"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {season.is_default !== 1 && (
                      <button
                        onClick={() => handleDelete(season.id)}
                        title="Delete season"
                        className="p-2.5 text-slate-400 hover:text-rose-500 bg-slate-50 dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 hover:border-rose-500/20 rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* SIDE BY SIDE COMPARISON PANEL */}
          <div className="bg-white/80 dark:bg-[#110A24]/30 border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-[2.5rem] p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-2xl font-black text-[#1E1B4B] dark:text-white flex items-center gap-3 font-display">
                <TrendingUp className="h-6 w-6 text-[#7C3AED] dark:text-violet-400" />
                Season Performance Comparison
              </h2>
              <p className="text-slate-500 dark:text-indigo-200/60 mt-1 text-sm font-semibold">
                Select two academic periods to compare task creation volumes, execution completion efficiency, and average response times.
              </p>
            </div>

            {/* Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CustomSelect
                label="Season A"
                value={compareSeasonA}
                onChange={(val) => setCompareSeasonA(val ? parseInt(val.toString()) : '')}
                options={seasons.map(s => ({ value: s.id, label: s.name }))}
                placeholder="Select Season"
              />
              <CustomSelect
                label="Season B"
                value={compareSeasonB}
                onChange={(val) => setCompareSeasonB(val ? parseInt(val.toString()) : '')}
                options={seasons.map(s => ({ value: s.id, label: s.name }))}
                placeholder="Select Season"
              />
            </div>

            {/* Comparison Details */}
            {seasonAData && seasonBData ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100 dark:border-violet-500/5">
                {/* Metric 1: Total Tasks */}
                <div className="bg-slate-50 dark:bg-[#0E0820]/30 border border-[#7C3AED]/10 dark:border-violet-500/10 p-5 rounded-3xl text-center space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#4C1D95]/60 dark:text-indigo-200/50">Total Tasks Created</span>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div>
                      <p className="text-[10px] text-[#7C3AED] dark:text-violet-400 font-black truncate">{seasonAData.name}</p>
                      <p className="text-xl font-black text-[#1E1B4B] dark:text-white mt-1">{seasonAData.total_tasks || 0}</p>
                    </div>
                    <div className="border-l border-slate-200 dark:border-violet-500/10">
                      <p className="text-[10px] text-pink-500 dark:text-pink-400 font-black truncate">{seasonBData.name}</p>
                      <p className="text-xl font-black text-[#1E1B4B] dark:text-white mt-1">{seasonBData.total_tasks || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Metric 2: Completion Rate */}
                <div className="bg-slate-50 dark:bg-[#0E0820]/30 border border-[#7C3AED]/10 dark:border-violet-500/10 p-5 rounded-3xl text-center space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#4C1D95]/60 dark:text-indigo-200/50">Task Completion Rate</span>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div>
                      <p className="text-[10px] text-[#7C3AED] dark:text-violet-400 font-black truncate">{seasonAData.name}</p>
                      <p className="text-xl font-black text-[#1E1B4B] dark:text-white mt-1">
                        {seasonAData.total_tasks && seasonAData.total_tasks > 0
                          ? Math.round((seasonAData.completed_tasks || 0) / seasonAData.total_tasks * 100)
                          : 0}%
                      </p>
                    </div>
                    <div className="border-l border-slate-200 dark:border-violet-500/10">
                      <p className="text-[10px] text-pink-500 dark:text-pink-400 font-black truncate">{seasonBData.name}</p>
                      <p className="text-xl font-black text-[#1E184B] dark:text-white mt-1">
                        {seasonBData.total_tasks && seasonBData.total_tasks > 0
                          ? Math.round((seasonBData.completed_tasks || 0) / seasonBData.total_tasks * 100)
                          : 0}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Metric 3: Avg Response Hours */}
                <div className="bg-slate-50 dark:bg-[#0E0820]/30 border border-[#7C3AED]/10 dark:border-violet-500/10 p-5 rounded-3xl text-center space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#4C1D95]/60 dark:text-indigo-200/50">Avg Evaluation Duration</span>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div>
                      <p className="text-[10px] text-[#7C3AED] dark:text-violet-400 font-black truncate">{seasonAData.name}</p>
                      <p className="text-xl font-black text-[#1E1B4B] dark:text-white mt-1">
                        {seasonAData.avg_response_hours !== null && seasonAData.avg_response_hours !== undefined
                          ? `${seasonAData.avg_response_hours}h`
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="border-l border-slate-200 dark:border-violet-500/10">
                      <p className="text-[10px] text-pink-500 dark:text-pink-400 font-black truncate">{seasonBData.name}</p>
                      <p className="text-xl font-black text-[#1E1B4B] dark:text-white mt-1">
                        {seasonBData.avg_response_hours !== null && seasonBData.avg_response_hours !== undefined
                          ? `${seasonBData.avg_response_hours}h`
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 items-center text-xs font-bold text-slate-400 dark:text-indigo-200/60 bg-slate-50 dark:bg-[#0E0820]/30 border border-slate-100 dark:border-violet-500/10 p-4 rounded-3xl">
                <Info className="h-4 w-4 text-[#7C3AED] dark:text-violet-400" />
                Please select both Season A and Season B in the dropdowns to compute performance comparison statistics.
              </div>
            )}
          </div>
        </>
      )}

      {/* CREATE / EDIT MODAL */}
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
              className="relative bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-[2rem] sm:rounded-[2.5rem] w-[95%] max-w-xl p-5 sm:p-7 md:p-8 shadow-2xl z-10 max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 sm:h-2 bg-[#7C3AED] rounded-t-[2rem] sm:rounded-t-[2.5rem]" />

              <div className="flex justify-between items-center mb-4 sm:mb-6 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#7C3AED]/10 dark:bg-violet-500/20 text-[#7C3AED] dark:text-violet-400 rounded-xl">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-2xl font-black text-[#1E1B4B] dark:text-indigo-100">{editingSeason ? 'Edit Academic Season' : 'Create Academic Season'}</h2>
                    <p className="text-[10px] sm:text-xs font-bold text-[#4C1D95]/60 dark:text-violet-400/60 mt-0.5">Configure time cycles and properties of the session period.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 sm:p-3 hover:bg-slate-100 dark:hover:bg-violet-950/40 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6 text-[#1E1B4B]/40 dark:text-violet-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                {/* Scrollable Fields Container */}
                <div className="space-y-4 sm:space-y-5 overflow-y-auto flex-1 pr-3 py-1 -mr-2 max-h-[60vh] sm:max-h-[65vh]">

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Season Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Odd Semester 2026, Academic Year 2026 - 2027"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-5 py-3 sm:py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Start Date</label>
                      <DateTimePicker
                        value={startDate}
                        onChange={(val) => setStartDate(val)}
                        required
                        dateOnly
                        onOpenChange={setIsDatePickerOpen}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">End Date</label>
                      <DateTimePicker
                        value={endDate}
                        onChange={(val) => setEndDate(val)}
                        required
                        dateOnly
                        align="right"
                        onOpenChange={setIsDatePickerOpen}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <CustomSelect
                      label="Cycle Type"
                      value={type}
                      onChange={(val) => setType(val as any)}
                      options={[
                        { value: 'Semester', label: 'Semester' },
                        { value: 'Academic Year', label: 'Academic Year' },
                        { value: 'Custom', label: 'Custom' }
                      ]}
                    />

                    <CustomSelect
                      label="Status"
                      value={status}
                      onChange={(val) => setStatus(val as any)}
                      options={[
                        { value: 'Active', label: 'Active' },
                        { value: 'Inactive', label: 'Inactive' },
                        { value: 'Archived', label: 'Archived' }
                      ]}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Description (Optional)</label>
                    <textarea
                      rows={2}
                      placeholder="Enter details about this semester/year cycle."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-5 py-3 sm:py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100 resize-none"
                    />
                  </div>

                  {/* Toggles changed to beautiful custom checkboxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div
                      onClick={() => setIsDefault(!isDefault)}
                      className="flex items-center gap-4 bg-slate-50 dark:bg-[#1A0F35]/30 px-5 py-3 rounded-2xl border border-slate-200 dark:border-violet-500/20 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-[#1A0F35]/50 transition-all select-none"
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0",
                        isDefault
                          ? "bg-[#7C3AED] border-[#7C3AED] text-white"
                          : "border-slate-300 dark:border-violet-500/40 text-transparent"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest block">Set as Default</span>
                        <span className="text-[9px] text-slate-400 dark:text-indigo-200/40 font-bold leading-tight block mt-0.5">Auto-assigned context</span>
                      </div>
                    </div>

                    <div
                      onClick={() => setIsLocked(!isLocked)}
                      className="flex items-center gap-4 bg-slate-50 dark:bg-[#1A0F35]/30 px-5 py-3 rounded-2xl border border-slate-200 dark:border-violet-500/20 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-[#1A0F35]/50 transition-all select-none"
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0",
                        isLocked
                          ? "bg-[#7C3AED] border-[#7C3AED] text-white"
                          : "border-slate-300 dark:border-violet-500/40 text-transparent"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest block">Lock Season</span>
                        <span className="text-[9px] text-slate-400 dark:text-indigo-200/40 font-bold leading-tight block mt-0.5">Disables writes & edits</span>
                      </div>
                    </div>
                  </div>

                  {/* CLONING PANEL (For creation mode only) */}
                  {!editingSeason && seasons.length > 0 && (
                    <div className="bg-[#7C3AED]/5 dark:bg-[#1A0F35]/50 border border-[#7C3AED]/10 dark:border-violet-500/20 p-4 sm:p-5 rounded-2xl space-y-4">
                      <h4 className="text-[10px] font-black text-[#7C3AED] dark:text-violet-400 uppercase tracking-widest flex items-center gap-2">
                        <Copy className="h-4 w-4" />
                        Clone Setup Settings
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                        <CustomSelect
                          label="Clone Tasks From"
                          value={cloneFrom}
                          onChange={(val) => setCloneFrom(val.toString())}
                          options={[
                            { value: '', label: 'Do not clone' },
                            ...seasons.map(s => ({ value: s.id, label: s.name }))
                          ]}
                        />
                        {cloneFrom && (
                          <div
                            onClick={() => setCloneTasks(!cloneTasks)}
                            className="flex items-center gap-4 bg-slate-50 dark:bg-[#1A0F35]/30 px-5 py-3 rounded-2xl border border-slate-200 dark:border-violet-500/20 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-[#1A0F35]/50 transition-all select-none"
                          >
                            <div className={cn(
                              "w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0",
                              cloneTasks
                                ? "bg-[#7C3AED] border-[#7C3AED] text-white"
                                : "border-slate-300 dark:border-violet-500/40 text-transparent"
                            )}>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                            <div>
                              <span className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest block">Clone Tasks</span>
                              <span className="text-[9px] text-slate-400 dark:text-indigo-200/40 font-bold leading-tight block mt-0.5">Clone tasks as drafts</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dynamic spacer to push form elements when DateTimePicker is open, avoiding overlap and enabling scroll */}
                  <div className={cn("transition-all duration-300", isDatePickerOpen ? "h-[320px]" : "h-0")} />

                </div>

                {/* Fixed Footer Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 sm:pt-5 border-t border-slate-100 dark:border-violet-500/10 flex-shrink-0 mt-4 sm:mt-5">
                  <button
                    type="submit"
                    className="flex-1 py-3 sm:py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl font-black shadow-xl shadow-purple-500/20 transition-all uppercase tracking-widest text-xs cursor-pointer animate-none"
                  >
                    {editingSeason ? 'Update Protocol' : 'Initialize Season'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-8 py-3 sm:py-4 bg-slate-100 dark:bg-violet-950/60 hover:bg-slate-200 dark:hover:bg-violet-900/60 text-[#1E1B4B] dark:text-indigo-200 rounded-2xl font-black transition-all uppercase tracking-widest text-xs cursor-pointer"
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
};

export default AcademicSeasons;
