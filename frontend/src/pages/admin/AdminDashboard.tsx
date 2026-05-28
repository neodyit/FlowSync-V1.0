import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Building2, Users, Briefcase, CheckCircle2, Activity, Clock, ShieldCheck, Database, Server, ServerCrash } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import SEO from '@/components/SEO';
import { Link } from 'react-router-dom';

interface DashboardData {
  colleges: number;
  departments: number;
  hods: number;
  faculty: number;
  active_tasks: number;
  completed_tasks: number;
  recent_activity: {
    id: number;
    action: string;
    entity_type: string;
    created_at: string;
    user_name: string | null;
  }[];
}

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/stats.php`, { credentials: 'include' });
      const json = await res.json();
      if (json.status === 'success') {
        setData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-indigo-200 dark:border-violet-950 border-t-indigo-600 dark:border-t-violet-400 rounded-full animate-spin"></div>
        <p className="text-xs font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest animate-pulse">Initializing Overview...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-10">
      <SEO title="System Overview" description="High-level mission control and system health dashboard." />
      
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-black text-[#1E184B] dark:text-indigo-100 tracking-tight">System Overview</h1>
        <p className="text-[#1E184B]/60 dark:text-violet-400/60 mt-2 font-bold flex items-center gap-2 text-xs sm:text-sm">
          <Activity className="w-4 h-4 text-indigo-500 dark:text-violet-400" />
          High-level mission control and system health.
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Colleges', value: data.colleges, icon: Building2, color: 'text-indigo-500 dark:text-violet-400', bg: 'bg-indigo-50' },
          { label: 'Departments', value: data.departments, icon: Shield, color: 'text-fuchsia-500 dark:text-fuchsia-400', bg: 'bg-fuchsia-50' },
          { label: 'Active Faculties', value: data.faculty, icon: Users, color: 'text-emerald-500 dark:text-emerald-450', bg: 'bg-emerald-50' },
          { label: 'Total HODs', value: data.hods, icon: ShieldCheck, color: 'text-amber-500 dark:text-amber-450', bg: 'bg-amber-50' },
        ].map((kpi, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.1 }}
            key={kpi.label} 
            className="bg-white dark:bg-[#1A0F35]/20 backdrop-blur-md p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-violet-500/20 shadow-sm relative overflow-hidden group hover:-translate-y-1 transition-all duration-300"
          >
            <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-bl-[5rem] transition-all duration-500 group-hover:scale-110 opacity-50", kpi.bg, "dark:bg-violet-950/10")} />
            <kpi.icon className={cn("w-8 h-8 mb-6 relative z-10", kpi.color)} />
            <div className="relative z-10">
              <h4 className="text-[10px] font-black text-slate-400 dark:text-violet-400/60 uppercase tracking-widest mb-1">{kpi.label}</h4>
              <p className="text-3xl sm:text-4xl font-black text-[#1E184B] dark:text-indigo-100">{kpi.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Task Engine Status */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-black text-[#1E184B] dark:text-indigo-100 flex items-center gap-3">
            <Database className="w-5 h-5 text-indigo-500 dark:text-violet-400" />
            Task Engine Metrics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-[#1E184B] dark:bg-[#1A0F35]/35 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl relative overflow-hidden group border dark:border-violet-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-50" />
              <Briefcase className="w-8 h-8 text-indigo-400 mb-6 relative z-10" />
              <div className="relative z-10">
                <h4 className="text-[10px] font-black text-indigo-300 dark:text-violet-300 uppercase tracking-widest mb-1">Active Missions</h4>
                <p className="text-4xl sm:text-5xl font-black text-white dark:text-indigo-100">{data.active_tasks}</p>
                <p className="text-xs font-bold text-indigo-200 dark:text-violet-400/80 mt-2">Currently in progress network-wide</p>
              </div>
            </div>

            <div className="bg-emerald-600 dark:bg-emerald-950/20 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl relative overflow-hidden group border dark:border-emerald-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-transparent opacity-50" />
              <CheckCircle2 className="w-8 h-8 text-emerald-300 mb-6 relative z-10" />
              <div className="relative z-10">
                <h4 className="text-[10px] font-black text-emerald-200 dark:text-emerald-350 uppercase tracking-widest mb-1">Completed Missions</h4>
                <p className="text-4xl sm:text-5xl font-black text-white dark:text-indigo-100">{data.completed_tasks}</p>
                <p className="text-xs font-bold text-emerald-100 dark:text-emerald-400/80 mt-2">Successfully closed network-wide</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-[#1A0F35]/20 backdrop-blur-md p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-violet-500/20 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl flex items-center justify-center shrink-0">
                 <Server className="w-6 h-6 text-emerald-500" />
               </div>
               <div>
                 <h3 className="text-sm font-black text-[#1E184B] dark:text-indigo-100">System Health</h3>
                 <p className="text-xs font-bold text-slate-400 dark:text-violet-400/60">All services operational</p>
               </div>
             </div>
             <div className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl self-start sm:self-auto">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Online</span>
             </div>
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-[#1E184B] dark:text-indigo-100 flex items-center gap-3">
            <Clock className="w-5 h-5 text-indigo-500 dark:text-violet-400" />
            Live Network Feed
          </h2>
          <div className="bg-white dark:bg-[#1A0F35]/20 backdrop-blur-md rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-violet-500/20 shadow-sm overflow-hidden h-[450px] flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {data.recent_activity.length > 0 ? data.recent_activity.map((log, idx) => (
                <div key={log.id} className="relative pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-[-24px] before:w-0.5 before:bg-slate-100 dark:before:bg-violet-950 last:before:hidden">
                  <div className="absolute left-0 top-1 w-6 h-6 bg-indigo-50 dark:bg-violet-950 border-2 border-white dark:border-[#0E0820] rounded-full flex items-center justify-center z-10">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1E184B] dark:text-indigo-100">
                      {log.user_name ? <span className="font-black text-indigo-600 dark:text-violet-400">{log.user_name}</span> : 'System'} 
                      {' '}{log.action.replace(/_/g, ' ').toLowerCase()}
                    </p>
                    <p className="text-[9px] font-black text-slate-400 dark:text-violet-400/60 uppercase tracking-widest mt-1">
                      {formatDate(log.created_at)} • {log.entity_type}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-violet-400/50">
                  <Clock className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-xs font-bold text-[#1E184B] dark:text-indigo-100">No recent activity detected.</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-50 dark:border-violet-500/10 bg-slate-50/50 dark:bg-[#110A24] text-center">
              <Link to="/admin/audit" className="text-[10px] font-black text-indigo-600 dark:text-violet-400 uppercase tracking-widest hover:underline">View All Logs &rarr;</Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
