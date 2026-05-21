import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Download,
  Filter,
  PieChart as PieChartIcon,
  Award,
  ArrowUpRight,
  Target,
  ChevronRight,
  Calendar,
  Layers,
  Tag,
  Search,
  Activity,
  History,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';
import { cn } from '@/lib/utils';
import { AdvancedTracking } from './AdvancedTracking';

interface Stats {
  total_tasks: number;
  completed_tasks: number;
  active_tasks: number;
  overdue_tasks: number;
  pending_review: number;
}

interface FacultyPerf {
  id: number;
  name: string;
  email: string;
  profile_pic: string | null;
  total_points: number;
  tasks_completed: number;
  active_load: number;
  on_time_count: number;
  late_count: number;
}

interface Distribution {
  name: string;
  value: number;
}

interface PendingWork {
  faculty_name: string;
  profile_pic: string | null;
  task_title: string;
  category: string;
  priority: string;
  deadline: string;
  assignment_status: string;
  progress: number;
}

const Reports: React.FC = () => {
  const [data, setData] = useState<{
    stats: Stats;
    faculty_performance: FacultyPerf[];
    category_distribution: Distribution[];
    rework_stats: { total_reviews: number; rework_count: number };
    trend: { month: string; count: number }[];
    pending_list: PendingWork[];
  } | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeReportTab, setActiveReportTab] = useState<'overview' | 'pending' | 'workload' | 'categories' | 'advanced_tracking'>('overview');
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [facultyFilter, setFacultyFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/reports.php`, {
        credentials: 'include'
      });
      const json = await response.json();
      if (json.status === 'success') {
        setData(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateCompletionRate = () => {
    if (!data || data.stats.total_tasks === 0) return 0;
    return Math.round((data.stats.completed_tasks / data.stats.total_tasks) * 100);
  };

  const getReworkRate = () => {
    if (!data || !data.rework_stats || data.rework_stats.total_reviews === 0) return 0;
    return Math.round((data.rework_stats.rework_count / data.rework_stats.total_reviews) * 100);
  };

  const getFilteredPending = () => {
    if (!data) return [];
    return data.pending_list.filter(p => {
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
      const matchesFaculty = facultyFilter === 'All' || p.faculty_name === facultyFilter;
      const matchesPriority = priorityFilter === 'All' || p.priority === priorityFilter;
      const matchesSearch = p.task_title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.faculty_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesFaculty && matchesPriority && matchesSearch;
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] rounded-full animate-spin" />
        <p className="text-xs font-black text-[#1E184B] uppercase tracking-[0.2em] animate-pulse">Analyzing Departmental Intelligence...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-10 pb-20">
      <SEO title="Mission Intelligence" description="Advanced departmental analytics and performance reports." />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#1E184B] tracking-tight">Mission Intelligence</h1>
          <p className="text-[#1E184B]/60 mt-1 font-bold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#7C3AED]" />
            Strategic analysis of departmental productivity and performance.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto scrollbar-hide shrink-0">
          {[
            { id: 'overview', label: 'Overview', icon: Target },
            { id: 'pending', label: 'Pending Intel', icon: AlertCircle },
            { id: 'workload', label: 'Workload', icon: Users },
            { id: 'categories', label: 'Categories', icon: Tag },
            { id: 'advanced_tracking', label: 'Advanced Tracking', icon: Activity },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap",
                activeReportTab === tab.id ? "bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/20" : "text-slate-400 hover:bg-slate-50 hover:text-[#1E184B]"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeReportTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="space-y-10"
          >
            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Efficiency Index', value: `${calculateCompletionRate()}%`, sub: 'Operational speed', icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                { label: 'Rework Required', value: `${getReworkRate()}%`, sub: 'Quality assessment', icon: History, color: 'text-amber-500', bg: 'bg-amber-50' },
                { label: 'Critical Overdue', value: data.stats.overdue_tasks, sub: 'Immediate attention', icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-50' },
                { label: 'Active Load', value: data.stats.active_tasks, sub: 'Missions in field', icon: Activity, color: 'text-[#7C3AED]', bg: 'bg-[#7C3AED]/5' }
              ].map((kpi, i) => (
                <div key={kpi.label} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-bl-[4rem] transition-all group-hover:scale-110", kpi.bg)} />
                  <kpi.icon className={cn("w-6 h-6 mb-6 relative z-10", kpi.color)} />
                  <div className="relative z-10">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</h4>
                    <p className="text-3xl font-black text-[#1E184B]">{kpi.value}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-2 flex items-center gap-1">{kpi.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 space-y-10">
                {/* Faculty Performance Table */}
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="text-lg font-black text-[#1E184B] flex items-center gap-3">
                      <Award className="w-5 h-5 text-amber-500" />
                      Elite Faculty Ranking
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Faculty Member</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Completed</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Adherence</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Intel Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {data.faculty_performance.slice(0, 5).map((faculty) => {
                          const adherence = faculty.tasks_completed > 0 
                            ? Math.round((faculty.on_time_count / faculty.tasks_completed) * 100)
                            : 0;
                          return (
                            <tr key={faculty.id} className="hover:bg-slate-50/50 transition-all group">
                              <td className="px-8 py-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                    {faculty.profile_pic ? (
                                      <img src={`${import.meta.env.VITE_API_URL}/${faculty.profile_pic}`} alt={faculty.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center font-black text-slate-400 text-xs">{faculty.name.charAt(0)}</div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-black text-[#1E184B]">{faculty.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 italic">Faculty Lead</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-5 text-center font-black text-xs text-[#1E184B]">{faculty.tasks_completed}</td>
                              <td className="px-8 py-5">
                                <div className="flex flex-col items-center gap-1">
                                  <span className={cn(
                                    "text-[10px] font-black",
                                    adherence >= 80 ? "text-emerald-500" : adherence >= 50 ? "text-amber-500" : "text-rose-500"
                                  )}>{adherence}%</span>
                                  <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={cn("h-full", adherence >= 80 ? "bg-emerald-500" : adherence >= 50 ? "bg-amber-500" : "bg-rose-500")} style={{width: `${adherence}%`}} />
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-5 text-right font-black text-sm text-[#7C3AED]">{faculty.total_points || 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Completion Trend */}
                <div className="bg-[#1E184B] p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                  <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#7C3AED]/10 rounded-full blur-[100px] group-hover:scale-125 transition-all duration-1000" />
                  <h3 className="text-xl font-black text-white mb-10 flex items-center gap-3 relative z-10">
                    <TrendingUp className="w-6 h-6 text-[#7C3AED]" />
                    Productivity Timeline
                  </h3>
                  <div className="flex items-end justify-between h-48 gap-4 relative z-10">
                    {data.trend.map((t, i) => {
                      const maxVal = Math.max(...data.trend.map(x => x.count), 1);
                      const height = (t.count / maxVal) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-4 group/bar">
                          <div className="relative w-full h-full flex items-end">
                            <motion.div 
                              initial={{ height: 0 }} animate={{ height: `${height}%` }}
                              className="w-full bg-[#7C3AED]/40 rounded-t-xl group-hover/bar:bg-[#7C3AED] transition-all relative"
                            >
                              <div className="absolute inset-x-0 top-0 h-1.5 bg-[#7C3AED] brightness-125 rounded-t-xl" />
                            </motion.div>
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[9px] font-black text-white opacity-0 group-hover/bar:opacity-100 transition-all">{t.count} Missions</div>
                          </div>
                          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest rotate-45 lg:rotate-0">{t.month}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sidebar: Categories */}
              <div className="space-y-10">
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-black text-[#1E184B] mb-8 flex items-center gap-3">
                    <Tag className="w-5 h-5 text-indigo-500" />
                    Mission Categories
                  </h3>
                  <div className="space-y-6">
                    {data.category_distribution.map((cat) => {
                      const percentage = (cat.value / data.stats.total_tasks) * 100;
                      return (
                        <div key={cat.name} className="space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className="text-[#1E184B]">{cat.name}</span>
                            <span className="text-slate-400">{cat.value}</span>
                          </div>
                          <div className="h-3 bg-slate-50 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} className="h-full bg-indigo-500 rounded-full" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-xl shadow-indigo-200 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Layers className="w-24 h-24 rotate-12" /></div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-2">Efficiency Rating</h4>
                  <p className="text-3xl font-black mb-4">Strategic</p>
                  <p className="text-[11px] font-medium text-indigo-100 leading-relaxed">The department is currently maintaining a "Strategic" efficiency level with a {calculateCompletionRate()}% success rate.</p>
                  <button onClick={() => setActiveReportTab('pending')} className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 py-3 px-6 rounded-xl transition-all">
                    Resolve Blockers <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeReportTab === 'pending' && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-10"
          >
            {/* Multi-Filters */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search faculty or mission name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold text-[#1E184B] focus:ring-4 focus:ring-[#7C3AED]/5 transition-all outline-none"
                />
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-6 py-4 bg-slate-50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#1E184B] outline-none cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  {data.category_distribution.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <select 
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-6 py-4 bg-slate-50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#1E184B] outline-none cursor-pointer"
                >
                  <option value="All">All Priority</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            {/* Pending List Intelligence */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {getFilteredPending().length > 0 ? (
                getFilteredPending().map((pending, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    key={i} 
                    className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
                  >
                    <div className={cn(
                      "absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[8px] font-black uppercase tracking-widest",
                      pending.priority === 'Critical' ? 'bg-rose-500 text-white' : 
                      pending.priority === 'High' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'
                    )}>
                      {pending.priority}
                    </div>
                    
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 shadow-inner">
                        {pending.profile_pic ? (
                          <img src={`${import.meta.env.VITE_API_URL}/${pending.profile_pic}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-black text-slate-300">{pending.faculty_name.charAt(0)}</div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-black text-[#1E184B]">{pending.faculty_name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{pending.category}</p>
                      </div>
                    </div>

                    <h4 className="text-sm font-black text-[#1E184B] mb-4 group-hover:text-[#7C3AED] transition-colors">{pending.task_title}</h4>
                    
                    <div className="space-y-4 pt-6 border-t border-slate-50">
                      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-indigo-600">{pending.progress}%</span>
                      </div>
                      <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pending.progress}%` }} className="h-full bg-[#7C3AED] rounded-full" />
                      </div>
                      <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          Due {formatDate(pending.deadline)}
                        </div>
                        <div className="flex items-center gap-1.5 italic">
                          {pending.assignment_status}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-20 bg-white rounded-[3rem] border border-dashed border-slate-200 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                    <Search className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-[#1E184B]/30 uppercase tracking-widest">No matching pending missions</h3>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeReportTab === 'workload' && (
          <motion.div
            key="workload"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {data.faculty_performance.map((faculty, i) => (
              <div key={faculty.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative group overflow-hidden">
                <div className="flex items-center gap-5 mb-8">
                  <div className="w-14 h-14 rounded-[1.2rem] overflow-hidden bg-slate-50 border border-slate-100">
                    {faculty.profile_pic ? (
                      <img src={`${import.meta.env.VITE_API_URL}/${faculty.profile_pic}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-slate-300 text-lg">{faculty.name.charAt(0)}</div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-base font-black text-[#1E184B]">{faculty.name}</h4>
                    <p className="text-[9px] font-black text-[#7C3AED] uppercase tracking-widest">{faculty.active_load} Active Missions</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">On-Time</p>
                    <p className="text-xl font-black text-emerald-500">{faculty.on_time_count}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Delayed</p>
                    <p className="text-xl font-black text-rose-500">{faculty.late_count}</p>
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                   <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                     <span>Capacity Usage</span>
                     <span>{Math.min(100, faculty.active_load * 20)}%</span>
                   </div>
                   <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                     <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        faculty.active_load >= 5 ? "bg-rose-500" : faculty.active_load >= 3 ? "bg-amber-500" : "bg-[#7C3AED]"
                      )} 
                      style={{width: `${Math.min(100, faculty.active_load * 20)}%`}} 
                    />
                   </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeReportTab === 'categories' && (
          <motion.div
            key="categories"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {data.category_distribution.map((cat, i) => (
              <div key={cat.name} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:border-[#7C3AED]/20 transition-all">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-[#7C3AED]/5 transition-all">
                  <Tag className="w-8 h-8 text-[#7C3AED]" />
                </div>
                <h4 className="text-sm font-black text-[#1E184B] mb-2">{cat.name}</h4>
                <p className="text-3xl font-black text-[#7C3AED]">{cat.value}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Total Missions</p>
              </div>
            ))}
          </motion.div>
        )}

        {activeReportTab === 'advanced_tracking' && (
          <motion.div
            key="advanced_tracking"
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
          >
            <AdvancedTracking />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Reports;
