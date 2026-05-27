import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  UserCheck, 
  Briefcase, 
  Activity, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  Shield,
  Zap,
  Plus,
  ArrowRight,
  MoreVertical,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn, formatDate } from '@/lib/utils';
import SEO from '@/components/SEO';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  colleges: number;
  departments: number;
  hods: number;
  faculty: number;
}

interface ActivityLog {
  id: number;
  action: string;
  user_name: string;
  target_name: string;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/admin/stats.php`, { credentials: 'include' }),
        fetch(`${import.meta.env.VITE_API_URL}/admin/audit_logs.php?limit=5`, { credentials: 'include' })
      ]);

      const statsData = await statsRes.json();
      const logsData = await logsRes.json();

      if (statsData.status === 'success') setStats(statsData.data);
      if (logsData.status === 'success') setRecentLogs(logsData.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const statCards = [
    { 
      label: 'Total Colleges', 
      value: stats?.colleges || 0, 
      icon: Building2, 
      color: 'from-blue-600 to-indigo-600',
      trend: '+2.5%',
      up: true,
      path: '/admin/colleges'
    },
    { 
      label: 'Departments', 
      value: stats?.departments || 0, 
      icon: Briefcase, 
      color: 'from-purple-600 to-pink-600',
      trend: '+4.1%',
      up: true,
      path: '/admin/institutions'
    },
    { 
      label: 'Heads of Dept', 
      value: stats?.hods || 0, 
      icon: UserCheck, 
      color: 'from-amber-500 to-orange-600',
      trend: 'Stable',
      up: true,
      path: '/admin/users'
    },
    { 
      label: 'Total Faculty', 
      value: stats?.faculty || 0, 
      icon: Users, 
      color: 'from-emerald-500 to-teal-600',
      trend: '+12.5%',
      up: true,
      path: '/admin/users'
    }
  ];

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-10">
      <SEO title="System Overview" description="FlowSync Administrative Control Center" />
      
      {/* Header section with Premium Greeting */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="w-10 h-10 bg-[#7C3AED]/10 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#7C3AED]" />
            </div>
            <span className="text-[11px] font-black text-[#7C3AED] uppercase tracking-[0.3em]">System Intelligence</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-black text-[#1E1B4B] tracking-tight"
          >
            Control <span className="text-[#7C3AED]">Center</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-[#4C1D95]/60 mt-3 font-bold text-lg"
          >
            Real-time infrastructure health and institutional analytics.
          </motion.p>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={fetchData}
            className="p-3 bg-white border border-[#7C3AED]/10 rounded-2xl hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <Clock className="w-5 h-5 text-[#7C3AED]" />
          </button>
          <button 
            onClick={() => navigate('/admin/users')}
            className="flex items-center gap-3 px-8 py-4 bg-[#7C3AED] text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-[#7C3AED]/20 hover:scale-[1.02] transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Provision Account
          </button>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + (idx * 0.1) }}
            onClick={() => navigate(stat.path)}
            className="group cursor-pointer"
          >
            <div className="relative bg-white rounded-[2.5rem] p-8 border border-[#7C3AED]/10 shadow-sm hover:shadow-2xl hover:shadow-[#7C3AED]/10 transition-all overflow-hidden h-full">
              <div className={cn("absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-5 -mr-10 -mt-10 rounded-full", stat.color)} />
              
              <div className="flex items-start justify-between mb-8">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-current/10", "bg-gradient-to-br " + stat.color)}>
                  <stat.icon className="w-7 h-7 text-white" />
                </div>
                <div className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest",
                  stat.up ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                )}>
                  {stat.up ? <TrendingUp className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.trend}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-black text-[#4C1D95]/40 uppercase tracking-widest">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-4xl font-black text-[#1E1B4B]">{isLoading ? '...' : stat.value}</h3>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between text-[10px] font-black text-[#7C3AED] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                View Details
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* System Activity Chart (Visual Mockup) */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="xl:col-span-8 bg-white rounded-[3rem] border border-[#7C3AED]/10 p-10 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-black text-[#1E1B4B]">Activity Protocol</h3>
              <p className="text-sm font-bold text-slate-400 mt-1">System interactions across all nodes.</p>
            </div>
            <div className="flex items-center gap-2">
              {['24h', '7d', '30d'].map((range) => (
                <button key={range} className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  range === '7d' ? "bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/20" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                )}>
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[300px] w-full relative flex items-end justify-between gap-2 pt-10">
            {/* Visual Chart Bars */}
            {[45, 62, 58, 75, 90, 82, 65, 48, 55, 70, 85, 95, 78, 62, 55].map((h, i) => (
              <motion.div 
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 0.6 + (i * 0.05), duration: 1, ease: "easeOut" }}
                className={cn(
                  "flex-1 rounded-t-xl relative group",
                  i === 11 ? "bg-[#7C3AED]" : "bg-[#7C3AED]/10 hover:bg-[#7C3AED]/30"
                )}
              >
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-[#1E1B4B] text-white text-[9px] font-black px-2 py-1 rounded-lg z-10 whitespace-nowrap">
                  {h}% Usage
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-6 mt-12 pt-12 border-t border-slate-50">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Uptime</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xl font-black text-[#1E1B4B]">99.98%</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Response</p>
              <p className="text-xl font-black text-[#1E1B4B]">124ms</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Peak Load</p>
              <p className="text-xl font-black text-[#1E1B4B]">4.2k <span className="text-[10px] font-bold text-slate-400">RPM</span></p>
            </div>
          </div>
        </motion.div>

        {/* Recent Audit Logs Sidebar */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="xl:col-span-4 space-y-6"
        >
          <div className="bg-white rounded-[2.5rem] border border-[#7C3AED]/10 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-[#1E1B4B]">Live Logs</h3>
              <button 
                onClick={() => navigate('/admin/audit')}
                className="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest hover:underline"
              >
                View Audit
              </button>
            </div>

            <div className="space-y-5">
              {recentLogs.length > 0 ? recentLogs.map((log, idx) => (
                <div key={log.id} className="flex gap-4 group">
                  <div className="relative">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border",
                      idx === 0 ? "bg-[#7C3AED]/5 border-[#7C3AED]/20 text-[#7C3AED]" : "bg-slate-50 border-slate-100 text-slate-400"
                    )}>
                      <Shield className="w-5 h-5" />
                    </div>
                    {idx < recentLogs.length - 1 && (
                      <div className="absolute top-10 left-1/2 w-[2px] h-6 bg-slate-100 -translate-x-1/2" />
                    )}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="text-xs font-black text-[#1E1B4B] leading-tight mb-1">
                      {log.action} <span className="text-slate-400">{log.target_name}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {log.user_name}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-200" />
                      <span className="text-[9px] font-bold text-slate-400">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="py-10 text-center space-y-3">
                  <Activity className="w-10 h-10 text-slate-100 mx-auto" />
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Listening for events...</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick System Links */}
          <div className="bg-[#1E1B4B] rounded-[2.5rem] p-8 text-white shadow-2xl shadow-[#1E1B4B]/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 -mr-10 -mt-10 rounded-full group-hover:scale-150 transition-transform duration-700" />
            
            <h3 className="text-xl font-black mb-6">Quick Actions</h3>
            <div className="space-y-3">
              {[
                { label: 'Register College', icon: Building2, path: '/admin/institutions' },
                { label: 'Manage Roles', icon: Shield, path: '/admin/users' },
                { label: 'System Settings', icon: Zap, path: '/admin/settings' }
              ].map((link) => (
                <button 
                  key={link.label}
                  onClick={() => navigate(link.path)}
                  className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <link.icon className="w-4 h-4 text-[#7C3AED]" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{link.label}</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-white/20" />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Deployment Status */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-slate-100"
      >
        <div className="flex items-center gap-4 px-8 py-6 bg-white rounded-3xl border border-emerald-100 group hover:border-emerald-500 transition-all">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Database Node</p>
            <p className="text-sm font-black text-[#1E1B4B]">Operational (Primary)</p>
          </div>
        </div>

        <div className="flex items-center gap-4 px-8 py-6 bg-white rounded-3xl border border-[#7C3AED]/10 group hover:border-[#7C3AED] transition-all">
          <div className="w-12 h-12 bg-[#7C3AED]/5 rounded-2xl flex items-center justify-center text-[#7C3AED]">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Storage Engine</p>
            <p className="text-sm font-black text-[#1E1B4B]">Active (92.4 GB Free)</p>
          </div>
        </div>

        <div className="flex items-center gap-4 px-8 py-6 bg-white rounded-3xl border border-amber-100 group hover:border-amber-500 transition-all">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">SSL Certificate</p>
            <p className="text-sm font-black text-[#1E1B4B]">Expires in 42 days</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
