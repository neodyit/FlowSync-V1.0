import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, 
  CheckSquare, 
  Clock, 
  Target, 
  PlusCircle, 
  Calendar, 
  ShieldCheck, 
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Zap,
  BookOpen,
  Award,
  ChevronDown,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import SEO from '@/components/SEO';
import { cn, formatDate } from '@/lib/utils';
import { getAppName } from '../../utils/config';

interface FacultyStats {
  total_points: number;
  month_points: number;
  active_tasks: number;
  completed_tasks: number;
  pending_reviews: number;
  merit_goal: number;
  goal_progress: number;
}

interface Activity {
  title: string;
  status: string;
  updated_at: string;
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

const FacultyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const appName = getAppName();
  const [stats, setStats] = useState<FacultyStats>({
    total_points: 0,
    month_points: 0,
    active_tasks: 0,
    completed_tasks: 0,
    pending_reviews: 0,
    merit_goal: 100,
    goal_progress: 0
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/faculty_stats.php`, {
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
    { label: 'Total Merit', value: stats.total_points, icon: Trophy, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20', trend: 'Lifetime Earnings' },
    { label: 'Completed', value: stats.completed_tasks, icon: Award, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20', trend: 'Missions Finalized' },
    { label: 'Active Missions', value: stats.active_tasks, icon: Zap, color: 'text-[#7C3AED] dark:text-violet-400', bg: 'bg-[#7C3AED]/5 dark:bg-violet-950/20', trend: 'Current Focus' },
    { label: 'Monthly Goal', value: `${stats.goal_progress}%`, icon: Target, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/20', trend: 'Merit Progress' },
  ];

  const quickActions = [
    { name: 'My Missions', icon: CheckSquare, path: '/faculty/tasks', color: 'bg-[#7C3AED]', desc: 'Manage assigned tasks' },
    { name: 'Calendar', icon: Calendar, path: '/faculty/tasks', color: 'bg-blue-600', desc: 'Deadlines & office hours' },
    { name: 'Resources', icon: BookOpen, path: '/faculty/settings', color: 'bg-slate-800', desc: 'Academic materials' },
    { name: 'Profile Settings', icon: ShieldCheck, path: '/faculty/settings', color: 'bg-rose-600', desc: 'Account & Security' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <SEO title="Faculty Mission Control" description={`Personalized mission tracking and merit overview for ${appName} Faculty.`} />
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[#7C3AED] dark:text-violet-400 mb-2">
            <Zap className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {formatDate(new Date())}
            </span>
          </div>
          <h1 className="text-4xl font-black text-[#1E184B] dark:text-indigo-100 tracking-tight">Mission Control</h1>
          <p className="text-[#1E184B]/40 dark:text-violet-400/60 font-bold mt-1">Accelerate your academic impact and track your progress.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {/* Season Selector */}
          {seasons.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-[#7C3AED] dark:text-violet-400 uppercase tracking-widest">Active Season:</span>
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
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest">Month Points</p>
            <p className="text-xl font-black text-[#1E184B] dark:text-indigo-100">{stats.month_points} <span className="text-xs text-slate-300 dark:text-violet-500/40">/ {stats.merit_goal}</span></p>
          </div>
          <button 
            onClick={() => navigate('/faculty/tasks')}
            className="flex items-center gap-3 px-6 py-3 bg-[#7C3AED] text-white rounded-2xl font-black text-sm shadow-xl shadow-[#7C3AED]/20 hover:scale-105 transition-all active:scale-95 whitespace-nowrap"
          >
            <PlusCircle className="w-5 h-5" />
            Active Missions
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
              className="bg-white dark:bg-[#1A0F35]/80 p-6 rounded-[2rem] border border-[#7C3AED]/10 dark:border-violet-500/15 shadow-sm group hover:shadow-2xl hover:shadow-[#7C3AED]/5 dark:hover:shadow-violet-500/[0.03] transition-all relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className={cn("p-3 rounded-2xl", stat.bg)}>
                  <Icon className={cn("w-6 h-6", stat.color)} />
                </div>
                <TrendingUp className="w-4 h-4 text-slate-200 dark:text-violet-500/20 group-hover:text-[#7C3AED]/20 dark:group-hover:text-violet-400/20 transition-colors" />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black text-[#1E184B]/40 dark:text-violet-400/50 uppercase tracking-[0.2em]">{stat.label}</p>
                <h3 className="text-3xl font-black text-[#1E184B] dark:text-indigo-100 mt-1">{isLoading ? '...' : stat.value}</h3>
                <p className="text-[9px] font-bold text-slate-400 dark:text-violet-400/40 mt-2 flex items-center gap-1">
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
          <h2 className="text-xl font-black text-[#1E184B] dark:text-indigo-100 flex items-center gap-3">
            Navigation
            <span className="h-px flex-1 bg-[#7C3AED]/10 dark:bg-violet-500/10" />
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
                  className="group flex items-center gap-5 p-5 bg-white dark:bg-[#1A0F35]/80 border border-slate-100 dark:border-violet-500/15 rounded-3xl hover:border-[#7C3AED]/30 dark:hover:border-violet-400/40 hover:shadow-xl hover:shadow-[#7C3AED]/5 transition-all text-left"
                >
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 group-hover:scale-110 transition-transform", action.color)}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[#1E184B] dark:text-indigo-100">{action.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-violet-400/60 mt-0.5 line-clamp-1">{action.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-200 dark:text-violet-500/30 group-hover:text-[#7C3AED] dark:group-hover:text-violet-400 group-hover:translate-x-1 transition-all ml-auto" />
                </motion.button>
              );
            })}
          </div>

          {/* Goal Progress Section */}
          <div className="bg-[#1E184B] dark:bg-[#150B30] border border-transparent dark:border-violet-500/20 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1">
                <h3 className="text-lg font-black tracking-tight mb-2 text-rose-400 uppercase tracking-widest text-xs">Monthly Merit Goal</h3>
                <h2 className="text-3xl font-black mb-4">{stats.goal_progress}% of target reached</h2>
                <p className="text-white/40 dark:text-violet-400/60 text-xs font-bold mb-6 max-w-sm">Achieve your monthly goal to climb the departmental leaderboard and earn prestige badges.</p>
                <div className="h-4 w-full bg-white/10 dark:bg-white/5 rounded-full overflow-hidden p-1 border border-white/5 dark:border-violet-500/10">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${Math.min(stats.goal_progress, 100)}%` }} 
                    className="h-full bg-gradient-to-r from-[#7C3AED] to-rose-500 rounded-full shadow-lg shadow-[#7C3AED]/20" 
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </div>
                <div className="flex justify-between mt-3 text-[10px] font-black text-white/20 uppercase tracking-widest">
                  <span>Current: {stats.month_points} Points</span>
                  <span>Target: {stats.merit_goal} Points</span>
                </div>
              </div>
              <div className="w-32 h-32 rounded-full border-8 border-white/5 flex items-center justify-center relative shrink-0">
                <Trophy className="w-12 h-12 text-rose-500" />
                <div className="absolute inset-0 border-8 border-rose-500 rounded-full border-t-transparent animate-spin-slow opacity-20" />
              </div>
            </div>
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-[#7C3AED]/10 rounded-full blur-3xl" />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-[#1E184B] dark:text-indigo-100 flex items-center gap-3">
            Mission Timeline
            <span className="h-px flex-1 bg-[#7C3AED]/10 dark:bg-violet-500/10" />
          </h2>
          <div className="bg-white dark:bg-[#1A0F35]/80 rounded-[2.5rem] border border-[#7C3AED]/10 dark:border-violet-500/15 overflow-hidden">
            <div className="p-6">
              {activities.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-[#110A24] rounded-2xl flex items-center justify-center mx-auto">
                    <CheckSquare className="w-6 h-6 text-slate-200" />
                  </div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No Missions Logged</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {activities.map((activity, idx) => (
                    <div key={idx} className="flex gap-4 group cursor-pointer" onClick={() => navigate('/faculty/tasks')}>
                      <div className="relative">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 dark:border-violet-500/10 transition-all group-hover:border-[#7C3AED]/30 dark:group-hover:border-violet-400/40 shadow-sm",
                          activity.status === 'Completed' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500' : 
                          activity.status === 'Under Review' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-500' : 'bg-blue-50 dark:bg-blue-950/20 text-blue-500'
                        )}>
                          {activity.status === 'Completed' ? <ShieldCheck className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </div>
                        {idx !== activities.length - 1 && (
                          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-px h-6 bg-slate-100 dark:bg-violet-500/10" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-[#1E184B] dark:text-indigo-100 truncate group-hover:text-[#7C3AED] dark:group-hover:text-violet-400 transition-colors">{activity.title}</p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-violet-400/50 mt-0.5 uppercase tracking-tighter">
                          Status: <span className="text-[#7C3AED]">{activity.status}</span>
                        </p>
                        <p className="text-[8px] font-black text-slate-300 dark:text-violet-500/40 mt-1 uppercase">
                          {formatDate(activity.updated_at)} at {new Date(activity.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button 
              onClick={() => navigate('/faculty/tasks')}
              className="w-full py-4 bg-slate-50 dark:bg-[#110A24]/40 border-t border-slate-100 dark:border-violet-500/10 text-[10px] font-black text-[#1E184B]/40 dark:text-violet-400/50 hover:text-[#7C3AED] dark:hover:text-violet-400 uppercase tracking-[0.2em] transition-all"
            >
              Full Mission Log
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;
