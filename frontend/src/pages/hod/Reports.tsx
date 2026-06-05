import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
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
  Activity,
  History,
  ArrowLeft,
  Search,
  AlertCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';
import { cn } from '@/lib/utils';
import { AdvancedTracking } from './AdvancedTracking';
import { useSearchParams } from 'react-router-dom';

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

interface TrendChartProps {
  trend: { month: string; count: number }[];
}

const TrendChart: React.FC<TrendChartProps> = ({ trend }) => {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  if (!trend || trend.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-[#1A1235]/40 rounded-3xl border border-[#7C3AED]/10">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">No productivity trend data available</p>
      </div>
    );
  }

  // If there's only one data point, duplicate it to draw a line
  const chartData = trend.length === 1 
    ? [trend[0], { ...trend[0], month: 'Next' }] 
    : trend;

  const width = 600;
  const height = 200;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...chartData.map(x => Number(x.count) || 0), 1);
  
  // Calculate points
  const points = chartData.map((d, i) => {
    const countVal = Number(d.count) || 0;
    const x = (i / (chartData.length - 1)) * chartWidth + paddingLeft;
    const y = chartHeight - (countVal / maxVal) * chartHeight + paddingTop;
    return { x, y, label: d.month, value: countVal };
  });

  // Construct path strings
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight + paddingTop} L ${points[0].x} ${chartHeight + paddingTop} Z`;

  // Grid values
  const gridLines = [0, 0.5, 1];

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        <defs>
          {/* Fill Gradient */}
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid Lines */}
        {gridLines.map((ratio, idx) => {
          const y = chartHeight - ratio * chartHeight + paddingTop;
          const gridVal = Math.round(ratio * maxVal);
          return (
            <g key={idx}>
              <line 
                x1={paddingLeft} 
                y1={y} 
                x2={width - paddingRight} 
                y2={y} 
                stroke="currentColor" 
                strokeWidth={1} 
                strokeDasharray="4 4" 
                className="stroke-slate-200 dark:stroke-slate-700/50"
              />
              <text 
                x={paddingLeft - 10} 
                y={y + 4} 
                fontSize="9" 
                fontWeight="bold"
                className="text-right fill-slate-400 dark:fill-white/30 font-mono"
                textAnchor="end"
              >
                {gridVal}
              </text>
            </g>
          );
        })}

        {/* Area below the line */}
        <motion.path 
          d={areaPath}
          fill="url(#chartGradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />

        {/* Main Line */}
        <motion.path 
          d={linePath}
          fill="none"
          stroke="#9F67FF"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.0, ease: "easeInOut" }}
        />

        {/* Dots and interactive zones */}
        {points.map((p, idx) => (
          <g 
            key={idx} 
            className="cursor-pointer"
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* Hover Indicator Vertical Line */}
            {hoveredIndex === idx && (
              <line 
                x1={p.x} 
                y1={paddingTop} 
                x2={p.x} 
                y2={chartHeight + paddingTop} 
                stroke="#7C3AED" 
                strokeWidth={1.5} 
                strokeDasharray="2 2"
                className="opacity-40"
              />
            )}

            {/* Glowing background for dot */}
            <circle 
              cx={p.x} 
              cy={p.y} 
              r={hoveredIndex === idx ? 8 : 0} 
              fill="#7C3AED" 
              className="opacity-30 transition-all duration-200" 
            />

            {/* Outer Circle */}
            <circle 
              cx={p.x} 
              cy={p.y} 
              r={hoveredIndex === idx ? 6 : 4} 
              fill="#9F67FF" 
              stroke="currentColor"
              strokeWidth={2}
              className="stroke-white dark:stroke-[#1E184B] transition-all duration-200"
            />

            {/* X Axis Label */}
            <text 
              x={p.x} 
              y={height - 5} 
              fontSize="9" 
              fontWeight="bold"
              className="fill-slate-400 dark:fill-white/30 uppercase tracking-widest text-center"
              textAnchor="middle"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Tooltip Overlay */}
      {hoveredIndex !== null && points[hoveredIndex] && (
        <div 
          className="absolute z-30 bg-white dark:bg-[#1A1235] text-[#1E184B] dark:text-white px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xl pointer-events-none transition-all duration-150"
          style={{
            left: `${(points[hoveredIndex].x / width) * 100}%`,
            top: `${(points[hoveredIndex].y / height) * 100 - 15}%`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">{points[hoveredIndex].label}</p>
          <p className="text-xs font-black text-[#7C3AED]">{points[hoveredIndex].value} Missions Completed</p>
        </div>
      )}
    </div>
  );
};

const Reports: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<{
    stats: Stats;
    faculty_performance: FacultyPerf[];
    category_distribution: Distribution[];
    rework_stats: { total_reviews: number; rework_count: number };
    trend: { month: string; count: number }[];
  } | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeReportTab, setActiveReportTab] = useState<'overview' | 'categories' | 'advanced_tracking' | 'personalized'>('overview');

  const [facultyData, setFacultyData] = useState<any[] | null>(null);
  const [isFacultyLoading, setIsFacultyLoading] = useState(false);
  const [selectedFacultyId, setSelectedFacultyId] = useState<number | null>(null);
  const [facultySearchQuery, setFacultySearchQuery] = useState('');
  const [personalizedSubTab, setPersonalizedSubTab] = useState<'tasks' | 'deadlines' | 'rewards'>('tasks');

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const facultyIdParam = searchParams.get('facultyId');
    
    if (tabParam && ['overview', 'categories', 'advanced_tracking', 'personalized'].includes(tabParam)) {
      setActiveReportTab(tabParam as any);
    }
    if (facultyIdParam) {
      setSelectedFacultyId(parseInt(facultyIdParam, 10));
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeReportTab === 'personalized' && !facultyData) {
      fetchFacultyData();
    }
  }, [activeReportTab, facultyData]);

  const fetchFacultyData = async () => {
    setIsFacultyLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/faculty.php`, {
        credentials: 'include'
      });
      const json = await response.json();
      if (json.status === 'success') {
        setFacultyData(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch faculty performance details:", error);
    } finally {
      setIsFacultyLoading(false);
    }
  };

  const handleTabChange = (tabId: any) => {
    setActiveReportTab(tabId);
    setSearchParams(tabId === 'personalized' && selectedFacultyId ? { tab: tabId, facultyId: selectedFacultyId.toString() } : { tab: tabId });
  };

  const handleSelectFaculty = (id: number) => {
    setSelectedFacultyId(id);
    setSearchParams({ tab: 'personalized', facultyId: id.toString() });
  };

  const handleBackToFacultyList = () => {
    setSelectedFacultyId(null);
    setSearchParams({ tab: 'personalized' });
  };

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
            { id: 'categories', label: 'Categories', icon: Tag },
            { id: 'advanced_tracking', label: 'Advanced Tracking', icon: Activity },
            { id: 'personalized', label: 'Personalized', icon: Award },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
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
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Faculty Member</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Completed</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Adherence</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Intel Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                        {data.faculty_performance.slice(0, 5).map((faculty) => {
                          const adherence = faculty.tasks_completed > 0 
                            ? Math.round((faculty.on_time_count / faculty.tasks_completed) * 100)
                            : 0;
                          return (
                            <tr key={faculty.id} className="hover:bg-slate-50/50 transition-all group">
                              <td className="px-8 py-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#1A1235] border border-slate-200 dark:border-slate-800">
                                    {faculty.profile_pic ? (
                                      <img src={`${import.meta.env.VITE_API_URL}/${faculty.profile_pic}`} alt={faculty.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center font-black text-slate-400 text-xs">{faculty.name.charAt(0)}</div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-black text-[#1E184B] dark:text-white">{faculty.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 italic">Faculty Lead</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-5 text-center font-black text-xs text-[#1E184B] dark:text-white">{faculty.tasks_completed}</td>
                              <td className="px-8 py-5">
                                <div className="flex flex-col items-center gap-1">
                                  <span className={cn(
                                    "text-[10px] font-black",
                                    adherence >= 80 ? "text-emerald-500" : adherence >= 50 ? "text-amber-500" : "text-rose-500"
                                  )}>{adherence}%</span>
                                  <div className="w-16 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className={cn("h-full", adherence >= 80 ? "bg-emerald-500" : adherence >= 50 ? "bg-amber-500" : "bg-rose-500")} style={{width: `${adherence}%`}} />
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-5 text-right font-black text-sm text-[#7C3AED] dark:text-[#A78BFA]">{faculty.total_points || 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card List View */}
                  <div className="block md:hidden divide-y divide-slate-50 dark:divide-slate-800/40">
                    {data.faculty_performance.slice(0, 5).map((faculty, idx) => {
                      const adherence = faculty.tasks_completed > 0 
                        ? Math.round((faculty.on_time_count / faculty.tasks_completed) * 100)
                        : 0;
                      return (
                        <div key={faculty.id} className="p-5 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-[10px] font-black text-slate-400 shrink-0">#{idx + 1}</span>
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#1A1235] border border-slate-200 dark:border-slate-800 shrink-0">
                              {faculty.profile_pic ? (
                                <img src={`${import.meta.env.VITE_API_URL}/${faculty.profile_pic}`} alt={faculty.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-black text-slate-400 text-xs">{faculty.name.charAt(0)}</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-[#1E184B] dark:text-white truncate">{faculty.name}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-[9px] font-bold text-slate-400">
                                <span>{faculty.tasks_completed} Done</span>
                                <span>•</span>
                                <span className={cn(
                                  "font-black",
                                  adherence >= 80 ? "text-emerald-500" : adherence >= 50 ? "text-amber-500" : "text-rose-500"
                                )}>{adherence}% Adherence</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right shrink-0">
                            <span className="text-xs font-black text-[#7C3AED] dark:text-[#A78BFA] block">{faculty.total_points || 0}</span>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mt-0.5">Intel Score</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Completion Trend */}
                <div className="bg-white dark:bg-[#1E184B] p-10 rounded-[3rem] border border-slate-100 dark:border-transparent shadow-sm dark:shadow-2xl relative overflow-hidden group">
                  <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#7C3AED]/5 dark:bg-[#7C3AED]/10 rounded-full blur-[100px] group-hover:scale-125 transition-all duration-1000" />
                  <h3 className="text-xl font-black text-[#1E184B] dark:text-white mb-10 flex items-center gap-3 relative z-10">
                    <TrendingUp className="w-6 h-6 text-[#7C3AED]" />
                    Productivity Timeline
                  </h3>
                  <div className="relative z-10 pt-4">
                    <TrendChart trend={data.trend} />
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
                </div>
              </div>
            </div>
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

        {activeReportTab === 'personalized' && (
          <motion.div
            key="personalized"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="space-y-10"
          >
            {isFacultyLoading ? (
              <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-12 h-12 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] rounded-full animate-spin" />
                <p className="text-xs font-black text-[#1E184B] dark:text-white uppercase tracking-[0.2em] animate-pulse">Analyzing Faculty Performance Data...</p>
              </div>
            ) : selectedFacultyId === null ? (
              <div className="space-y-10">
                {/* Search Bar */}
                <div className="bg-white dark:bg-[#1E184B] p-6 rounded-[2.5rem] border border-slate-100 dark:border-transparent shadow-sm dark:shadow-2xl flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search faculty name or email..."
                      value={facultySearchQuery}
                      onChange={(e) => setFacultySearchQuery(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-[#1A1235]/40 border-none rounded-2xl text-xs font-bold text-[#1E184B] dark:text-white focus:ring-4 focus:ring-[#7C3AED]/5 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Faculty Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {((facultyData || []).filter(f => 
                    f.name.toLowerCase().includes(facultySearchQuery.toLowerCase()) ||
                    f.email.toLowerCase().includes(facultySearchQuery.toLowerCase())
                  )).map(f => (
                    <div key={f.id} className="bg-white dark:bg-[#1E184B] p-8 rounded-[3rem] border border-slate-100 dark:border-transparent shadow-sm dark:shadow-2xl flex flex-col items-center text-center group hover:border-[#7C3AED]/20 transition-all relative overflow-hidden">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-50 dark:bg-[#1A1235] border border-slate-200 dark:border-slate-800/80 mb-6 group-hover:scale-105 transition-transform duration-300">
                        {f.profile_pic ? (
                          <img src={`${import.meta.env.VITE_API_URL}/${f.profile_pic}`} alt={f.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-black text-slate-400 text-xl">{f.name.charAt(0)}</div>
                        )}
                      </div>
                      <h4 className="text-base font-black text-[#1E184B] dark:text-white mb-1">{f.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 italic mb-6">{f.email}</p>
                      
                      <div className="grid grid-cols-2 gap-4 w-full border-t border-slate-50 dark:border-slate-800/40 pt-6 mb-6">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Points</p>
                          <p className="text-xl font-black text-[#7C3AED] dark:text-[#A78BFA]">{f.total_points || 0}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Completed</p>
                          <p className="text-xl font-black text-[#1E184B] dark:text-white">{f.completed_count || 0}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSelectFaculty(f.id)}
                        className="w-full bg-[#7C3AED] text-white py-3 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-[#7C3AED]/10 cursor-pointer"
                      >
                        View Report
                      </button>
                    </div>
                  ))}
                  {((facultyData || []).filter(f => 
                    f.name.toLowerCase().includes(facultySearchQuery.toLowerCase()) ||
                    f.email.toLowerCase().includes(facultySearchQuery.toLowerCase())
                  )).length === 0 && (
                    <div className="col-span-full py-20 bg-white dark:bg-[#1E184B] rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800 text-center">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-[#1A1235] rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                        <Search className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-black text-[#1E184B]/30 dark:text-white/20 uppercase tracking-widest">No matching faculty members</h3>
                    </div>
                  )}
                </div>
              </div>
            ) : (() => {
              const faculty = (facultyData || []).find(f => f.id === selectedFacultyId);
              if (!faculty) return null;

              const tasks = faculty.tasks || [];
              const totalAssigned = tasks.length;
              
              // Acceptance
              const acceptedTasks = tasks.filter((t: any) => t.accepted_at !== null || ['Accepted', 'In Progress', 'Submitted', 'Under Review', 'Approved', 'Completed', 'Rework Required'].includes(t.status));
              const totalAccepted = acceptedTasks.length;
              const unacceptedTasks = tasks.filter((t: any) => t.accepted_at === null && t.status === 'Assigned');
              const totalUnaccepted = unacceptedTasks.length;

              // Completion
              const completedTasks = tasks.filter((t: any) => t.status === 'Completed' || t.status === 'Approved');
              const totalCompleted = completedTasks.length;
              const incompleteTasks = tasks.filter((t: any) => t.status !== 'Completed' && t.status !== 'Approved');
              const totalIncomplete = incompleteTasks.length;

              // Review Status
              const awaitingReviewTasks = tasks.filter((t: any) => t.status === 'Submitted' || t.status === 'Under Review');
              const totalAwaitingReview = awaitingReviewTasks.length;

              // Deadlines
              const completedOnTime = completedTasks.filter((t: any) => t.completed_at && new Date(t.completed_at) <= new Date(t.deadline));
              const totalOnTime = completedOnTime.length;
              
              const completedLate = completedTasks.filter((t: any) => t.completed_at && new Date(t.completed_at) > new Date(t.deadline));
              const totalLate = completedLate.length;
              
              const overdueIncomplete = incompleteTasks.filter((t: any) => new Date() > new Date(t.deadline));
              const totalOverdueIncomplete = overdueIncomplete.length;
              
              const totalDeadlineViolations = totalLate + totalOverdueIncomplete;

              // Reminders
              const totalReminders = tasks.reduce((sum: number, t: any) => sum + (Number(t.reminder_count) || 0), 0);
              const multipleRemindersTasks = tasks.filter((t: any) => (Number(t.reminder_count) || 0) > 1);

              // Points
              const totalPointsEarned = tasks.reduce((sum: number, t: any) => sum + (Number(t.points) || 0), 0);
              const totalBonusPointsEarned = tasks.reduce((sum: number, t: any) => sum + (Number(t.bonus_points) || 0), 0);

              const completionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;
              const acceptanceRate = totalAssigned > 0 ? Math.round((totalAccepted / totalAssigned) * 100) : 0;

              return (
                <div className="space-y-10">
                  {/* Dashboard Header */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800/40">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleBackToFacultyList()}
                        className="p-3 bg-white dark:bg-[#1E184B] border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 transition-all text-[#1E184B] dark:text-white cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#1A1235]">
                          {faculty.profile_pic ? (
                            <img src={`${import.meta.env.VITE_API_URL}/${faculty.profile_pic}`} alt={faculty.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-black text-slate-400">{faculty.name.charAt(0)}</div>
                          )}
                        </div>
                        <div>
                          <h2 className="text-xl font-black text-[#1E184B] dark:text-white">{faculty.name}</h2>
                          <p className="text-xs font-bold text-slate-400">{faculty.email} • Faculty Reports Dashboard</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Overall Performance Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'Total Assigned', value: totalAssigned, sub: 'Missions issued', icon: Target, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
                      { label: 'Total Accepted', value: totalAccepted, sub: `${totalUnaccepted} pending acceptance`, icon: CheckCircle2, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
                      { label: 'Total Completed', value: totalCompleted, sub: `${completionRate}% completion rate`, icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
                      { label: 'Active Incomplete', value: totalIncomplete, sub: `${totalAwaitingReview} under review`, icon: Activity, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
                      { label: 'Awaiting HOD Review', value: totalAwaitingReview, sub: 'Reviews pending', icon: AlertCircle, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-500/10' },
                      { label: 'Reminders Received', value: totalReminders, sub: 'Across all missions', icon: Clock, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
                      { label: 'Deadlines Missed', value: totalLate, sub: `${totalDeadlineViolations} total violations`, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' },
                      { label: 'Points Accumulation', value: totalPointsEarned + totalBonusPointsEarned, sub: `${totalBonusPointsEarned} bonus points`, icon: Award, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' }
                    ].map((kpi, idx) => (
                      <div key={idx} className="bg-white dark:bg-[#1E184B] p-8 rounded-[2.5rem] border border-slate-100 dark:border-transparent shadow-sm relative overflow-hidden group">
                        <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-bl-[4rem] transition-all group-hover:scale-110", kpi.bg)} />
                        <kpi.icon className={cn("w-6 h-6 mb-6 relative z-10", kpi.color)} />
                        <div className="relative z-10">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</h4>
                          <p className="text-3xl font-black text-[#1E184B] dark:text-white">{kpi.value}</p>
                          <p className="text-[9px] font-bold text-slate-400 mt-2">{kpi.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Sub Tabs Selection */}
                  <div className="flex items-center gap-2 bg-white dark:bg-[#1E184B] p-1.5 rounded-2xl border border-slate-100 dark:border-transparent shadow-sm overflow-x-auto scrollbar-hide shrink-0 w-full md:w-max">
                    {[
                      { id: 'tasks', label: 'Tasks & Progress', icon: Target },
                      { id: 'deadlines', label: 'Deadlines & Reminders', icon: Clock },
                      { id: 'rewards', label: 'Points & Rewards', icon: Award }
                    ].map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setPersonalizedSubTab(sub.id as any)}
                        className={cn(
                          "flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer",
                          personalizedSubTab === sub.id ? "bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/20" : "text-slate-400 dark:text-slate-500 hover:bg-slate-5 dark:hover:bg-slate-800 hover:text-[#1E184B] dark:hover:text-white"
                        )}
                      >
                        <sub.icon className="w-3.5 h-3.5" />
                        {sub.label}
                      </button>
                    ))}
                  </div>

                  {/* Sub Tab Contents */}
                  <div className="space-y-6">
                    {/* Sub Tab: Tasks & Progress */}
                    {personalizedSubTab === 'tasks' && (
                      <div className="bg-white dark:bg-[#1E184B] rounded-[3rem] border border-slate-100 dark:border-transparent shadow-sm overflow-hidden p-8 space-y-8">
                        <div>
                          <h3 className="text-lg font-black text-[#1E184B] dark:text-white flex items-center gap-3">
                            <Target className="w-5 h-5 text-indigo-500" />
                            Mission Assignment Ledger
                          </h3>
                          <p className="text-xs font-bold text-slate-450 mt-1">Detailed list of all assigned tasks and current statuses.</p>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="bg-slate-50/50 dark:bg-[#1A1235]/40">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Mission Title</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Category</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Priority</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Acceptance</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                              {tasks.map((t: any) => (
                                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1A1235]/20 transition-all">
                                  <td className="px-6 py-4 text-sm font-black text-[#1E184B] dark:text-white">{t.title}</td>
                                  <td className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400">{t.category || 'General'}</td>
                                  <td className="px-6 py-4 text-center">
                                    <span className={cn(
                                      "px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider",
                                      t.priority === 'Critical' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' :
                                      t.priority === 'High' ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400' :
                                      t.priority === 'Medium' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' :
                                      'bg-slate-50 text-slate-650 dark:bg-slate-500/10 dark:text-slate-400'
                                    )}>
                                      {t.priority}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    {t.accepted_at ? (
                                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">Accepted</span>
                                    ) : (
                                      <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider">Pending</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <span className={cn(
                                      "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest",
                                      ['Completed', 'Approved'].includes(t.status) ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                                      ['Submitted', 'Under Review'].includes(t.status) ? 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400' :
                                      t.status === 'Rework Required' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' :
                                      'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                    )}>
                                      {t.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                              {tasks.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-slate-600 text-xs font-bold uppercase tracking-widest">No tasks assigned to this faculty member.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Sub Tab: Deadlines & Reminders */}
                    {personalizedSubTab === 'deadlines' && (
                      <div className="bg-white dark:bg-[#1E184B] rounded-[3rem] border border-slate-100 dark:border-transparent shadow-sm overflow-hidden p-8 space-y-8">
                        <div>
                          <h3 className="text-lg font-black text-[#1E184B] dark:text-white flex items-center gap-3">
                            <Clock className="w-5 h-5 text-rose-500" />
                            Deadline & Reminder Compliance Ledger
                          </h3>
                          <p className="text-xs font-bold text-slate-450 mt-1">Audit trail of deadline violations and administrator reminders sent.</p>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="bg-slate-50/50 dark:bg-[#1A1235]/40">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Mission Title</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Deadline</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Completed At</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Reminders</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Adherence</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                              {tasks.map((t: any) => {
                                const isCompleted = ['Completed', 'Approved'].includes(t.status);
                                const isLate = isCompleted && t.completed_at && new Date(t.completed_at) > new Date(t.deadline);
                                const isOverdue = !isCompleted && new Date() > new Date(t.deadline);
                                const reminderCount = Number(t.reminder_count) || 0;

                                return (
                                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1A1235]/20 transition-all">
                                    <td className="px-6 py-4 text-sm font-black text-[#1E184B] dark:text-white">{t.title}</td>
                                    <td className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400">{formatDate(t.deadline)}</td>
                                    <td className="px-6 py-4 text-center text-xs font-bold text-slate-550 dark:text-slate-400">
                                      {t.completed_at ? formatDate(t.completed_at) : '—'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      {reminderCount > 0 ? (
                                        <span className={cn(
                                          "px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider",
                                          reminderCount > 1 ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" : "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400"
                                        )}>
                                          {reminderCount} {reminderCount === 1 ? 'Reminder' : 'Reminders'}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold text-slate-350 dark:text-slate-655">None</span>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      {isCompleted ? (
                                        isLate ? (
                                          <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider">Delayed Submission</span>
                                        ) : (
                                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">On-Time</span>
                                        )
                                      ) : isOverdue ? (
                                        <span className="text-[10px] font-black text-red-500 uppercase tracking-wider animate-pulse">Critical Overdue</span>
                                      ) : (
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pending</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                              {tasks.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-slate-600 text-xs font-bold uppercase tracking-widest">No audit data available.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Sub Tab: Points & Rewards */}
                    {personalizedSubTab === 'rewards' && (
                      <div className="bg-white dark:bg-[#1E184B] rounded-[3rem] border border-slate-100 dark:border-transparent shadow-sm overflow-hidden p-8 space-y-8">
                        <div>
                          <h3 className="text-lg font-black text-[#1E184B] dark:text-white flex items-center gap-3">
                            <Award className="w-5 h-5 text-amber-500" />
                            Leaderboard Points & Reward Ledger
                          </h3>
                          <p className="text-xs font-bold text-slate-455 mt-1">Detailed history of base rewards and bonuses earned from assignments.</p>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="bg-slate-50/50 dark:bg-[#1A1235]/40">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Mission Title</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Completed Date</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Base Points</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Bonus Points</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Net Points</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                              {tasks.map((t: any) => {
                                const basePoints = Number(t.points) || 0;
                                const bonusPoints = Number(t.bonus_points) || 0;
                                const netPoints = basePoints + bonusPoints;

                                return (
                                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1A1235]/20 transition-all">
                                    <td className="px-6 py-4 text-sm font-black text-[#1E184B] dark:text-white">{t.title}</td>
                                    <td className="px-6 py-4 text-center text-xs font-bold text-slate-550 dark:text-slate-400">
                                      {t.completed_at ? formatDate(t.completed_at) : '—'}
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-300">
                                      {basePoints > 0 ? `+${basePoints}` : '0'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      {bonusPoints > 0 ? (
                                        <span className="text-sm font-black text-emerald-500">+{bonusPoints} Bonus</span>
                                      ) : (
                                        <span className="text-xs font-bold text-slate-350 dark:text-slate-655">0</span>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-black text-[#7C3AED] dark:text-[#A78BFA]">
                                      {netPoints > 0 ? `+${netPoints} pts` : '—'}
                                    </td>
                                  </tr>
                                );
                              })}
                              {tasks.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-slate-600 text-xs font-bold uppercase tracking-widest">No points ledger records found.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Reports;
