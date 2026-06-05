import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Zap,
  X,
  Copy,
  Check,
  Laptop,
  Cpu,
  CornerDownRight,
  Shield,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatDate } from '@/lib/utils';
import SEO from '@/components/SEO';

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
}

const AuditLogs: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [filterAction, setFilterAction] = useState('all');
  const [timeFrame, setTimeFrame] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/audit_logs.php`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        setLogs(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    const searchVal = searchParams.get('search');
    if (searchVal !== null) {
      setSearchQuery(searchVal);
    }
  }, [searchParams]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.user_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (log.action.toLowerCase()).includes(searchQuery.toLowerCase()) ||
      (log.resource?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    
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
    
    return matchesSearch && matchesAction && matchesTimeFrame;
  });

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-500/10';
    if (action.includes('DELETE')) return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-500/10';
    if (action.includes('UPDATE')) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-500/10';
    if (action === 'LOGIN') return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-500/10';
    if (action === 'API_HIT') return 'text-[#7C3AED] dark:text-[#A78BFA] bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-500/10';
    return 'text-slate-600 dark:text-violet-200 bg-slate-50 dark:bg-violet-950/20 border border-slate-100 dark:border-violet-500/10';
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <SEO title="Audit Protocols" description="Comprehensive immutable ledger of all system interactions and administrative changes within FlowSync." />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#1E1B4B] dark:text-indigo-100 tracking-tight flex items-center gap-2 sm:gap-3">
            <History className="w-7 h-7 sm:w-10 sm:h-10 text-[#7C3AED] dark:text-violet-400 animate-pulse" />
            Audit Protocols
          </h1>
          <p className="text-[#4C1D95]/60 dark:text-violet-400/60 mt-1 font-medium text-xs sm:text-sm">
            Comprehensive immutable ledger of all system interactions.
          </p>
        </div>
        <button 
          onClick={fetchLogs}
          className="flex items-center justify-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-2xl text-xs sm:text-sm font-bold text-[#7C3AED] dark:text-violet-400 hover:bg-[#7C3AED]/5 dark:hover:bg-violet-950/40 transition-all active:scale-95 shadow-sm cursor-pointer w-full md:w-auto"
        >
          <RefreshCcw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          Refresh Registry
        </button>
      </div>

      {/* Overview Statistics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Events */}
        <div className="bg-white dark:bg-[#1A0F35]/20 backdrop-blur-md p-5 rounded-3xl border border-[#7C3AED]/10 dark:border-violet-500/20 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-violet-950/40 rounded-2xl flex items-center justify-center text-[#7C3AED] dark:text-violet-400">
            <History className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-violet-400/60 uppercase tracking-widest">Total Logs</p>
            <p className="text-2xl font-black text-[#1E1B4B] dark:text-indigo-100">{logs.length}</p>
          </div>
        </div>

        {/* Security / Deletions */}
        <div className="bg-white dark:bg-[#1A0F35]/20 backdrop-blur-md p-5 rounded-3xl border border-[#7C3AED]/10 dark:border-violet-500/20 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 rounded-2xl flex items-center justify-center text-rose-500 dark:text-rose-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-violet-400/60 uppercase tracking-widest">Purges / Deletions</p>
            <p className="text-2xl font-black text-[#1E1B4B] dark:text-indigo-100">
              {logs.filter(l => l.action.includes('DELETE')).length}
            </p>
          </div>
        </div>

        {/* Authentication Events */}
        <div className="bg-white dark:bg-[#1A0F35]/20 backdrop-blur-md p-5 rounded-3xl border border-[#7C3AED]/10 dark:border-violet-500/20 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 rounded-2xl flex items-center justify-center text-blue-500 dark:text-blue-400">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-violet-400/60 uppercase tracking-widest">User Logins</p>
            <p className="text-2xl font-black text-[#1E1B4B] dark:text-indigo-100">
              {logs.filter(l => l.action === 'LOGIN').length}
            </p>
          </div>
        </div>

        {/* Sync Status / API Hits */}
        <div className="bg-white dark:bg-[#1A0F35]/20 backdrop-blur-md p-5 rounded-3xl border border-[#7C3AED]/10 dark:border-violet-500/20 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-violet-50 dark:bg-violet-950/40 rounded-2xl flex items-center justify-center text-[#7C3AED] dark:text-violet-400 animate-pulse">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-violet-400/60 uppercase tracking-widest">System API Hits</p>
            <p className="text-2xl font-black text-[#1E1B4B] dark:text-indigo-100">
              {logs.filter(l => l.action === 'API_HIT' || l.action.includes('SYNC')).length}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/70 dark:bg-[#1A0F35]/20 backdrop-blur-md rounded-3xl p-3 sm:p-4 border border-[#7C3AED]/10 dark:border-violet-500/20 shadow-sm flex flex-col md:flex-row gap-3 sm:gap-4 relative z-[40]">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 text-[#7C3AED] dark:text-violet-400 opacity-40 group-focus-within:opacity-100 transition-opacity" />
          <input 
            type="text" 
            placeholder="Search by operator, action, or resource..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-white dark:bg-[#110A24] border border-[#7C3AED]/5 dark:border-violet-500/20 rounded-2xl outline-none focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-xs sm:text-sm font-medium text-[#1E1B4B] dark:text-indigo-100 placeholder:text-slate-300 dark:placeholder:text-indigo-100/20"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative group flex-1 sm:w-48">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 text-[#7C3AED] dark:text-violet-400 opacity-40" />
            <select 
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-10 py-2.5 sm:py-3 bg-white dark:bg-[#110A24] border border-[#7C3AED]/5 dark:border-violet-500/20 rounded-2xl outline-none focus:border-[#7C3AED] dark:focus:border-violet-400 transition-all text-xs sm:text-sm font-bold appearance-none cursor-pointer text-[#1E1B4B] dark:text-indigo-100"
            >
              <option value="all" className="dark:bg-[#110A24]">All Action Types</option>
              <option value="LOGIN" className="dark:bg-[#110A24]">Logins</option>
              <option value="CREATE_USER" className="dark:bg-[#110A24]">User Creation</option>
              <option value="UPDATE_USER" className="dark:bg-[#110A24]">User Updates</option>
              <option value="DELETE_USER" className="dark:bg-[#110A24]">User Deletions</option>
              <option value="API_HIT" className="dark:bg-[#110A24]">System API Hits</option>
            </select>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C3AED] dark:text-violet-400 rotate-90" />
          </div>

          <div className="relative group flex-1 sm:w-48">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 text-[#7C3AED] dark:text-violet-400 opacity-40" />
            <select 
              value={timeFrame}
              onChange={(e) => setTimeFrame(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-10 py-2.5 sm:py-3 bg-white dark:bg-[#110A24] border border-[#7C3AED]/5 dark:border-violet-500/20 rounded-2xl outline-none focus:border-[#7C3AED] dark:focus:border-violet-400 transition-all text-xs sm:text-sm font-bold appearance-none cursor-pointer text-[#1E1B4B] dark:text-indigo-100"
            >
              <option value="all" className="dark:bg-[#110A24]">All Time</option>
              <option value="today" className="dark:bg-[#110A24]">Today Only</option>
              <option value="week" className="dark:bg-[#110A24]">Last 7 Days</option>
            </select>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C3AED] dark:text-violet-400 rotate-90" />
          </div>
        </div>
      </div>

      {/* Logs Table / List Container */}
      <div className="bg-transparent md:bg-white md:dark:bg-[#1A0F35]/20 md:backdrop-blur-md md:rounded-[2.5rem] md:border md:border-[#7C3AED]/10 md:dark:border-violet-500/20 md:shadow-xl md:overflow-hidden">
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-violet-950/20 border-b border-slate-100 dark:border-violet-500/20">
                <th className="px-8 py-5 text-[10px] font-black text-[#4C1D95]/40 dark:text-violet-400/80 uppercase tracking-[0.2em]">Timestamp</th>
                <th className="px-8 py-5 text-[10px] font-black text-[#4C1D95]/40 dark:text-violet-400/80 uppercase tracking-[0.2em]">Operator</th>
                <th className="px-8 py-5 text-[10px] font-black text-[#4C1D95]/40 dark:text-violet-400/80 uppercase tracking-[0.2em]">Action Protocol</th>
                <th className="px-8 py-5 text-[10px] font-black text-[#4C1D95]/40 dark:text-violet-400/80 uppercase tracking-[0.2em]">Target Resource</th>
                <th className="px-8 py-5 text-[10px] font-black text-[#4C1D95]/40 dark:text-violet-400/80 uppercase tracking-[0.2em]">Origin (IP)</th>
                <th className="px-8 py-5 text-[10px] font-black text-[#4C1D95]/40 dark:text-violet-400/80 uppercase tracking-[0.2em]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-violet-500/10">
              <AnimatePresence mode="popLayout">
                {filteredLogs.map((log) => (
                  <motion.tr 
                    key={log.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedLog(log)}
                    className="group hover:bg-slate-50/80 dark:hover:bg-violet-950/30 transition-colors border-b border-slate-50 dark:border-violet-500/10 cursor-pointer"
                  >
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-[#1E1B4B] dark:text-indigo-100">
                        {formatDate(log.created_at)}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/5 dark:bg-violet-950/40 flex items-center justify-center text-[#7C3AED] dark:text-violet-400 group-hover:bg-[#7C3AED] group-hover:text-white dark:group-hover:text-white transition-all duration-300">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-[#1E1B4B] dark:text-indigo-100">{log.user_name || 'System / Guest'}</span>
                          <span className="text-[10px] font-bold text-slate-400 dark:text-violet-400/60">{log.user_email || 'anonymous-origin'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider",
                        getActionColor(log.action)
                      )}>
                        {log.action === 'API_HIT' && <Zap className="w-3 h-3" />}
                        {log.action}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-violet-950/40 rounded text-[9px] font-black text-slate-500 dark:text-violet-300 uppercase tracking-widest border border-slate-200 dark:border-violet-500/20">
                            {log.resource || 'ENDPOINT'}
                          </span>
                          <span className="text-xs font-bold text-[#1E1B4B] dark:text-indigo-100">{log.resource_id ? `#${log.resource_id}` : log.request_uri}</span>
                        </div>
                        {log.details && (
                          <span className="text-[10px] font-medium text-slate-400 dark:text-violet-400/80 truncate max-w-[200px]">
                            {log.details}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-slate-400 dark:text-violet-400/60">
                        <Globe className="w-3.5 h-3.5 opacity-50" />
                        <span className="text-xs font-mono font-medium">{log.ip_address || '0.0.0.0'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-[#7C3AED]/10 dark:bg-[#110A24] dark:hover:bg-[#7C3AED]/20 border border-slate-100 dark:border-violet-500/20 rounded-xl text-xs font-bold text-[#7C3AED] dark:text-violet-400 transition-colors">
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

        {/* Premium Mobile Card List View */}
        <div className="block md:hidden space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredLogs.map((log, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: Math.min(idx * 0.02, 0.2) }}
                key={log.id}
                onClick={() => setSelectedLog(log)}
                whileTap={{ scale: 0.98 }}
                className="p-4 sm:p-5 flex flex-col gap-4 bg-white dark:bg-[#110A24]/60 backdrop-blur-md rounded-3xl border border-[#7C3AED]/10 dark:border-violet-500/10 hover:border-[#7C3AED]/30 shadow-md active:bg-[#7C3AED]/5 dark:active:bg-[#7C3AED]/10 transition-all cursor-pointer"
              >
                {/* Header Row: Badge & Date */}
                <div className="flex items-center justify-between gap-3">
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider",
                    getActionColor(log.action)
                  )}>
                    {log.action === 'API_HIT' && <Zap className="w-2.5 h-2.5" />}
                    {log.action}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-violet-400/50 uppercase tracking-widest flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-300 dark:text-violet-400/40" />
                    {formatDate(log.created_at)}
                  </span>
                </div>

                {/* Operator Block */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#7C3AED]/5 dark:bg-violet-950/40 flex items-center justify-center text-[#7C3AED] dark:text-violet-400 border border-[#7C3AED]/10">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs sm:text-sm font-black text-[#1E1B4B] dark:text-indigo-100 truncate">
                      {log.user_name || 'System / Guest'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-violet-400/60 truncate">
                      {log.user_email || 'anonymous-origin'}
                    </span>
                  </div>
                </div>

                {/* Target Resource Summary */}
                <div className="bg-slate-50 dark:bg-violet-950/10 rounded-2xl p-3 sm:p-4 border border-slate-100 dark:border-violet-500/10 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-white dark:bg-[#110A24] rounded text-[8px] font-black text-slate-500 dark:text-violet-300 uppercase tracking-widest border border-slate-200 dark:border-violet-500/20">
                      {log.resource || 'ENDPOINT'}
                    </span>
                    <span className="text-xs font-bold text-[#1E1B4B] dark:text-indigo-100 break-all">
                      {log.resource_id ? `#${log.resource_id}` : log.request_uri}
                    </span>
                  </div>
                  {log.details && (
                    <p className="text-[10px] font-medium text-slate-400 dark:text-violet-400/80 leading-relaxed border-t border-slate-100 dark:border-violet-500/10 pt-2 line-clamp-2">
                      {log.details}
                    </p>
                  )}
                </div>

                {/* Footer Meta Details */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-50 dark:border-violet-500/10 mt-1">
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-violet-400/60">
                    <Globe className="w-3.5 h-3.5 opacity-50" />
                    <span className="text-[10px] font-mono font-bold">{log.ip_address || '0.0.0.0'}</span>
                  </div>
                  
                  <span className="text-[10px] font-black text-[#7C3AED] dark:text-violet-400 flex items-center gap-1">
                    Tap to inspect
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        {!isLoading && filteredLogs.length === 0 && (
          <div className="text-center py-20 space-y-4 bg-white dark:bg-[#110A24]/40 rounded-[2.5rem] border border-[#7C3AED]/10 dark:border-violet-500/20">
            <div className="w-20 h-20 bg-slate-50 dark:bg-violet-950/20 rounded-full flex items-center justify-center mx-auto">
              <Terminal className="w-10 h-10 text-slate-200 dark:text-violet-500/20" />
            </div>
            <h3 className="text-xl font-black text-[#1E1B4B] dark:text-indigo-100">No audit records found</h3>
            <p className="text-sm font-bold text-slate-400 dark:text-violet-400/60 max-w-xs mx-auto">
              No system interactions matched your current search and filter criteria.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white dark:bg-[#110A24]/40 rounded-[2.5rem] border border-[#7C3AED]/10 dark:border-violet-500/20">
            <div className="w-12 h-12 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] rounded-full animate-spin" />
            <p className="text-[#4C1D95]/60 dark:text-violet-400/60 font-black text-xs uppercase tracking-widest">Analyzing Immutable Logs...</p>
          </div>
        )}
      </div>

      {/* Premium Detail Drawer / Modal */}
      <AnimatePresence>
        {selectedLog && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="fixed inset-0 bg-[#0B061A]/60 backdrop-blur-sm z-[999]"
            />

            {/* Panel */}
            <motion.div 
              initial={{ 
                opacity: 0, 
                y: window.innerWidth < 768 ? "100%" : "-40%",
                scale: window.innerWidth < 768 ? 1 : 0.95,
                x: window.innerWidth < 768 ? 0 : "-50%"
              }}
              animate={{ 
                opacity: 1, 
                y: window.innerWidth < 768 ? 0 : "-50%",
                scale: 1,
                x: window.innerWidth < 768 ? 0 : "-50%"
              }}
              exit={{ 
                opacity: 0, 
                y: window.innerWidth < 768 ? "100%" : "-45%",
                scale: window.innerWidth < 768 ? 1 : 0.95
              }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="fixed inset-x-0 bottom-0 md:top-1/2 md:bottom-auto md:left-1/2 md:w-full md:max-w-2xl bg-white dark:bg-[#110A24] rounded-t-[2.5rem] md:rounded-3xl border-t md:border border-[#7C3AED]/15 dark:border-violet-500/20 shadow-2xl z-[1000] overflow-hidden max-h-[90vh] md:max-h-[85vh] flex flex-col"
            >
              {/* Mobile grab handle */}
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-violet-950/60 rounded-full mx-auto my-3 md:hidden flex-shrink-0" />

              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-50 dark:border-violet-500/10 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center text-[#7C3AED] dark:text-violet-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <h3 className="text-md sm:text-lg font-black text-[#1E1B4B] dark:text-indigo-100">
                    Protocol Inspection
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-violet-950/40 text-slate-400 dark:text-violet-400/60 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable details view */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
                {/* Diagnostic Overview Badge & Date */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-violet-950/10 p-4 rounded-2xl border border-slate-100 dark:border-violet-500/10">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-violet-400/60">ACTION REGISTERED</span>
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider w-fit",
                      getActionColor(selectedLog.action)
                    )}>
                      {selectedLog.action === 'API_HIT' && <Zap className="w-2.5 h-2.5" />}
                      {selectedLog.action}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 sm:text-right">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-violet-400/60">RECORDED TIMESTAMP</span>
                    <span className="text-xs sm:text-sm font-bold text-[#1E1B4B] dark:text-indigo-100">
                      {formatDate(selectedLog.created_at)}
                    </span>
                  </div>
                </div>

                {/* User details */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#7C3AED] dark:text-violet-400">OPERATOR CREDENTIALS</h4>
                  <div className="flex items-center gap-4 p-4 bg-white dark:bg-[#1A0F35]/10 rounded-2xl border border-[#7C3AED]/10 dark:border-violet-500/10 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/5 dark:bg-violet-950/40 flex items-center justify-center text-[#7C3AED] dark:text-violet-400 border border-[#7C3AED]/10">
                      <User className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black text-[#1E1B4B] dark:text-indigo-100 truncate">{selectedLog.user_name || 'System / Guest'}</div>
                      <div className="text-xs font-bold text-slate-400 dark:text-violet-400/60 truncate">{selectedLog.user_email || 'anonymous-origin'}</div>
                      {selectedLog.user_id && (
                        <div className="text-[10px] font-medium text-slate-300 dark:text-violet-400/30 mt-0.5">ID: {selectedLog.user_id}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resource Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-violet-400/60">TARGET PROTOCOL</span>
                    <div className="p-3 bg-slate-50 dark:bg-violet-950/10 rounded-xl border border-slate-100 dark:border-violet-500/10 text-xs font-bold text-[#1E1B4B] dark:text-indigo-100 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#7C3AED] dark:text-violet-400 flex-shrink-0" />
                      <span>{selectedLog.resource || 'ENDPOINT'}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-violet-400/60">RESOURCE REFERENCE</span>
                    <div className="p-3 bg-slate-50 dark:bg-violet-950/10 rounded-xl border border-slate-100 dark:border-violet-500/10 text-xs font-bold text-[#1E1B4B] dark:text-indigo-100 flex items-center gap-2">
                      <CornerDownRight className="w-4 h-4 text-[#7C3AED] dark:text-violet-400 flex-shrink-0" />
                      <span className="truncate">{selectedLog.resource_id ? `#${selectedLog.resource_id}` : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Network & Environment */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#7C3AED] dark:text-violet-400">NETWORK ORIGIN</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-slate-50 dark:bg-violet-950/10 rounded-2xl border border-slate-100 dark:border-violet-500/10 flex items-center gap-3">
                      <Globe className="w-5 h-5 text-slate-400 dark:text-violet-400/40" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-violet-400/40 uppercase tracking-wider">IP ADDRESS</span>
                        <span className="text-xs font-mono font-bold text-[#1E1B4B] dark:text-indigo-100">{selectedLog.ip_address || '0.0.0.0'}</span>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-violet-950/10 rounded-2xl border border-slate-100 dark:border-violet-500/10 flex items-center gap-3">
                      <Laptop className="w-5 h-5 text-slate-400 dark:text-violet-400/40" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-violet-400/40 uppercase tracking-wider">REQUEST METHOD</span>
                        <span className="text-xs font-black text-[#1E1B4B] dark:text-indigo-100">{selectedLog.request_method || 'UNKNOWN'}</span>
                      </div>
                    </div>
                  </div>

                  {selectedLog.request_uri && (
                    <div className="p-3 bg-slate-50 dark:bg-violet-950/10 rounded-xl border border-slate-100 dark:border-violet-500/10 flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-violet-400/40 uppercase tracking-wider">REQUEST PATH</span>
                      <span className="text-xs font-mono font-medium text-[#1E1B4B] dark:text-indigo-100 break-all">{selectedLog.request_uri}</span>
                    </div>
                  )}

                  {selectedLog.user_agent && (
                    <div className="p-3 bg-slate-50 dark:bg-violet-950/10 rounded-xl border border-slate-100 dark:border-violet-500/10 flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-violet-400/40 uppercase tracking-wider">USER AGENT SYSTEM</span>
                      <span className="text-[10px] font-medium text-slate-400 dark:text-violet-400/80 leading-normal">{selectedLog.user_agent}</span>
                    </div>
                  )}
                </div>

                {/* Audit Payload Detail (Details JSON) */}
                {selectedLog.details && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#7C3AED] dark:text-violet-400">DIAGNOSTIC LEDGER PAYLOAD</h4>
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
};

export default AuditLogs;
