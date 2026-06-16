import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  CheckSquare, 
  Trophy, 
  Bell, 
  PlusCircle, 
  Send, 
  Building2, 
  ShieldCheck, 
  ArrowRight,
  Clock,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import SEO from '@/components/SEO';
import { cn, formatDate } from '@/lib/utils';

interface HODStats {
  total_faculty: number;
  active_tasks: number;
  pending_reviews: number;
  dept_points: number;
  task_completion_rate: number;
  research_output_rate: number;
}

interface Activity {
  title: string;
  status: string;
  updated_at: string;
  assigned_to: string | null;
}

interface CustomSelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: { value: string | number; label: string }[];
  className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ 
  value, onChange, options, className 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between gap-3 px-4 py-2.5 bg-white dark:bg-[#110A24] border rounded-2xl transition-all text-xs font-black text-[#1E1B4B] dark:text-[#A78BFA] cursor-pointer
          ${isOpen ? 'border-[#7C3AED] dark:border-violet-400 ring-4 ring-[#7C3AED]/5 dark:ring-violet-400/5' : 'border-[#7C3AED]/10 dark:border-violet-500/20 hover:border-[#7C3AED]/30 dark:hover:border-violet-400/40'}
        `}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : 'Select...'}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#7C3AED] dark:text-violet-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full right-0 w-56 mt-2 bg-white dark:bg-[#110A24] rounded-2xl border border-[#7C3AED]/10 dark:border-violet-500/20 shadow-2xl z-[150] overflow-hidden py-2"
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
                    w-full px-5 py-3 text-left text-xs font-black transition-all flex items-center justify-between cursor-pointer
                    ${opt.value.toString() === value.toString() ? 'bg-[#7C3AED] dark:bg-violet-600 text-white' : 'text-[#1E1B4B] dark:text-indigo-200 hover:bg-[#7C3AED]/5 dark:hover:bg-violet-950/40 hover:text-[#7C3AED] dark:hover:text-violet-300'}
                  `}
                >
                  {opt.label}
                  {opt.value.toString() === value.toString() && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const HODDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<HODStats>({
    total_faculty: 0,
    active_tasks: 0,
    pending_reviews: 0,
    dept_points: 0,
    task_completion_rate: 0,
    research_output_rate: 0
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);

  const fetchSeasons = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/academic_seasons.php`, { credentials: 'include' });
      const data = await res.json();
      if (data.status === 'success') {
        setSeasons(data.data);
        const getCookie = (name: string) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop()?.split(';').shift();
          return null;
        };
        const cookieVal = getCookie('active_season_id');
        if (cookieVal) {
          setActiveSeasonId(parseInt(cookieVal));
        } else {
          const defaultSeason = data.data.find((s: any) => s.is_default === 1);
          if (defaultSeason) {
            setActiveSeasonId(defaultSeason.id);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching seasons:', err);
    }
  };

  const handleSeasonChange = (id: number) => {
    document.cookie = `active_season_id=${id}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod_stats.php`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        setStats(data.data.stats);
        setActivities(data.data.recent_activity);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchSeasons();

    // Polling for stats every 10 seconds
    const interval = setInterval(() => {
      fetchStats();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const statCards = [
    { label: 'Total Faculty', value: stats.total_faculty, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', trend: 'Department Strength' },
    { label: 'Active Missions', value: stats.active_tasks, icon: CheckSquare, color: 'text-[#7C3AED]', bg: 'bg-[#7C3AED]/5', trend: 'Live Operations' },
    { label: 'Pending Reviews', value: stats.pending_reviews, icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50', trend: 'Needs Attention' },
    { label: 'Merit Points', value: stats.dept_points.toLocaleString(), icon: Trophy, color: 'text-emerald-500', bg: 'bg-emerald-50', trend: 'Dept. Performance' },
  ];

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const showBroadcast = user.features ? (user.features.task_broadcast !== false) : true;

  const quickActions = [
    { name: 'Assign Task', icon: PlusCircle, path: '/hod/tasks/new', color: 'bg-[#7C3AED]', desc: 'Direct mission assignment' },
    showBroadcast && { name: 'Broadcast', icon: Send, path: '/hod/tasks', color: 'bg-blue-600', desc: 'Alert all faculty members' },
    { name: 'Department', icon: Building2, path: '/hod/department', color: 'bg-slate-800', desc: 'View resource allocation' },
    { name: 'Portal Control', icon: ShieldCheck, path: '/hod/settings', color: 'bg-rose-600', desc: 'Security & preferences' },
  ].filter(Boolean) as { name: string; icon: any; path: string; color: string; desc: string }[];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <SEO title="HOD Strategic Dashboard" description="Departmental overview and strategic controls for FlowSync." />
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[#7C3AED] mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {formatDate(new Date())}
            </span>
          </div>
          <h1 className="text-4xl font-black text-[#1E184B] tracking-tight">Strategic Console</h1>
          <p className="text-[#1E184B]/40 font-bold mt-1">Commanding the academic flow of your department.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {/* Season Selector */}
          {seasons.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-widest">Active Season:</span>
              <CustomSelect
                value={activeSeasonId || ''}
                onChange={(val) => handleSeasonChange(parseInt(val.toString()))}
                options={seasons.map((s: any) => ({
                  value: s.id,
                  label: `${s.name}${s.is_locked === 1 ? ' 🔒' : ''}`
                }))}
              />
            </div>
          )}
          <button 
            onClick={() => navigate('/hod/tasks')}
            className="flex items-center gap-3 px-6 py-3 bg-[#7C3AED] text-white rounded-2xl font-black text-sm shadow-xl shadow-[#7C3AED]/20 hover:scale-105 transition-all active:scale-95 whitespace-nowrap"
          >
            <PlusCircle className="w-5 h-5" />
            Create New Mission
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={stat.label}
              className="bg-white p-6 rounded-[2rem] border border-[#7C3AED]/10 shadow-sm group hover:shadow-2xl hover:shadow-[#7C3AED]/5 transition-all relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className={cn("p-3 rounded-2xl", stat.bg)}>
                  <Icon className={cn("w-6 h-6", stat.color)} />
                </div>
                <TrendingUp className="w-4 h-4 text-slate-200 group-hover:text-[#7C3AED]/20 transition-colors" />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black text-[#1E184B]/40 uppercase tracking-[0.2em]">{stat.label}</p>
                <h3 className="text-3xl font-black text-[#1E184B] mt-1">{isLoading ? '...' : stat.value}</h3>
                <p className="text-[9px] font-bold text-slate-400 mt-2 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-500" />
                  {stat.trend}
                </p>
              </div>
              <div className={cn("absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-5 group-hover:scale-150 transition-transform duration-700", stat.bg)} />
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-black text-[#1E184B] flex items-center gap-3">
            Quick Actions
            <span className="h-px flex-1 bg-[#7C3AED]/10" />
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                  onClick={() => navigate(action.path)}
                  className="group flex items-center gap-5 p-5 bg-white border border-slate-100 rounded-3xl hover:border-[#7C3AED]/30 hover:shadow-xl hover:shadow-[#7C3AED]/5 transition-all text-left"
                >
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 group-hover:scale-110 transition-transform", action.color)}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[#1E184B]">{action.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 line-clamp-1">{action.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-200 group-hover:text-[#7C3AED] group-hover:translate-x-1 transition-all ml-auto" />
                </motion.button>
              );
            })}
          </div>

          {/* Department Performance */}
          <div className="bg-[#1E184B] rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-lg font-black tracking-tight mb-2">Institutional Excellence</h3>
              <p className="text-white/60 text-xs font-bold mb-6">Your department's quarterly target progress.</p>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest mb-2 text-white/40">
                    <span>Research Output</span>
                    <span>{stats.research_output_rate}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${stats.research_output_rate}%` }} 
                      className="h-full bg-blue-500" 
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest mb-2 text-white/40">
                    <span>Task Completion</span>
                    <span>{stats.task_completion_rate}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${stats.task_completion_rate}%` }} 
                      className="h-full bg-[#7C3AED]" 
                      transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-[#1E184B] flex items-center gap-3">
            Live Stream
            <span className="h-px flex-1 bg-[#7C3AED]/10" />
          </h2>
          <div className="bg-white rounded-[2.5rem] border border-[#7C3AED]/10 overflow-hidden">
            <div className="p-6">
              {activities.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto">
                    <Clock className="w-6 h-6 text-slate-200" />
                  </div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No Recent Activity</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {activities.map((activity, idx) => (
                    <div key={idx} className="flex gap-4 group cursor-pointer">
                      <div className="relative">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 transition-all group-hover:border-[#7C3AED]/30",
                          activity.status === 'Approved' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'
                        )}>
                          {activity.status === 'Approved' ? <Trophy className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </div>
                        {idx !== activities.length - 1 && (
                          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-px h-6 bg-slate-100" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-[#1E184B] truncate group-hover:text-[#7C3AED] transition-colors">{activity.title}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                          {activity.assigned_to || 'Unassigned'} • <span className="text-[#7C3AED]/60 uppercase">{activity.status}</span>
                        </p>
                        <p className="text-[8px] font-black text-slate-300 mt-1 uppercase tracking-tighter">
                          {formatDate(activity.updated_at)} at {new Date(activity.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button 
              onClick={() => navigate('/hod/tasks')}
              className="w-full py-4 bg-slate-50 border-t border-slate-100 text-[10px] font-black text-[#1E184B]/40 hover:text-[#7C3AED] uppercase tracking-[0.2em] transition-all"
            >
              View Mission Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HODDashboard;
