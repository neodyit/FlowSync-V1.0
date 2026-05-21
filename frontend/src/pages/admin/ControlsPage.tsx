import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, AlertTriangle, ShieldAlert, Power, Settings2, ShieldCheck, Zap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import SEO from '@/components/SEO';

interface SystemSettings {
  maintenance_mode: string;
  pause_new_tasks: string;
  global_multiplier: string;
  max_bonus_points: string;
}

const ControlsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    maintenance_mode: 'false',
    pause_new_tasks: 'false',
    global_multiplier: '1.0',
    max_bonus_points: '5'
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10">
      <SEO title="System Controls" description="Global application controls and administrative toggles." />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#1E184B] tracking-tight">System Controls</h1>
          <p className="text-[#1E184B]/60 mt-2 font-bold flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-indigo-500" />
            Mission-critical global toggles and application rules.
          </p>
        </div>
        
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-8 py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-[#7C3AED]/20 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-3"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {isSaving ? 'Deploying...' : 'Deploy Settings'}
        </button>
      </div>

      {saveStatus === 'success' && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 font-bold text-sm flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" /> Settings deployed successfully across the network.
        </motion.div>
      )}

      {saveStatus === 'error' && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 font-bold text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> Failed to deploy settings. Check network logs.
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Security & Access */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
          <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#1E184B]">Access & Security</h2>
              <p className="text-xs font-bold text-slate-400">Lock down the system if needed.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-start justify-between gap-6 p-4 rounded-2xl border border-slate-50 bg-slate-50/50">
              <div>
                <h3 className="font-black text-[#1E184B] flex items-center gap-2">
                  Maintenance Mode
                  {settings.maintenance_mode === 'true' && <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[9px] uppercase tracking-widest">Active</span>}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Locks out all HODs and Faculties. Only Admins can access the system. Use during major upgrades.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={settings.maintenance_mode === 'true'}
                  onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked ? 'true' : 'false' })}
                />
                <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-rose-500 shadow-inner"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Task Rules */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
          <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center">
              <Power className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#1E184B]">Task Engine Rules</h2>
              <p className="text-xs font-bold text-slate-400">Control task assignment flow.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-start justify-between gap-6 p-4 rounded-2xl border border-slate-50 bg-slate-50/50">
              <div>
                <h3 className="font-black text-[#1E184B] flex items-center gap-2">
                  Pause New Tasks
                  {settings.pause_new_tasks === 'true' && <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 text-[9px] uppercase tracking-widest">Active</span>}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Prevents HODs from broadcasting or assigning new tasks. Useful at the end of a semester.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={settings.pause_new_tasks === 'true'}
                  onChange={(e) => setSettings({ ...settings, pause_new_tasks: e.target.checked ? 'true' : 'false' })}
                />
                <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-500 shadow-inner"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Gamification Engine */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 md:col-span-2">
          <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#1E184B]">Gamification Engine</h2>
              <p className="text-xs font-bold text-slate-400">Configure global point modifiers and caps.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-xs font-black text-[#1E184B] uppercase tracking-widest block">Global Points Multiplier</label>
              <div className="flex items-center gap-4">
                <input 
                  type="number" 
                  step="0.1" 
                  min="0.1"
                  value={settings.global_multiplier}
                  onChange={(e) => setSettings({ ...settings, global_multiplier: e.target.value })}
                  className="w-full p-4 bg-slate-50 border-none rounded-xl text-lg font-black text-[#1E184B] focus:ring-4 focus:ring-amber-500/10 transition-all outline-none"
                />
                <span className="text-2xl font-black text-slate-300">x</span>
              </div>
              <p className="text-xs font-bold text-slate-400">Multiply all newly awarded points (Default: 1.0)</p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-[#1E184B] uppercase tracking-widest block">Max Bonus Points</label>
              <div className="flex items-center gap-4">
                <input 
                  type="number" 
                  step="1" 
                  min="0"
                  value={settings.max_bonus_points}
                  onChange={(e) => setSettings({ ...settings, max_bonus_points: e.target.value })}
                  className="w-full p-4 bg-slate-50 border-none rounded-xl text-lg font-black text-[#1E184B] focus:ring-4 focus:ring-amber-500/10 transition-all outline-none"
                />
                <span className="text-2xl font-black text-slate-300">PTS</span>
              </div>
              <p className="text-xs font-bold text-slate-400">Maximum bonus points an HOD can award (Default: 5)</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ControlsPage;
