import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  AlertTriangle, 
  ShieldAlert, 
  Power, 
  Settings2, 
  ShieldCheck, 
  Zap, 
  Loader2, 
  Unlock, 
  Search,
  Globe,
  Database,
  Lock,
  Trash2,
  ListFilter,
  Users
} from 'lucide-react';
import Swal from 'sweetalert2';
import { cn } from '@/lib/utils';
import SEO from '@/components/SEO';
import { getAppName } from '../../utils/config';

interface SystemSettings {
  maintenance_mode: string;
  pause_new_tasks: string;
  global_multiplier: string;
  max_bonus_points: string;
}

interface BanRecord {
  id: number;
  ip_address: string;
  device_fingerprint: string;
  reason: string;
  banned_at: string;
  unbanned_at: string | null;
  status: 'active' | 'unbanned';
}

interface AttemptRecord {
  id: number;
  ip_address: string;
  device_fingerprint: string;
  email: string;
  attempted_at: string;
  is_successful: number;
}

const ControlsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    maintenance_mode: 'false',
    pause_new_tasks: 'false',
    global_multiplier: '1.0',
    max_bonus_points: '5'
  });
  
  const [bans, setBans] = useState<BanRecord[]>([]);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'bans' | 'attempts'>('bans');
  const appName = getAppName();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchSettings(), fetchBansAndAttempts()]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/settings.php`, { credentials: 'include' });
      const json = await res.json();
      if (json.status === 'success') {
        setSettings({
          maintenance_mode: json.data.maintenance_mode || 'false',
          pause_new_tasks: json.data.pause_new_tasks || 'false',
          global_multiplier: json.data.global_multiplier || '1.0',
          max_bonus_points: json.data.max_bonus_points || '5'
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBansAndAttempts = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/bans.php`, { credentials: 'include' });
      const json = await res.json();
      if (json.status === 'success') {
        setBans(json.data.bans || []);
        setAttempts(json.data.attempts || []);
      }
    } catch (e) {
      console.error('Failed to load security registry logs', e);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/settings.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings)
      });
      const json = await res.json();
      if (json.status === 'success') {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (e) {
      console.error(e);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnban = async (banId: number, ip: string) => {
    const result = await Swal.fire({
      title: 'Unban Client?',
      text: `This will instantly restore full platform access for IP: ${ip}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#7C3AED',
      cancelButtonColor: '#EF4444',
      confirmButtonText: 'Yes, restore access!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/bans.php`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id: banId })
        });
        const json = await res.json();
        if (json.status === 'success') {
          Swal.fire({
            title: 'Access Restored!',
            text: `Client ${ip} has been successfully whitelisted.`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
          });
          fetchBansAndAttempts();
        } else {
          Swal.fire('Failed!', json.message || 'Operation aborted.', 'error');
        }
      } catch (err) {
        Swal.fire('Error!', 'System pipeline communication failure.', 'error');
      }
    }
  };

  const handleDeleteLog = async (type: 'ban' | 'attempt', id: number) => {
    const result = await Swal.fire({
      title: 'Purge Record?',
      text: "This specific security log will be permanently deleted from database archives.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/bans.php?type=${type}&id=${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        const json = await res.json();
        if (json.status === 'success') {
          Swal.fire({
            title: 'Deleted!',
            text: json.message,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
          });
          fetchBansAndAttempts();
        }
      } catch (err) {
        Swal.fire('Error!', 'Failed to clear data.', 'error');
      }
    }
  };

  const handleClearAll = async (clearType: 'all_bans' | 'all_attempts') => {
    const registryName = clearType === 'all_bans' ? 'Banned Clients List' : 'Brute-force Attempts Log';
    const result = await Swal.fire({
      title: `Clear Entire ${registryName}?`,
      text: "Warning! This will permanently delete ALL corresponding records. This action cannot be undone.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, clear all data!'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/bans.php?type=${clearType}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        const json = await res.json();
        if (json.status === 'success') {
          Swal.fire('Cleared!', json.message, 'success');
          fetchBansAndAttempts();
        }
      } catch (err) {
        Swal.fire('Error!', 'Clear command failed on server.', 'error');
      }
    }
  };

  const filteredBans = bans.filter(ban => {
    const query = searchQuery.toLowerCase();
    return (
      ban.ip_address.toLowerCase().includes(query) ||
      ban.device_fingerprint.toLowerCase().includes(query) ||
      ban.reason.toLowerCase().includes(query) ||
      ban.status.toLowerCase().includes(query)
    );
  });

  const filteredAttempts = attempts.filter(att => {
    const query = searchQuery.toLowerCase();
    return (
      att.ip_address.toLowerCase().includes(query) ||
      att.device_fingerprint.toLowerCase().includes(query) ||
      att.email.toLowerCase().includes(query)
    );
  });

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
        <p className="text-xs font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest animate-pulse">Initializing Control Pipelines...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500">
      <SEO title="System Controls" description={`Global application controls, security lockout settings, and administrative toggles for ${appName}.`} />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#1E184B] dark:text-indigo-100 tracking-tight">System Controls</h1>
          <p className="text-[#1E184B]/60 dark:text-violet-400/60 mt-2 font-bold flex items-center gap-2 text-sm">
            <Settings2 className="w-4 h-4 text-indigo-500" />
            Global toggles, brute-force security logs, and gamification rules.
          </p>
        </div>
        
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full md:w-auto px-8 py-4 bg-[#7C3AED] hover:bg-[#6D28D9] dark:bg-[#7C3AED] dark:hover:bg-[#6D28D9] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[#7C3AED]/20 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {isSaving ? 'Deploying...' : 'Deploy Settings'}
        </button>
      </div>

      {saveStatus === 'success' && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-500/10 font-bold text-sm flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5" /> Global system parameters deployed successfully across all clusters.
        </motion.div>
      )}

      {saveStatus === 'error' && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-100 dark:border-rose-500/10 font-bold text-sm flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5" /> Failed to deploy settings. Verify database server sync.
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Security & Access */}
        <div className="bg-white dark:bg-[#1A0F35]/20 backdrop-blur-md p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-violet-500/20 shadow-sm space-y-6 sm:space-y-8 flex flex-col justify-between">
          <div className="flex items-center gap-4 border-b border-slate-50 dark:border-violet-500/10 pb-6">
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 rounded-2xl flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#1E184B] dark:text-indigo-100">Access & Security</h2>
              <p className="text-xs font-bold text-slate-400 dark:text-violet-400/60">Lock down public access channels.</p>
            </div>
          </div>

          <div className="space-y-6 flex-1 flex flex-col justify-center">
            <div className="flex items-start justify-between gap-6 p-5 rounded-3xl border border-slate-50 dark:border-violet-500/10 bg-slate-50/50 dark:bg-violet-950/20">
              <div>
                <h3 className="font-black text-[#1E184B] dark:text-indigo-100 flex items-center gap-2 text-sm sm:text-base">
                  Maintenance Mode
                  {settings.maintenance_mode === 'true' && <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-455 text-[8px] font-black uppercase tracking-widest">Active</span>}
                </h3>
                <p className="text-xs text-slate-500 dark:text-violet-400/60 font-bold mt-1 leading-relaxed">Locks out HODs and Faculty. Only Admins can establish database sessions. Use during major migrations.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={settings.maintenance_mode === 'true'}
                  onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked ? 'true' : 'false' })}
                />
                <div className="w-14 h-7 bg-slate-200 dark:bg-violet-950/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-rose-500 dark:peer-checked:bg-rose-600 shadow-inner"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Task Rules */}
        <div className="bg-white dark:bg-[#1A0F35]/20 backdrop-blur-md p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-violet-500/20 shadow-sm space-y-6 sm:space-y-8 flex flex-col justify-between">
          <div className="flex items-center gap-4 border-b border-slate-50 dark:border-violet-500/10 pb-6">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-405 rounded-2xl flex items-center justify-center">
              <Power className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#1E184B] dark:text-indigo-100">Task Engine Rules</h2>
              <p className="text-xs font-bold text-slate-400 dark:text-violet-400/60">Control core operational flows.</p>
            </div>
          </div>

          <div className="space-y-6 flex-1 flex flex-col justify-center">
            <div className="flex items-start justify-between gap-6 p-5 rounded-3xl border border-slate-50 dark:border-violet-500/10 bg-slate-50/50 dark:bg-violet-950/20">
              <div>
                <h3 className="font-black text-[#1E184B] dark:text-indigo-100 flex items-center gap-2 text-sm sm:text-base">
                  Pause New Tasks
                  {settings.pause_new_tasks === 'true' && <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[8px] font-black uppercase tracking-widest font-mono">Active</span>}
                </h3>
                <p className="text-xs text-slate-500 dark:text-violet-400/60 font-bold mt-1 leading-relaxed">Prevents HODs from broadcasting or assigning new tasks. Standard lockout protocol for semester closings.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={settings.pause_new_tasks === 'true'}
                  onChange={(e) => setSettings({ ...settings, pause_new_tasks: e.target.checked ? 'true' : 'false' })}
                />
                <div className="w-14 h-7 bg-slate-200 dark:bg-violet-950/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-500 dark:peer-checked:bg-indigo-600 shadow-inner"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Gamification Engine */}
        <div className="bg-white dark:bg-[#1A0F35]/20 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-100 dark:border-violet-500/20 shadow-sm space-y-8 md:col-span-2">
          <div className="flex items-center gap-4 border-b border-slate-50 dark:border-violet-500/10 pb-6">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400 rounded-2xl flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#1E184B] dark:text-indigo-100">Gamification Engine</h2>
              <p className="text-xs font-bold text-slate-400 dark:text-violet-400/60">Configure global point caps and multiplier rates.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-[0.2em] block">Global Points Multiplier</label>
              <div className="flex items-center gap-4">
                <input 
                  type="number" 
                  step="0.1" 
                  min="0.1"
                  value={settings.global_multiplier}
                  onChange={(e) => setSettings({ ...settings, global_multiplier: e.target.value })}
                  className="w-full p-4 bg-slate-50 dark:bg-[#110A24] border-none dark:border dark:border-violet-500/20 rounded-2xl text-lg font-black text-[#1E184B] dark:text-indigo-100 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none"
                />
                <span className="text-2xl font-black text-slate-300 dark:text-violet-400/40">x</span>
              </div>
              <p className="text-xs font-bold text-slate-400 dark:text-violet-400/60">Multiply all newly awarded task weights network-wide (Default: 1.0)</p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-[0.2em] block">Max Bonus Points</label>
              <div className="flex items-center gap-4">
                <input 
                  type="number" 
                  step="1" 
                  min="0"
                  value={settings.max_bonus_points}
                  onChange={(e) => setSettings({ ...settings, max_bonus_points: e.target.value })}
                  className="w-full p-4 bg-slate-50 dark:bg-[#110A24] border-none dark:border dark:border-violet-500/20 rounded-2xl text-lg font-black text-[#1E184B] dark:text-indigo-100 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none"
                />
                <span className="text-2xl font-black text-slate-300 dark:text-violet-400/40">PTS</span>
              </div>
              <p className="text-xs font-bold text-slate-400 dark:text-violet-400/60">Maximum threshold an HOD can award for closing tasks (Default: 5)</p>
            </div>
          </div>
        </div>

        {/* Security & Access Locks Management Dashboard */}
        <div className="bg-white dark:bg-[#1A0F35]/20 backdrop-blur-md p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-violet-500/20 shadow-sm space-y-6 md:col-span-2 flex flex-col">
          
          {/* Dashboard Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-50 dark:border-violet-500/10 pb-6 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/40 text-[#7C3AED] dark:text-violet-400 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#1E184B] dark:text-indigo-100">{appName} Access Firewall</h2>
                <p className="text-xs font-bold text-slate-400 dark:text-violet-400/60">Configure brute-force lockouts, review detailed audits, and purge databases.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Live Search bar */}
              <div className="relative w-full sm:w-60 group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-violet-400 group-focus-within:text-[#7C3AED] dark:group-focus-within:text-violet-300 transition-colors" />
                <input 
                  type="text" 
                  placeholder={activeSubTab === 'bans' ? "Search locked clients..." : "Search attempts history..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/20 rounded-xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED]/40 dark:focus:border-violet-400 focus:ring-2 focus:ring-[#7C3AED]/5 transition-all text-xs font-bold text-slate-800 dark:text-indigo-100"
                />
              </div>

              {/* Dynamic Purge Buttons (Clear all registry logs) */}
              {activeSubTab === 'bans' ? (
                bans.length > 0 && (
                  <button
                    onClick={() => handleClearAll('all_bans')}
                    className="px-4 py-2.5 border border-rose-100 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white dark:hover:bg-rose-900/40 transition-all text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 shadow-sm cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> Purge Bans
                  </button>
                )
              ) : (
                attempts.length > 0 && (
                  <button
                    onClick={() => handleClearAll('all_attempts')}
                    className="px-4 py-2.5 border border-rose-100 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white dark:hover:bg-rose-900/40 transition-all text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 shadow-sm cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> Purge Attempts
                  </button>
                )
              )}
            </div>
          </div>

          {/* Sub-tab Navigation controls */}
          <div className="overflow-x-auto pb-1">
            <div className="flex border border-slate-100 dark:border-violet-500/10 p-1.5 bg-slate-50/50 dark:bg-violet-950/20 rounded-2xl w-max min-w-full sm:w-fit sm:min-w-0">
              <button
                onClick={() => { setActiveSubTab('bans'); setSearchQuery(''); }}
                className={cn(
                  "flex-1 sm:flex-none px-3 sm:px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap",
                  activeSubTab === 'bans' 
                    ? "bg-white dark:bg-[#110A24] text-[#7C3AED] dark:text-violet-400 shadow-sm font-extrabold border border-slate-100 dark:border-violet-500/20" 
                    : "text-slate-400 dark:text-violet-400/50 hover:text-slate-700 dark:hover:text-violet-300"
                )}
              >
                Lockouts ({bans.length})
              </button>
              <button
                onClick={() => { setActiveSubTab('attempts'); setSearchQuery(''); }}
                className={cn(
                  "flex-1 sm:flex-none px-3 sm:px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap",
                  activeSubTab === 'attempts' 
                    ? "bg-white dark:bg-[#110A24] text-[#7C3AED] dark:text-violet-400 shadow-sm font-extrabold border border-slate-100 dark:border-violet-500/20" 
                    : "text-slate-400 dark:text-violet-400/50 hover:text-slate-700 dark:hover:text-violet-300"
                )}
              >
                Attempts Log ({attempts.length})
              </button>
            </div>
          </div>

          {/* Sub-tab Panels */}
          <div className="flex-1 overflow-x-auto min-h-[300px]">
            {activeSubTab === 'bans' ? (
              /* PANEL A: BANNED CLIENTS TABLE */
              filteredBans.length > 0 ? (
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-violet-500/10">
                      <th className="py-4 px-3 text-[10px] font-black text-slate-400 dark:text-violet-400/80 uppercase tracking-widest">Client IP</th>
                      <th className="py-4 px-3 text-[10px] font-black text-slate-400 dark:text-violet-400/80 uppercase tracking-widest">Device Fingerprint</th>
                      <th className="py-4 px-3 text-[10px] font-black text-slate-400 dark:text-violet-400/80 uppercase tracking-widest">Lockout Reason</th>
                      <th className="py-4 px-3 text-[10px] font-black text-slate-400 dark:text-violet-400/80 uppercase tracking-widest">Ban Timestamp</th>
                      <th className="py-4 px-3 text-[10px] font-black text-slate-400 dark:text-violet-400/80 uppercase tracking-widest text-center">Status</th>
                      <th className="py-4 px-3 text-[10px] font-black text-slate-400 dark:text-violet-400/80 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-violet-500/10">
                    {filteredBans.map((ban) => (
                      <tr key={ban.id} className="group hover:bg-slate-50/50 dark:hover:bg-violet-950/20 transition-colors">
                        <td className="py-4 px-3 text-xs font-bold text-[#1E184B] dark:text-indigo-100">{ban.ip_address}</td>
                        <td className="py-4 px-3 text-xs font-mono text-slate-400 dark:text-violet-400/50 font-bold">{ban.device_fingerprint || 'N/A'}</td>
                        <td className="py-4 px-3 text-xs font-bold text-slate-500 dark:text-violet-400/70">{ban.reason}</td>
                        <td className="py-4 px-3 text-xs text-slate-400 dark:text-violet-400/50 font-bold">{formatTimestamp(ban.banned_at)}</td>
                        <td className="py-4 px-3 text-center">
                          <span className={cn(
                            "inline-block px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border",
                            ban.status === 'active'
                              ? "bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-500/10 text-rose-600 dark:text-rose-400 animate-pulse"
                              : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          )}>
                            {ban.status}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            {ban.status === 'active' && (
                              <button
                                onClick={() => handleUnban(ban.id, ban.ip_address)}
                                title="Unban IP and Restore Access"
                                className="p-2 rounded-xl bg-indigo-50 dark:bg-violet-950/30 border border-indigo-100 dark:border-violet-500/20 text-[#7C3AED] dark:text-violet-400 hover:bg-[#7C3AED] dark:hover:bg-violet-500 hover:text-white transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1 font-black text-[10px] uppercase tracking-wider cursor-pointer"
                              >
                                <Unlock className="w-3.5 h-3.5" /> Unban
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteLog('ban', ban.id)}
                              title="Delete Ban Log Entry"
                              className="p-2 rounded-xl border border-slate-100 dark:border-violet-500/15 text-slate-400 dark:text-violet-400/60 hover:text-rose-500 dark:hover:text-rose-450 hover:border-rose-100 dark:hover:border-rose-550/25 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                  <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/20 rounded-full flex items-center justify-center">
                    <ShieldCheck className="w-7 h-7 text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#1E184B] dark:text-indigo-100">Access Firewall Intact</h4>
                    <p className="text-xs text-slate-400 dark:text-violet-400/60 font-bold mt-1">No active brute-force bans or lockouts detected. All client pipelines secure.</p>
                  </div>
                </div>
              )
            ) : (
              /* PANEL B: LOGIN ATTEMPTS AUDIT TABLE (Multiple fake tries log showing emails) */
              filteredAttempts.length > 0 ? (
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-violet-500/10">
                      <th className="py-4 px-3 text-[10px] font-black text-slate-400 dark:text-violet-400/80 uppercase tracking-widest">Target Email</th>
                      <th className="py-4 px-3 text-[10px] font-black text-slate-400 dark:text-violet-400/80 uppercase tracking-widest">Client IP</th>
                      <th className="py-4 px-3 text-[10px] font-black text-slate-400 dark:text-violet-400/80 uppercase tracking-widest">Device Fingerprint</th>
                      <th className="py-4 px-3 text-[10px] font-black text-slate-400 dark:text-violet-400/80 uppercase tracking-widest">Failed Attempt Date</th>
                      <th className="py-4 px-3 text-[10px] font-black text-slate-400 dark:text-violet-400/80 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-violet-500/10">
                    {filteredAttempts.map((att) => (
                      <tr key={att.id} className="group hover:bg-slate-50/50 dark:hover:bg-violet-950/20 transition-colors">
                        <td className="py-4 px-3 text-xs font-black text-indigo-600 dark:text-indigo-400">{att.email}</td>
                        <td className="py-4 px-3 text-xs font-bold text-[#1E184B] dark:text-indigo-100">{att.ip_address}</td>
                        <td className="py-4 px-3 text-xs font-mono text-slate-400 dark:text-violet-400/50 font-bold">{att.device_fingerprint || 'N/A'}</td>
                        <td className="py-4 px-3 text-xs text-slate-400 dark:text-violet-400/50 font-bold">{formatTimestamp(att.attempted_at)}</td>
                        <td className="py-4 px-3 text-right">
                          <button
                            onClick={() => handleDeleteLog('attempt', att.id)}
                            title="Delete Attempt Log Entry"
                            className="p-2 rounded-xl border border-slate-100 dark:border-violet-500/15 text-slate-400 dark:text-violet-400/60 hover:text-rose-500 dark:hover:text-rose-455 hover:border-rose-100 dark:hover:border-rose-550/25 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all active:scale-95 flex items-center justify-center ml-auto cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                  <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/20 rounded-full flex items-center justify-center">
                    <ListFilter className="w-7 h-7 text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#1E184B] dark:text-indigo-100">Attempts Feed Empty</h4>
                    <p className="text-xs text-slate-400 dark:text-violet-400/60 font-bold mt-1">No failed login attempts logged. Credentials pipeline performing optimally.</p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ControlsPage;
