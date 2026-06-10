import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  User, 
  Terminal, 
  Globe, 
  Calendar,
  ChevronRight,
  Eye,
  RefreshCcw,
  Shield,
  Clock,
  X,
  Copy,
  Check,
  Laptop,
  CornerDownRight,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface AuditLog {
  id: number;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
  action: string;
  resource: string | null;
  resource_id: string | null;
  details: string | null;
  ip_address: string | null;
  user_agent: string | null;
  request_method: string | null;
  request_uri: string | null;
  created_at: string;
  department_name: string | null;
  department_id: number | null;
}

interface FilterDepartment {
  id: number;
  name: string;
  code: string;
}

interface FilterUser {
  id: number;
  name: string;
  email: string;
  role_id: number;
}

export default function IAActivity() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [departments, setDepartments] = useState<FilterDepartment[]>([]);
  const [users, setUsers] = useState<FilterUser[]>([]);
  const [stats, setStats] = useState({ total: 0, deletes: 0, logins: 0, updates: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [timeFrame, setTimeFrame] = useState('all');
  
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchActivity = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/ia/activity.php`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }
      const result = await response.json();
      if (result.status === 'success') {
        setLogs(result.data.logs);
        setDepartments(result.data.departments);
        setUsers(result.data.users);
        setStats(result.data.stats);
      } else {
        setError(result.message || 'An error occurred');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLogs = logs.filter(log => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (log.user_name?.toLowerCase() || '').includes(q) ||
      (log.action.toLowerCase()).includes(q) ||
      (log.resource?.toLowerCase() || '').includes(q) ||
      (log.details?.toLowerCase() || '').includes(q);
    
    const matchesAction = (() => {
      if (filterAction === 'all') return true;
      if (filterAction === 'LOGIN') return log.action === 'LOGIN' || log.action === 'IA_LOGIN';
      if (filterAction === 'CREATE') return log.action.includes('CREATE');
      if (filterAction === 'UPDATE') return log.action.includes('UPDATE');
      if (filterAction === 'DELETE') return log.action.includes('DELETE');
      return log.action === filterAction;
    })();

    const matchesDept = filterDept === 'all' || log.department_id?.toString() === filterDept;
    
    const matchesUser = filterUser === 'all' || log.user_id?.toString() === filterUser;

    const matchesTimeFrame = (() => {
      if (timeFrame === 'all') return true;
      const logDate = new Date(log.created_at);
      const now = new Date();
      if (timeFrame === 'today') {
        return logDate.toDateString() === now.toDateString();
      }
      if (timeFrame === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return logDate >= oneWeekAgo;
      }
      return true;
    })();
    
    return matchesSearch && matchesAction && matchesDept && matchesUser && matchesTimeFrame;
  });

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-500/10';
    if (action.includes('DELETE')) return 'text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-500/10';
    if (action.includes('UPDATE')) return 'text-amber-600 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-500/10';
    if (action === 'LOGIN' || action === 'IA_LOGIN') return 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-500/10';
    return 'text-[#7C3AED] dark:text-[#A78BFA] bg-violet-50/80 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-500/10';
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1E1B4B] dark:text-indigo-50 tracking-tight flex items-center gap-3">
            <History className="w-8 h-8 text-[#7C3AED] dark:text-violet-400" />
            Activity Center
          </h1>
          <p className="text-sm text-[#4C1D95]/60 dark:text-indigo-200/60 mt-1">
            Immutable audit logging registry for institutional management.
          </p>
        </div>
        <button 
          onClick={fetchActivity}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-2xl text-sm font-bold text-[#7C3AED] dark:text-violet-400 hover:bg-[#7C3AED]/5 dark:hover:bg-violet-950/40 transition-all active:scale-95 shadow-sm cursor-pointer w-full md:w-auto"
        >
          <RefreshCcw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          Refresh Registry
        </button>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#110A24] p-5 rounded-3xl border border-[#7C3AED]/10 dark:border-violet-500/20 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-violet-950/40 rounded-2xl flex items-center justify-center text-[#7C3AED] dark:text-violet-400">
            <History className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-violet-400/60 uppercase tracking-widest">Total Actions</p>
            <p className="text-xl font-black text-[#1E1B4B] dark:text-indigo-50">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#110A24] p-5 rounded-3xl border border-[#7C3AED]/10 dark:border-violet-500/20 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 rounded-2xl flex items-center justify-center text-rose-500 dark:text-rose-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-violet-400/60 uppercase tracking-widest">Deletions</p>
            <p className="text-xl font-black text-[#1E1B4B] dark:text-indigo-50">{stats.deletes}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#110A24] p-5 rounded-3xl border border-[#7C3AED]/10 dark:border-violet-500/20 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 rounded-2xl flex items-center justify-center text-blue-500 dark:text-blue-400">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-violet-400/60 uppercase tracking-widest">Logins</p>
            <p className="text-xl font-black text-[#1E1B4B] dark:text-indigo-50">{stats.logins}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#110A24] p-5 rounded-3xl border border-[#7C3AED]/10 dark:border-violet-500/20 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 rounded-2xl flex items-center justify-center text-amber-500 dark:text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-violet-400/60 uppercase tracking-widest">Updates</p>
            <p className="text-xl font-black text-[#1E1B4B] dark:text-indigo-50">{stats.updates}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/70 dark:bg-[#110A24]/70 backdrop-blur-md rounded-3xl p-4 border border-[#7C3AED]/10 dark:border-violet-500/20 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Search */}
        <div className="md:col-span-4 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C3AED] dark:text-violet-400 opacity-40" />
          <input 
            type="text" 
            placeholder="Search action or operator details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#181131] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-2xl outline-none focus:border-[#7C3AED] dark:focus:border-violet-400 text-xs font-bold text-[#1E1B4B] dark:text-indigo-50"
          />
        </div>

        {/* Action Type */}
        <div className="md:col-span-2 relative">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7C3AED] opacity-40" />
          <select 
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-[#181131] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-2xl outline-none text-xs font-bold appearance-none cursor-pointer text-[#1E1B4B] dark:text-indigo-50"
          >
            <option value="all">All Actions</option>
            <option value="LOGIN">Logins</option>
            <option value="CREATE">Creations</option>
            <option value="UPDATE">Updates</option>
            <option value="DELETE">Deletions</option>
          </select>
          <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7C3AED] rotate-90 pointer-events-none" />
        </div>

        {/* Department Filter */}
        <div className="md:col-span-2 relative">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7C3AED] opacity-40" />
          <select 
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-[#181131] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-2xl outline-none text-xs font-bold appearance-none cursor-pointer text-[#1E1B4B] dark:text-indigo-50"
          >
            <option value="all">All Depts</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7C3AED] rotate-90 pointer-events-none" />
        </div>

        {/* User Filter */}
        <div className="md:col-span-2 relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7C3AED] opacity-40" />
          <select 
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-[#181131] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-2xl outline-none text-xs font-bold appearance-none cursor-pointer text-[#1E1B4B] dark:text-indigo-50"
          >
            <option value="all">All Users</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7C3AED] rotate-90 pointer-events-none" />
        </div>

        {/* Date Filter */}
        <div className="md:col-span-2 relative">
          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7C3AED] opacity-40" />
          <select 
            value={timeFrame}
            onChange={(e) => setTimeFrame(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-[#181131] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-2xl outline-none text-xs font-bold appearance-none cursor-pointer text-[#1E1B4B] dark:text-indigo-50"
          >
            <option value="all">All Time</option>
            <option value="today">Today Only</option>
            <option value="week">Last 7 Days</option>
          </select>
          <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7C3AED] rotate-90 pointer-events-none" />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-3xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] rounded-full animate-spin" />
            <p className="text-[#4C1D95]/60 dark:text-indigo-200/60 font-black text-xs uppercase tracking-widest">Retrieving logs registry...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 font-bold">{error}</div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#4C1D95]/30 dark:text-indigo-200/30">
            <Terminal className="w-16 h-16 stroke-[1.5]" />
            <p className="text-sm font-bold mt-4">No audit logs found matching current filter context.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#7C3AED]/10 dark:border-violet-500/20 bg-[#FAF9FF] dark:bg-[#181131]">
                  <th className="px-6 py-4 text-xs font-black uppercase text-[#4C1D95]/70 dark:text-indigo-200/70 tracking-wider">Timestamp</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-[#4C1D95]/70 dark:text-indigo-200/70 tracking-wider">Operator</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-[#4C1D95]/70 dark:text-indigo-200/70 tracking-wider">Action Protocol</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-[#4C1D95]/70 dark:text-indigo-200/70 tracking-wider">Target Resource</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-[#4C1D95]/70 dark:text-indigo-200/70 tracking-wider">Origin</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-[#4C1D95]/70 dark:text-indigo-200/70 tracking-wider text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#7C3AED]/5 dark:divide-violet-500/10">
                <AnimatePresence mode="popLayout">
                  {filteredLogs.map((log, idx) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15, delay: idx * 0.01 }}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-50/50 dark:hover:bg-[#1a1334]/25 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 text-sm font-bold text-[#1E1B4B] dark:text-indigo-50">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-[#1E1B4B] dark:text-indigo-50">{log.user_name || 'System'}</div>
                        <div className="text-xs text-[#4C1D95]/60 dark:text-indigo-200/50 font-bold">{log.department_name || 'No Dept'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider",
                          getActionColor(log.action)
                        )}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-violet-950/40 rounded text-[9px] font-black text-slate-500 dark:text-indigo-200/50 uppercase tracking-widest border border-slate-200 dark:border-violet-500/10">
                              {log.resource || 'ENDPOINT'}
                            </span>
                            <span className="text-xs font-bold text-[#1E1B4B] dark:text-indigo-50">
                              {log.resource_id ? `#${log.resource_id}` : log.request_uri}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono font-bold text-[#4C1D95]/60 dark:text-indigo-200/50">
                        {log.ip_address || '0.0.0.0'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-[#181131] border border-slate-100 dark:border-violet-500/10 rounded-xl text-xs font-bold text-[#7C3AED] dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/20">
                          <Eye className="w-3.5 h-3.5" />
                          Inspect
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Diagnostic detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="fixed inset-0 bg-[#0B061A]/60 backdrop-blur-sm z-[999]"
            />

            <motion.div 
              initial={{ opacity: 0, y: "100%", scale: 1 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="fixed inset-x-0 bottom-0 md:top-1/2 md:bottom-auto md:left-1/2 md:w-full md:max-w-2xl bg-white dark:bg-[#110A24] rounded-t-[2.5rem] md:rounded-3xl border-t md:border border-[#7C3AED]/15 dark:border-violet-500/20 shadow-2xl z-[1000] overflow-hidden max-h-[90vh] md:max-h-[85vh] flex flex-col md:-translate-y-1/2 md:-translate-x-1/2"
            >
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-violet-950/60 rounded-full mx-auto my-3 md:hidden flex-shrink-0" />

              <div className="px-6 py-4 border-b border-slate-50 dark:border-violet-500/10 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#7C3AED] dark:text-violet-400" />
                  <h3 className="text-md sm:text-lg font-black text-[#1E1B4B] dark:text-indigo-50">
                    Audit Inspection Log
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-violet-950/40 text-slate-400 dark:text-violet-400/60 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
                {/* Event timestamp */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-violet-950/10 p-4 rounded-2xl border border-slate-100 dark:border-violet-500/10">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-indigo-200/40">ACTION REGISTERED</span>
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider w-fit",
                      getActionColor(selectedLog.action)
                    )}>
                      {selectedLog.action}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 sm:text-right">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-indigo-200/40">RECORDED TIMESTAMP</span>
                    <span className="text-xs sm:text-sm font-bold text-[#1E1B4B] dark:text-indigo-50">
                      {formatDate(selectedLog.created_at)}
                    </span>
                  </div>
                </div>

                {/* Operator Details */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#7C3AED] dark:text-violet-400">OPERATOR CREDENTIALS</h4>
                  <div className="flex items-center gap-4 p-4 bg-white dark:bg-[#181131] rounded-2xl border border-[#7C3AED]/10 dark:border-violet-500/10 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/5 dark:bg-violet-950/40 flex items-center justify-center text-[#7C3AED] dark:text-violet-400 border border-[#7C3AED]/10">
                      <User className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black text-[#1E1B4B] dark:text-indigo-50 truncate">{selectedLog.user_name || 'System / Guest'}</div>
                      <div className="text-xs font-bold text-slate-400 dark:text-indigo-200/40 truncate">{selectedLog.user_email || 'anonymous-origin'}</div>
                      {selectedLog.department_name && (
                        <div className="text-[10px] font-bold text-[#7C3AED] dark:text-violet-400 mt-0.5">Department: {selectedLog.department_name}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resource Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-indigo-200/40">TARGET RESOURCE</span>
                    <div className="p-3 bg-slate-50 dark:bg-violet-950/10 rounded-xl border border-slate-100 dark:border-violet-500/10 text-xs font-bold text-[#1E1B4B] dark:text-indigo-50 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#7C3AED] dark:text-violet-400 flex-shrink-0" />
                      <span>{selectedLog.resource || 'ENDPOINT'}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-indigo-200/40">RESOURCE ID REFERENCE</span>
                    <div className="p-3 bg-slate-50 dark:bg-violet-950/10 rounded-xl border border-slate-100 dark:border-violet-500/10 text-xs font-bold text-[#1E1B4B] dark:text-indigo-50 flex items-center gap-2">
                      <CornerDownRight className="w-4 h-4 text-[#7C3AED] dark:text-violet-400 flex-shrink-0" />
                      <span className="truncate">{selectedLog.resource_id || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Network parameters */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#7C3AED] dark:text-violet-400">NETWORK ORIGIN</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-slate-50 dark:bg-violet-950/10 rounded-2xl border border-slate-100 dark:border-violet-500/10 flex items-center gap-3">
                      <Globe className="w-5 h-5 text-slate-400 dark:text-violet-400/40" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-indigo-200/30 uppercase tracking-wider">IP ADDRESS</span>
                        <span className="text-xs font-mono font-bold text-[#1E1B4B] dark:text-indigo-50">{selectedLog.ip_address || '0.0.0.0'}</span>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-violet-950/10 rounded-2xl border border-slate-100 dark:border-violet-500/10 flex items-center gap-3">
                      <Laptop className="w-5 h-5 text-slate-400 dark:text-violet-400/40" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-indigo-200/30 uppercase tracking-wider">REQUEST METHOD</span>
                        <span className="text-xs font-black text-[#1E1B4B] dark:text-indigo-50">{selectedLog.request_method || 'UNKNOWN'}</span>
                      </div>
                    </div>
                  </div>

                  {selectedLog.request_uri && (
                    <div className="p-3 bg-slate-50 dark:bg-violet-950/10 rounded-xl border border-slate-100 dark:border-violet-500/10 flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-indigo-200/30 uppercase tracking-wider">REQUEST PATH</span>
                      <span className="text-xs font-mono font-medium text-[#1E1B4B] dark:text-indigo-50 break-all">{selectedLog.request_uri}</span>
                    </div>
                  )}

                  {selectedLog.user_agent && (
                    <div className="p-3 bg-slate-50 dark:bg-violet-950/10 rounded-xl border border-slate-100 dark:border-violet-500/10 flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-indigo-200/30 uppercase tracking-wider">USER AGENT SYSTEM</span>
                      <span className="text-[10px] font-medium text-slate-400 dark:text-violet-400/80 leading-normal">{selectedLog.user_agent}</span>
                    </div>
                  )}
                </div>

                {/* Audit Payload JSON */}
                {selectedLog.details && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#7C3AED] dark:text-violet-400">LEDGER PAYLOAD</h4>
                      <button 
                        onClick={() => handleCopy(selectedLog.details || '')}
                        className="flex items-center gap-1 text-[10px] font-bold text-[#7C3AED] dark:text-violet-400 hover:opacity-85 cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Details</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-4 bg-slate-950 rounded-2xl text-[10px] sm:text-xs font-mono text-emerald-400 overflow-x-auto border border-[#7C3AED]/20 max-w-full whitespace-pre-wrap break-all shadow-inner leading-relaxed">
                      {selectedLog.details}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
