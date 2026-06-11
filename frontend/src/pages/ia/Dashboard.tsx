import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Users, 
  CheckSquare, 
  Calendar, 
  Clock, 
  Activity, 
  UserCheck, 
  TrendingUp, 
  History,
  AlertTriangle,
  HardDrive,
  Server
} from 'lucide-react';

interface StatsData {
  overview: {
    total_departments: number;
    total_hods: number;
    total_faculty: number;
    active_tasks: number;
    completed_tasks: number;
    pending_tasks: number;
  };
  insights: {
    due_today: number;
    due_tomorrow: number;
    overdue: number;
  };
  engagement: {
    most_active_dept: string;
    least_active_dept: string;
    top_faculty: string;
    top_hod: string;
  };
  infrastructure: {
    storage_used_bytes: number;
    storage_limit_bytes: number;
    storage_percentage: number;
    total_users: number;
    active_users: number;
    database_size_bytes: number;
    database_version: string;
    active_sessions: number;
    php_version: string;
    memory_usage_bytes: number;
    memory_peak_bytes: number;
    memory_limit: string;
  };
  recent_activity: Array<{
    action: string;
    resource: string;
    created_at: string;
    user_name: string;
  }>;
}

export default function IADashboard() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        const response = await fetch(`${apiUrl}/ia/stats.php`, {
          credentials: 'include'
        });
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard stats');
        }
        const result = await response.json();
        if (result.status === 'success') {
          setData(result.data);
        } else {
          setError(result.message || 'An error occurred while fetching stats');
        }
      } catch (err: any) {
        setError(err.message || 'Connection to the stats API failed.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] dark:border-violet-500/20 dark:border-t-violet-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/30 rounded-3xl flex items-center gap-4 text-rose-600 dark:text-rose-400 max-w-xl mx-auto mt-12">
        <AlertTriangle className="w-6 h-6 flex-shrink-0" />
        <div>
          <h3 className="font-black text-sm uppercase tracking-wider">Dashboard Error</h3>
          <p className="text-xs mt-1 font-bold">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    { name: 'Departments', value: data.overview.total_departments, icon: Building2, color: 'from-[#6366F1]/10 to-[#818CF8]/5 dark:from-[#6366F1]/20 dark:to-transparent text-[#6366F1]' },
    { name: 'Active HODs', value: data.overview.total_hods, icon: UserCheck, color: 'from-[#8B5CF6]/10 to-[#A78BFA]/5 dark:from-[#8B5CF6]/20 dark:to-transparent text-[#8B5CF6]' },
    { name: 'Active Faculty', value: data.overview.total_faculty, icon: Users, color: 'from-[#EC4899]/10 to-[#F472B6]/5 dark:from-[#EC4899]/20 dark:to-transparent text-[#EC4899]' },
    { name: 'Active Tasks', value: data.overview.active_tasks, icon: CheckSquare, color: 'from-[#10B981]/10 to-[#34D399]/5 dark:from-[#10B981]/20 dark:to-transparent text-[#10B981]' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-[#1E1B4B] dark:text-indigo-50 tracking-tight">Institution Dashboard</h1>
        <p className="text-sm text-[#4C1D95]/60 dark:text-indigo-200/60 mt-1">
          Complete administration oversight of your institution.
        </p>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.name}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-6 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-2xl shadow-sm flex items-center justify-between hover:shadow-md transition-all group"
            >
              <div className="space-y-1">
                <p className="text-xs font-black text-[#4C1D95]/40 dark:text-indigo-200/40 uppercase tracking-widest">{card.name}</p>
                <h3 className="text-3xl font-black text-[#1E1B4B] dark:text-indigo-50">{card.value}</h3>
              </div>
              <div className={`p-4 rounded-2xl bg-gradient-to-br ${card.color} group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="w-6 h-6" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Insights & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2 parts): Task Insights & Engagement */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Task Insights */}
          <div className="p-8 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-3xl shadow-sm">
            <h3 className="text-sm font-black text-[#1E1B4B] dark:text-indigo-50 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#7C3AED]" /> Task Insights
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              <div className="p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/30 dark:border-rose-950/20 text-center">
                <span className="text-3xl font-black text-rose-500">{data.insights.overdue}</span>
                <p className="text-xs font-bold text-rose-500/60 dark:text-rose-400/60 mt-1 uppercase tracking-wider">Overdue Tasks</p>
              </div>

              <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/30 dark:border-amber-950/20 text-center">
                <span className="text-3xl font-black text-amber-500">{data.insights.due_today}</span>
                <p className="text-xs font-bold text-amber-500/60 dark:text-amber-400/60 mt-1 uppercase tracking-wider">Due Today</p>
              </div>

              <div className="p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/30 dark:border-blue-950/20 text-center">
                <span className="text-3xl font-black text-blue-500">{data.insights.due_tomorrow}</span>
                <p className="text-xs font-bold text-blue-500/60 dark:text-blue-400/60 mt-1 uppercase tracking-wider">Due Tomorrow</p>
              </div>

            </div>
          </div>

          {/* Engagement Metrics */}
          <div className="p-8 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-3xl shadow-sm">
            <h3 className="text-sm font-black text-[#1E1B4B] dark:text-indigo-50 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#7C3AED]" /> Engagement Insights
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div className="p-5 rounded-2xl border border-[#7C3AED]/10 dark:border-violet-500/10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-[#4C1D95]/40 dark:text-indigo-200/40 uppercase tracking-wider">Most Active Dept</p>
                  <p className="text-sm font-black text-[#1E1B4B] dark:text-indigo-50 mt-1">{data.engagement.most_active_dept}</p>
                </div>
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>

              <div className="p-5 rounded-2xl border border-[#7C3AED]/10 dark:border-violet-500/10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-[#4C1D95]/40 dark:text-indigo-200/40 uppercase tracking-wider">Least Active Dept</p>
                  <p className="text-sm font-black text-[#1E1B4B] dark:text-indigo-50 mt-1">{data.engagement.least_active_dept}</p>
                </div>
                <TrendingUp className="w-5 h-5 text-rose-500 rotate-180" />
              </div>

              <div className="p-5 rounded-2xl border border-[#7C3AED]/10 dark:border-violet-500/10 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/20 text-[#7C3AED] dark:text-violet-400 flex items-center justify-center font-black">F</div>
                <div>
                  <p className="text-[10px] font-black text-[#4C1D95]/40 dark:text-indigo-200/40 uppercase tracking-wider">Top Faculty Performer</p>
                  <p className="text-sm font-black text-[#1E1B4B] dark:text-indigo-50 mt-0.5">{data.engagement.top_faculty}</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-[#7C3AED]/10 dark:border-violet-500/10 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/20 text-indigo-500 flex items-center justify-center font-black">H</div>
                <div>
                  <p className="text-[10px] font-black text-[#4C1D95]/40 dark:text-indigo-200/40 uppercase tracking-wider">Top HOD Performer</p>
                  <p className="text-sm font-black text-[#1E1B4B] dark:text-indigo-50 mt-0.5">{data.engagement.top_hod}</p>
                </div>
              </div>

            </div>
          </div>

          {/* Resource & Storage Usage */}
          <div className="p-8 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-3xl shadow-sm">
            <h3 className="text-sm font-black text-[#1E1B4B] dark:text-indigo-50 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Server className="w-4 h-4 text-[#7C3AED]" /> Resource & Storage Usage
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Storage usage */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-[#7C3AED] dark:text-violet-400" />
                    <span className="text-xs font-black text-[#4C1D95]/60 dark:text-indigo-200/60 uppercase tracking-wider">Storage Used</span>
                  </div>
                  <span className="text-xs font-black text-[#1E1B4B] dark:text-indigo-50">
                    {formatBytes(data.infrastructure.storage_used_bytes)} / {formatBytes(data.infrastructure.storage_limit_bytes)}
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="h-3 w-full bg-slate-100 dark:bg-violet-950/20 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${data.infrastructure.storage_percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-[#7C3AED] to-fuchsia-500 rounded-full"
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                  <span>{data.infrastructure.storage_percentage}% allocated</span>
                  <span>{formatBytes(data.infrastructure.storage_limit_bytes - data.infrastructure.storage_used_bytes)} free</span>
                </div>
              </div>

              {/* User licenses/usage */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-black text-[#4C1D95]/60 dark:text-indigo-200/60 uppercase tracking-wider">User Licenses</span>
                  </div>
                  <span className="text-xs font-black text-[#1E1B4B] dark:text-indigo-50">
                    {data.infrastructure.active_users} Active / {data.infrastructure.total_users} Total
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-3 w-full bg-slate-100 dark:bg-violet-950/20 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${data.infrastructure.total_users > 0 ? (data.infrastructure.active_users / data.infrastructure.total_users) * 100 : 0}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                  <span>{data.infrastructure.total_users > 0 ? Math.round((data.infrastructure.active_users / data.infrastructure.total_users) * 100) : 0}% active users</span>
                  <span>{data.infrastructure.total_users - data.infrastructure.active_users} inactive accounts</span>
                </div>
              </div>

            </div>

            {/* System Details & Diagnostics Divider */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-violet-500/10">
              <h4 className="text-[10px] font-black text-[#7C3AED] dark:text-violet-400 uppercase tracking-widest mb-4">System Details & Diagnostics</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                
                <div className="p-3 bg-slate-50 dark:bg-violet-950/10 rounded-xl border border-slate-100/50 dark:border-violet-500/5">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-indigo-200/40 uppercase tracking-wider block">Database Size</span>
                  <span className="text-xs font-black text-[#1E1B4B] dark:text-indigo-50 mt-0.5 block">{formatBytes(data.infrastructure.database_size_bytes)}</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-violet-950/10 rounded-xl border border-slate-100/50 dark:border-violet-500/5">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-indigo-200/40 uppercase tracking-wider block">Memory Usage</span>
                  <span className="text-xs font-black text-[#1E1B4B] dark:text-indigo-50 mt-0.5 block">{formatBytes(data.infrastructure.memory_usage_bytes)}</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-violet-950/10 rounded-xl border border-slate-100/50 dark:border-violet-500/5">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-indigo-200/40 uppercase tracking-wider block">Peak Memory</span>
                  <span className="text-xs font-black text-[#1E1B4B] dark:text-indigo-50 mt-0.5 block">{formatBytes(data.infrastructure.memory_peak_bytes)}</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-violet-950/10 rounded-xl border border-slate-100/50 dark:border-violet-500/5">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-indigo-200/40 uppercase tracking-wider block">Memory Limit</span>
                  <span className="text-xs font-black text-[#1E1B4B] dark:text-indigo-50 mt-0.5 block">{data.infrastructure.memory_limit}</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-violet-950/10 rounded-xl border border-slate-100/50 dark:border-violet-500/5">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-indigo-200/40 uppercase tracking-wider block">Active Sessions</span>
                  <span className="text-xs font-black text-emerald-500 mt-0.5 block">{data.infrastructure.active_sessions} Online</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-violet-950/10 rounded-xl border border-slate-100/50 dark:border-violet-500/5">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-indigo-200/40 uppercase tracking-wider block">PHP Version</span>
                  <span className="text-xs font-black text-[#1E1B4B] dark:text-indigo-50 mt-0.5 block">v{data.infrastructure.php_version}</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-violet-950/10 rounded-xl border border-slate-100/50 dark:border-violet-500/5">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-indigo-200/40 uppercase tracking-wider block">Database Node</span>
                  <span className="text-xs font-black text-[#1E1B4B] mt-0.5 block truncate" title={data.infrastructure.database_version}>{data.infrastructure.database_version}</span>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Recent Activity Feed */}
        <div className="space-y-8">
          <div className="p-8 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-3xl shadow-sm h-full flex flex-col">
            <h3 className="text-sm font-black text-[#1E1B4B] dark:text-indigo-50 uppercase tracking-widest mb-6 flex items-center gap-2">
              <History className="w-4 h-4 text-[#7C3AED]" /> Recent Activity
            </h3>
            
            {data.recent_activity.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-[#4C1D95]/30 dark:text-indigo-200/30 py-12">
                <History className="w-10 h-10 stroke-[1.5]" />
                <p className="text-xs font-bold mt-3">No activity logs recorded yet.</p>
              </div>
            ) : (
              <div className="flex-1 space-y-4 overflow-y-auto max-h-[350px] pr-2">
                {data.recent_activity.map((activity, i) => (
                  <div key={i} className="flex gap-3 text-xs border-b border-[#7C3AED]/5 dark:border-violet-500/5 pb-3 last:border-0 last:pb-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-[#1E1B4B] dark:text-indigo-50">
                        {activity.user_name} performed <span className="text-[#7C3AED] dark:text-violet-400">{activity.action}</span> on {activity.resource}
                      </p>
                      <span className="text-[10px] text-[#4C1D95]/40 dark:text-indigo-200/40 font-bold block mt-0.5">
                        {new Date(activity.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
