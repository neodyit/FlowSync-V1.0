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
  ArrowRight,
  RefreshCcw,
  Zap
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
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('all');

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

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.user_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (log.action.toLowerCase()).includes(searchQuery.toLowerCase()) ||
      (log.resource?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    
    return matchesSearch && matchesAction;
  });

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (action.includes('DELETE')) return 'text-rose-600 bg-rose-50 border-rose-100';
    if (action.includes('UPDATE')) return 'text-amber-600 bg-amber-50 border-amber-100';
    if (action === 'LOGIN') return 'text-blue-600 bg-blue-50 border-blue-100';
    if (action === 'API_HIT') return 'text-slate-400 bg-slate-50 border-slate-100';
    return 'text-slate-600 bg-slate-50 border-slate-100';
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <SEO title="Audit Protocols" description="Comprehensive immutable ledger of all system interactions and administrative changes within FlowSync." />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#1E1B4B] tracking-tight flex items-center gap-3">
            <History className="w-10 h-10 text-[#7C3AED]" />
            Audit Protocols
          </h1>
          <p className="text-[#4C1D95]/60 mt-1 font-medium">Comprehensive immutable ledger of all system interactions.</p>
        </div>
        <button 
          onClick={fetchLogs}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-[#7C3AED]/10 rounded-2xl text-sm font-bold text-[#7C3AED] hover:bg-[#7C3AED]/5 transition-all active:scale-95 shadow-sm"
        >
          <RefreshCcw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          Refresh Registry
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/70 backdrop-blur-md rounded-3xl p-4 border border-[#7C3AED]/10 shadow-sm flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7C3AED] opacity-40 group-focus-within:opacity-100 transition-opacity" />
          <input 
            type="text" 
            placeholder="Search by operator, action, or resource..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-[#7C3AED]/5 rounded-2xl outline-none focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-medium"
          />
        </div>
        
        <div className="w-full lg:w-64 relative group">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7C3AED] opacity-40" />
          <select 
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full pl-12 pr-10 py-3 bg-white border border-[#7C3AED]/5 rounded-2xl outline-none focus:border-[#7C3AED] transition-all text-sm font-bold appearance-none cursor-pointer"
          >
            <option value="all">All Action Types</option>
            <option value="LOGIN">Logins</option>
            <option value="CREATE_USER">User Creation</option>
            <option value="UPDATE_USER">User Updates</option>
            <option value="DELETE_USER">User Deletions</option>
            <option value="API_HIT">System API Hits</option>
          </select>
          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C3AED] rotate-90" />
        </div>
      </div>

      {/* Logs List */}
      <div className="bg-white rounded-[2.5rem] border border-[#7C3AED]/10 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-[#4C1D95]/40 uppercase tracking-[0.2em]">Timestamp</th>
                <th className="px-8 py-5 text-[10px] font-black text-[#4C1D95]/40 uppercase tracking-[0.2em]">Operator</th>
                <th className="px-8 py-5 text-[10px] font-black text-[#4C1D95]/40 uppercase tracking-[0.2em]">Action Protocol</th>
                <th className="px-8 py-5 text-[10px] font-black text-[#4C1D95]/40 uppercase tracking-[0.2em]">Target Resource</th>
                <th className="px-8 py-5 text-[10px] font-black text-[#4C1D95]/40 uppercase tracking-[0.2em]">Origin (IP)</th>
                <th className="px-8 py-5 text-[10px] font-black text-[#4C1D95]/40 uppercase tracking-[0.2em]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {filteredLogs.map((log) => (
                  <motion.tr 
                    key={log.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#1E1B4B]">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/5 flex items-center justify-center text-[#7C3AED] group-hover:bg-[#7C3AED] group-hover:text-white transition-all duration-300">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-[#1E1B4B]">{log.user_name || 'System / Guest'}</span>
                          <span className="text-[10px] font-bold text-slate-400">{log.user_email || 'anonymous-origin'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-wider",
                        getActionColor(log.action)
                      )}>
                        {log.action === 'API_HIT' && <Zap className="w-3 h-3" />}
                        {log.action}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">
                            {log.resource || 'ENDPOINT'}
                          </span>
                          <span className="text-xs font-bold text-[#1E1B4B]">{log.resource_id ? `#${log.resource_id}` : log.request_uri}</span>
                        </div>
                        {log.details && (
                          <span className="text-[10px] font-medium text-slate-400 truncate max-w-[200px]">
                            {log.details}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Globe className="w-3.5 h-3.5 opacity-50" />
                        <span className="text-xs font-mono font-medium">{log.ip_address || '0.0.0.0'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-emerald-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Recorded</span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {!isLoading && filteredLogs.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
              <Terminal className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-xl font-black text-[#1E1B4B]">No audit records found</h3>
            <p className="text-sm font-bold text-slate-400 max-w-xs mx-auto">
              No system interactions matched your current search and filter criteria.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] rounded-full animate-spin" />
            <p className="text-[#4C1D95]/60 font-black text-xs uppercase tracking-widest">Analyzing Immutable Logs...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
