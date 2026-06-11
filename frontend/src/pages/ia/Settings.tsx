import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Settings as SettingsIcon, 
  Shield, 
  Bell, 
  Building2, 
  Smartphone, 
  Globe, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2,
  Trash2,
  Moon,
  Zap,
  LayoutGrid,
  Sun,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../../components/SEO';
import { cn } from '../../lib/utils';
import Swal from 'sweetalert2';
import { useTheme } from '../../components/ThemeProvider';

interface Session {
  id: number;
  token_id: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  expires_at: string;
}

interface CollegeConfig {
  id: number;
  name: string;
  short_name: string;
  address: string;
  auto_accept_tasks: number;
  allow_task_decline: number;
}

interface FeatureGroup {
  category: string;
  features: { key: string; label: string; desc: string }[];
}

const FEATURE_METADATA: FeatureGroup[] = [
  {
    category: 'Reporting Features',
    features: [
      { key: 'reporting_personalized_faculty', label: 'Personalized Faculty Reports', desc: 'Allows faculty members to generate self-performance metrics and summaries.' },
      { key: 'reporting_department', label: 'Department Reports', desc: 'Enables HODs to view and export department-wide aggregated stats.' },
      { key: 'reporting_institution', label: 'Institution Reports', desc: 'Gives administrators dashboard exports and aggregate analytics.' },
      { key: 'reporting_historical', label: 'Historical Reports', desc: 'Allows downloading records of previous academic seasons.' },
      { key: 'reporting_performance_analytics', label: 'Performance Analytics', desc: 'Enables metrics visualizers and efficiency comparisons.' }
    ]
  },
  {
    category: 'Season Features',
    features: [
      { key: 'season_management', label: 'Season Management', desc: 'Allows defining custom calendar ranges and terms.' },
      { key: 'season_comparison_reports', label: 'Season Comparison', desc: 'Provides comparison metrics between different terms.' },
      { key: 'season_historical_analytics', label: 'Historical Season Analytics', desc: 'Analyzes long-term institutional progress.' },
      { key: 'season_locking', label: 'Season Locking', desc: 'Prevents edits and writes on past terms.' }
    ]
  },
  {
    category: 'Leaderboard Features',
    features: [
      { key: 'leaderboard_faculty', label: 'Faculty Leaderboard', desc: 'Shows points rankings among faculty members.' },
      { key: 'leaderboard_department', label: 'Department Leaderboard', desc: 'Shows comparative performance of departments.' },
      { key: 'leaderboard_institution_rankings', label: 'Institution Rankings', desc: 'Shows high-level leaderboard statistics.' },
      { key: 'leaderboard_performance_awards', label: 'Performance Awards', desc: 'Displays badge decorations and achievements.' }
    ]
  },
  {
    category: 'Task Management Features',
    features: [
      { key: 'task_group', label: 'Group Tasks', desc: 'Enables assigning tasks to collaborative groups.' },
      { key: 'task_broadcast', label: 'Broadcast Tasks', desc: 'Allows HODs to broadcast open tasks to all personnel.' },
      { key: 'task_acceptance_workflow', label: 'Task Acceptance Workflow', desc: 'Requires faculty to accept tasks manually.' },
      { key: 'task_auto_accept', label: 'Auto-Accept Tasks', desc: 'Skips acceptance steps for standard operations.' },
      { key: 'task_reminder_system', label: 'Reminder System', desc: 'Enables sending warnings and reminders.' },
      { key: 'task_deadline_tracking', label: 'Deadline Tracking', desc: 'Displays timers and delay indicators.' }
    ]
  },
  {
    category: 'Collaboration Features',
    features: [
      { key: 'collab_member_visibility', label: 'Team Member Visibility', desc: 'Lets departments browse other staff.' },
      { key: 'collab_profile_access', label: 'Faculty Profile Access', desc: 'Allows viewing staff profiles.' },
      { key: 'collab_tools', label: 'Faculty Collaboration Tools', desc: 'Enables chat rooms and comments on task boards.' }
    ]
  },
  {
    category: 'Notification Features',
    features: [
      { key: 'notice_popups', label: 'Popup Notifications', desc: 'Triggers alerts upon logging in.' },
      { key: 'notice_banners', label: 'Banner Notifications', desc: 'Displays alerts on topbars.' },
      { key: 'notice_broadcasts', label: 'Institution Broadcasts', desc: 'Enables institution-wide text alerts.' }
    ]
  }
];

type TabType = 'General' | 'Notifications' | 'Security' | 'Features';

export default function IASettings() {
  const { theme: currentTheme, setTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'General';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Settings State
  const [settings, setSettings] = useState({
    notification_settings: {
      email_assignments: true,
      email_evaluations: true,
      browser_alerts: true,
      broadcast_alerts: true
    },
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    profile_pic: null as string | null
  });

  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentToken, setCurrentToken] = useState<string | null>(null);

  // College & Features State
  const [college, setCollege] = useState<CollegeConfig | null>(null);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});

  // Security State
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchCollegeConfig();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/settings.php`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        if (data.data.settings) {
          const fetchedSettings = data.data.settings;
          if (fetchedSettings.notification_settings === null) {
            delete fetchedSettings.notification_settings;
          } else if (typeof fetchedSettings.notification_settings === 'string') {
            try {
              fetchedSettings.notification_settings = JSON.parse(fetchedSettings.notification_settings);
            } catch (e) {
              delete fetchedSettings.notification_settings;
            }
          }
          setSettings(prev => ({ ...prev, ...fetchedSettings }));
        }
        setSessions(data.data.sessions || []);
        setCurrentToken(data.data.current_token);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const fetchCollegeConfig = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/ia/college_settings.php`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.status === 'success') {
        setCollege(data.college);
        const flags: Record<string, boolean> = {};
        data.features.forEach((f: any) => {
          flags[f.feature_key] = (f.is_enabled === 1);
        });
        setFeatureFlags(flags);
      }
    } catch (error) {
      console.error('Failed to fetch college configurations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSettings = async (updates: any) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/settings.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });
      const data = await response.json();
      if (data.status === 'success') {
        setSettings(prev => ({ ...prev, ...updates }));
        Swal.fire({
          title: 'Updated!',
          text: 'Preferences saved.',
          icon: 'success',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
      }
    } catch (error) {
      Swal.fire('Error', 'Failed to update settings', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCollegeSetting = async (field: 'auto_accept_tasks' | 'allow_task_decline', val: number) => {
    if (!college) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/ia/college_settings.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [field]: val }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        setCollege(prev => prev ? { ...prev, [field]: val } : null);
        Swal.fire({ 
          title: 'Config Synchronized', 
          text: 'Institution configurations updated successfully.', 
          icon: 'success', 
          toast: true, 
          position: 'top-end', 
          showConfirmButton: false, 
          timer: 3000 
        });
      }
    } catch (e) {
      Swal.fire('Error', 'Failed to update configuration', 'error');
    }
  };

  const handleToggleFeature = async (key: string, isEnabled: boolean) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/ia/college_settings.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          features: { [key]: isEnabled }
        }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        setFeatureFlags(prev => ({ ...prev, [key]: isEnabled }));
        Swal.fire({ 
          title: 'Feature Synced', 
          text: `${key.replace(/_/g, ' ')} flag updated`, 
          icon: 'success', 
          toast: true, 
          position: 'top-end', 
          showConfirmButton: false, 
          timer: 2500 
        });
      }
    } catch (e) {
      Swal.fire('Error', 'Failed to toggle feature flag', 'error');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      Swal.fire('Error', 'Passwords do not match', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/security.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          current_password: passwords.current,
          new_password: passwords.new
        })
      });
      const data = await response.json();
      if (data.status === 'success') {
        Swal.fire('Success', 'Access protocol updated.', 'success');
        setPasswords({ current: '', new: '', confirm: '' });
      } else {
        Swal.fire('Error', data.message, 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Action failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTerminateSession = async (id: number) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/settings.php?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      fetchSettings();
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  const handleClearAllSessions = async () => {
    const result = await Swal.fire({
      title: 'End All Sessions?',
      text: 'You will be logged out from all other devices.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, End All',
      confirmButtonColor: '#EF4444'
    });

    if (result.isConfirmed) {
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/settings.php?all=1`, {
          method: 'DELETE',
          credentials: 'include'
        });
        fetchSettings();
        Swal.fire('Cleared', 'Other sessions invalidated.', 'success');
      } catch (error) {
        console.error('Action failed:', error);
      }
    }
  };

  const getPasswordStrength = () => {
    if (!passwords.new) return 0;
    let strength = 0;
    if (passwords.new.length >= 8) strength += 25;
    if (/[A-Z]/.test(passwords.new)) strength += 25;
    if (/[0-9]/.test(passwords.new)) strength += 25;
    if (/[^A-Za-z0-9]/.test(passwords.new)) strength += 25;
    return strength;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-[#7C3AED] animate-spin opacity-20" />
      </div>
    );
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 pb-20">
      <SEO title="Portal Settings" description="Manage institutional preferences and security." />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#1E1B4B] dark:text-indigo-50 tracking-tight">Portal Settings</h1>
          <p className="text-[#4C1D95]/60 dark:text-indigo-200/60 mt-1 font-bold flex items-center gap-2 text-sm uppercase tracking-widest">
            <SettingsIcon className="w-4 h-4 text-[#7C3AED]" />
            Manage institutional configurations
          </p>
        </div>

        <div className="flex items-center p-1.5 bg-[#7C3AED]/5 border border-[#7C3AED]/10 rounded-2xl w-full md:w-auto overflow-x-auto">
          {(['General', 'Features', 'Notifications', 'Security'] as const).map((tab) => {
            const Icon = tab === 'General' ? LayoutGrid : tab === 'Notifications' ? Bell : tab === 'Security' ? Shield : SettingsIcon;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer",
                  activeTab === tab 
                    ? "bg-white dark:bg-[#110A24] text-[#7C3AED] dark:text-violet-400 shadow-md border border-[#7C3AED]/10 dark:border-violet-500/20" 
                    : "text-[#4C1D95]/40 dark:text-indigo-200/40 hover:text-[#7C3AED]"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab === 'Features' ? 'Institution Config' : tab}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Sidebar Info */}
        <div className="lg:col-span-1 space-y-6 text-left">
          <div className="bg-white dark:bg-[#110A24] rounded-[2.5rem] border border-[#7C3AED]/10 dark:border-violet-500/20 p-8 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
              <Building2 className="w-32 h-32 text-[#7C3AED]" />
            </div>
            
            <div className="relative z-10">
              <div className="w-20 h-20 rounded-3xl bg-[#7C3AED]/5 border border-[#7C3AED]/10 dark:border-violet-500/20 overflow-hidden flex items-center justify-center mb-6 shadow-inner">
                {settings.profile_pic ? (
                  <img src={`${import.meta.env.VITE_API_URL}/${settings.profile_pic}`} className="w-full h-full object-cover" alt="" />
                ) : (
                  <Building2 className="w-10 h-10 text-[#7C3AED]" />
                )}
              </div>
              <h3 className="text-xl font-black text-[#1E1B4B] dark:text-indigo-50">{user.name}</h3>
              <p className="text-xs font-black text-[#7C3AED] dark:text-violet-400 uppercase tracking-widest mt-1">Institution Admin</p>
              
              <div className="mt-8 pt-8 border-t border-slate-100 dark:border-violet-500/10 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-400 dark:text-indigo-200/40">
                  <span>Assigned College</span>
                  <span className="font-bold text-[#1E1B4B] dark:text-indigo-50">{college?.name || user.college_name || 'Main Campus'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 dark:text-indigo-200/40 mt-3">
                  <span>Access Node</span>
                  <span className="font-bold text-emerald-500">Secure</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Settings Content */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {activeTab === 'General' && (
              <motion.div
                key="general"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white dark:bg-[#110A24] rounded-[2.5rem] border border-[#7C3AED]/10 dark:border-violet-500/20 p-10 shadow-sm text-left">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="p-3 bg-[#7C3AED]/5 dark:bg-violet-950/20 rounded-2xl border border-[#7C3AED]/10 dark:border-violet-500/10">
                      <LayoutGrid className="w-6 h-6 text-[#7C3AED] dark:text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[#1E1B4B] dark:text-indigo-50">General Preferences</h3>
                      <p className="text-sm font-bold text-[#4C1D95]/60 dark:text-indigo-200/60">Configure application display theme parameters.</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <h4 className="text-xs font-black text-[#1E1B4B] dark:text-indigo-50 uppercase tracking-widest mb-4">Appearance Theme</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(['light', 'dark', 'system'] as const).map((t) => {
                          const isSelected = currentTheme === t;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setTheme(t)}
                              className={cn(
                                "p-6 rounded-3xl border text-left transition-all relative overflow-hidden group cursor-pointer",
                                isSelected 
                                  ? "bg-white dark:bg-[#160E35] border-[#7C3AED] dark:border-violet-500/30 shadow-md" 
                                  : "bg-slate-50 dark:bg-[#1A1235]/30 border-slate-100 dark:border-slate-800/40 hover:border-[#7C3AED]/30"
                              )}
                            >
                              <div className="flex items-center justify-between mb-4">
                                <div className={cn(
                                  "p-2.5 rounded-xl border transition-all",
                                  isSelected
                                    ? "bg-[#7C3AED]/10 dark:bg-violet-950/40 border-[#7C3AED]/20 dark:border-violet-500/20 text-[#7C3AED] dark:text-violet-400"
                                    : "bg-white dark:bg-[#110A24] border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500"
                                )}>
                                  {t === 'light' ? <Sun className="w-5 h-5" /> : t === 'dark' ? <Moon className="w-5 h-5" /> : <SettingsIcon className="w-5 h-5" />}
                                </div>
                                {isSelected && (
                                  <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED] dark:bg-[#8B5CF6] shadow-[0_0_8px_#7C3AED]" />
                                )}
                              </div>
                              <p className="text-sm font-black text-[#1E1B4B] dark:text-indigo-50 capitalize tracking-tight">{t} Mode</p>
                              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                                {t === 'light' ? 'Crisp light environment' : t === 'dark' ? 'Futuristic sleek dark mode' : 'Adapts to system configuration'}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-6 flex justify-end border-t border-slate-100 dark:border-violet-500/10">
                      <button 
                        onClick={() => handleUpdateSettings({})}
                        disabled={isSubmitting}
                        className="px-10 py-4 bg-[#7C3AED] dark:bg-violet-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
                      >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply Defaults'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'Features' && college && (
              <motion.div
                key="features"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 text-left"
              >
                {/* General Configurations */}
                <div className="bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-[24px] p-6 space-y-6">
                  <h3 className="text-sm font-black text-[#1E1B4B] dark:text-white uppercase tracking-widest flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#7C3AED] dark:text-violet-400" /> General Configurations
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Auto Accept Tasks */}
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-[#181131]/30 px-5 py-4 rounded-2xl border border-slate-100 dark:border-violet-500/10">
                      <div>
                        <span className="text-[11px] font-black text-[#1E1B4B] dark:text-indigo-100 uppercase tracking-widest block">Auto-Accept Tasks</span>
                        <span className="text-[9px] text-slate-400 dark:text-indigo-200/40 font-bold block mt-0.5">Assigned tasks are auto-accepted (skips workflow)</span>
                      </div>
                      <button 
                        onClick={() => handleUpdateCollegeSetting('auto_accept_tasks', college.auto_accept_tasks == 1 ? 0 : 1)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border",
                          college.auto_accept_tasks == 1
                            ? "bg-[#7C3AED]/10 text-[#7C3AED] dark:bg-violet-950/40 dark:text-violet-400 border-[#7C3AED]/20 dark:border-violet-500/20"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        )}
                      >
                        {college.auto_accept_tasks == 1 ? 'ON (Auto-Accept)' : 'OFF (Workflow)'}
                      </button>
                    </div>

                    {/* Allow Task Decline */}
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-[#181131]/30 px-5 py-4 rounded-2xl border border-slate-100 dark:border-violet-500/10">
                      <div>
                        <span className="text-[11px] font-black text-[#1E1B4B] dark:text-indigo-100 uppercase tracking-widest block">Allow Task Decline</span>
                        <span className="text-[9px] text-slate-400 dark:text-indigo-200/40 font-bold block mt-0.5">Faculty users can decline assigned tasks</span>
                      </div>
                      <button 
                        onClick={() => handleUpdateCollegeSetting('allow_task_decline', college.allow_task_decline == 1 ? 0 : 1)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border",
                          college.allow_task_decline == 1
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                        )}
                      >
                        {college.allow_task_decline == 1 ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Feature Flags */}
                <div className="bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-[24px] p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-[#1E1B4B] dark:text-white uppercase tracking-widest flex items-center gap-2">
                      <SettingsIcon className="w-5 h-5 text-[#7C3AED] dark:text-violet-400" /> Feature Flags Manager
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-violet-200/40 mt-1 font-bold">Configure active modules and visibility settings across dashboards.</p>
                  </div>

                  <div className="space-y-8">
                    {FEATURE_METADATA.map((group) => (
                      <div key={group.category} className="space-y-4">
                        <h4 className="text-[10px] font-black text-[#7C3AED] dark:text-violet-400 uppercase tracking-widest border-b border-slate-100 dark:border-violet-500/10 pb-2">{group.category}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {group.features.map((feature) => {
                            const isEnabled = featureFlags[feature.key] !== false; // Default true
                            return (
                              <div 
                                key={feature.key}
                                onClick={() => handleToggleFeature(feature.key, !isEnabled)}
                                className={cn(
                                  "flex items-start gap-4 bg-slate-50 dark:bg-[#181131]/30 px-5 py-4 rounded-2xl border cursor-pointer hover:bg-slate-100/50 dark:hover:bg-[#181131]/50 transition-all select-none",
                                  isEnabled ? "border-transparent" : "border-slate-200 dark:border-violet-500/10 opacity-60"
                                )}
                              >
                                <div className={cn(
                                  "w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 mt-0.5",
                                  isEnabled 
                                    ? "bg-[#7C3AED] border-[#7C3AED] dark:bg-violet-600 dark:border-violet-600 text-white" 
                                    : "border-slate-300 dark:border-violet-500/20 bg-white dark:bg-[#110A24]"
                                )}>
                                  {isEnabled && <CheckCircle2 className="w-3.5 h-3.5" />}
                                </div>
                                <div className="space-y-1">
                                  <span className="text-xs font-black text-[#1E1B4B] dark:text-indigo-100 block leading-tight">{feature.label}</span>
                                  <span className="text-[10px] text-slate-400 dark:text-indigo-200/30 font-bold block leading-snug">{feature.desc}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'Notifications' && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white dark:bg-[#110A24] rounded-[2.5rem] border border-[#7C3AED]/10 dark:border-violet-500/20 p-10 shadow-sm text-left">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="p-3 bg-[#7C3AED]/5 dark:bg-violet-950/20 rounded-2xl border border-[#7C3AED]/10 dark:border-violet-500/10">
                      <Bell className="w-6 h-6 text-[#7C3AED] dark:text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[#1E1B4B] dark:text-indigo-50">Notification Preferences</h3>
                      <p className="text-sm font-bold text-[#4C1D95]/60 dark:text-indigo-200/60">Configure alert parameters for task activities.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {Object.entries(settings.notification_settings || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-[#181131] border border-slate-100 dark:border-violet-500/10 rounded-3xl group hover:bg-white hover:border-[#7C3AED]/20 transition-all">
                        <div className="flex items-center gap-4 text-left">
                          <div className="p-2.5 bg-white dark:bg-[#110A24] rounded-xl border border-slate-200 dark:border-violet-500/10 text-slate-400 group-hover:text-[#7C3AED] transition-all">
                            {key.includes('email') ? <Globe className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-sm font-black text-[#1E1B4B] dark:text-indigo-50 capitalize tracking-tight">{key.replace(/_/g, ' ')}</p>
                            <p className="text-xs font-bold text-slate-400 dark:text-indigo-200/40">Receive alerts via {key.split('_')[0]}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            const newSettings = { ...settings.notification_settings, [key]: !value };
                            handleUpdateSettings({ notification_settings: newSettings });
                          }}
                          className={cn(
                            "w-12 h-6 rounded-full relative transition-all duration-300 cursor-pointer",
                            value ? "bg-[#7C3AED] shadow-sm" : "bg-slate-200 dark:bg-violet-950/60"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300",
                            value ? "left-7" : "left-1"
                          )} />
                        </button>
                      </div>
                    ))}

                    <div className="mt-10 p-8 bg-slate-50 dark:bg-[#181131]/40 border border-slate-100 dark:border-violet-500/10 rounded-[2rem]">
                      <div className="flex items-center gap-3 mb-6">
                        <Moon className="w-5 h-5 text-[#7C3AED] dark:text-violet-400" />
                        <h4 className="text-sm font-black text-[#1E1B4B] dark:text-indigo-50 uppercase tracking-widest">Quiet Hours</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 dark:text-indigo-200/40 uppercase tracking-widest ml-1">Start Time</label>
                          <input 
                            type="time" 
                            value={settings.quiet_hours_start || ''}
                            onChange={(e) => setSettings({...settings, quiet_hours_start: e.target.value})}
                            className="w-full px-6 py-4 bg-white dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 rounded-2xl text-sm font-black outline-none focus:border-[#7C3AED]"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 dark:text-indigo-200/40 uppercase tracking-widest ml-1">End Time</label>
                          <input 
                            type="time" 
                            value={settings.quiet_hours_end || ''}
                            onChange={(e) => setSettings({...settings, quiet_hours_end: e.target.value})}
                            className="w-full px-6 py-4 bg-white dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 rounded-2xl text-sm font-black outline-none focus:border-[#7C3AED]"
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => handleUpdateSettings({
                          quiet_hours_start: settings.quiet_hours_start,
                          quiet_hours_end: settings.quiet_hours_end
                        })}
                        className="mt-6 w-full py-4 bg-white dark:bg-[#110A24] border border-[#7C3AED]/20 dark:border-violet-500/10 text-[#7C3AED] dark:text-violet-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#7C3AED] hover:text-white transition-all cursor-pointer"
                      >
                        Apply Quiet Hours
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'Security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Change Password */}
                <div className="bg-white dark:bg-[#110A24] rounded-[2.5rem] border border-[#7C3AED]/10 dark:border-violet-500/20 p-10 shadow-sm text-left">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="p-3 bg-[#7C3AED]/5 dark:bg-violet-950/20 rounded-2xl border border-[#7C3AED]/10 dark:border-violet-500/10">
                      <Shield className="w-6 h-6 text-[#7C3AED] dark:text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[#1E1B4B] dark:text-indigo-50">Security Protocols</h3>
                      <p className="text-sm font-bold text-[#4C1D95]/60 dark:text-indigo-200/60">Configure login parameters and password security.</p>
                    </div>
                  </div>

                  <form onSubmit={handlePasswordChange} className="space-y-6 max-w-xl">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#1E1B4B] dark:text-indigo-50 uppercase tracking-widest ml-1">Current Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C3AED]" />
                        <input 
                          type={showPass ? "text" : "password"}
                          value={passwords.current}
                          onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                          className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-[#181131] border border-slate-100 dark:border-violet-500/10 rounded-2xl text-sm font-bold focus:bg-white focus:border-[#7C3AED] transition-all outline-none text-[#1E1B4B] dark:text-indigo-50"
                          placeholder="••••••••"
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#7C3AED]"
                        >
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#1E1B4B] dark:text-indigo-50 uppercase tracking-widest ml-1">New Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C3AED]" />
                          <input 
                            type={showPass ? "text" : "password"}
                            value={passwords.new}
                            onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-[#181131] border border-slate-100 dark:border-violet-500/10 rounded-2xl text-sm font-bold focus:bg-white focus:border-[#7C3AED] transition-all outline-none text-[#1E1B4B] dark:text-indigo-50"
                            placeholder="Minimum 8 characters"
                          />
                        </div>
                      </div>

                      {/* Strength Meter */}
                      <div className="px-1 space-y-1.5 text-left">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                          <span className="text-slate-400">Access Strength</span>
                          <span className={cn(
                            getPasswordStrength() <= 25 ? "text-rose-500" :
                            getPasswordStrength() <= 50 ? "text-amber-500" :
                            getPasswordStrength() <= 75 ? "text-blue-500" : "text-emerald-500"
                          )}>
                            {getPasswordStrength() <= 25 ? "Weak" :
                             getPasswordStrength() <= 50 ? "Fair" :
                             getPasswordStrength() <= 75 ? "Good" : "Very Strong"}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-[#1a1334] rounded-full overflow-hidden flex gap-1">
                          {[25, 50, 75, 100].map((step) => (
                            <div 
                              key={step}
                              className={cn(
                                "h-full flex-1 transition-all duration-500",
                                getPasswordStrength() >= step 
                                  ? (step <= 25 ? "bg-rose-500" : step <= 50 ? "bg-amber-500" : step <= 75 ? "bg-blue-500" : "bg-emerald-500")
                                  : "bg-transparent"
                              )}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#1E1B4B] dark:text-indigo-50 uppercase tracking-widest ml-1">Confirm New Password</label>
                        <input 
                          type={showPass ? "text" : "password"}
                          value={passwords.confirm}
                          onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                          className="w-full px-6 py-4 bg-slate-50 dark:bg-[#181131] border border-slate-100 dark:border-violet-500/10 rounded-2xl text-sm font-bold focus:bg-white focus:border-[#7C3AED] transition-all outline-none text-[#1E1B4B] dark:text-indigo-50"
                          placeholder="Repeat new password"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={isSubmitting || !passwords.new || passwords.new !== passwords.confirm}
                      className="w-full py-4 bg-[#1E184B] dark:bg-violet-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Access Protocol'}
                    </button>
                  </form>
                </div>

                {/* Active Sessions */}
                <div className="bg-white dark:bg-[#110A24] rounded-[2rem] sm:rounded-[2.5rem] border border-[#7C3AED]/10 dark:border-violet-500/20 p-5 sm:p-10 shadow-sm text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-[#7C3AED]/5 dark:bg-violet-950/20 rounded-2xl border border-[#7C3AED]/10 dark:border-violet-500/10 shrink-0">
                        <Globe className="w-6 h-6 text-[#7C3AED] dark:text-violet-400" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-black text-[#1E1B4B] dark:text-indigo-50">Active Sessions</h3>
                        <p className="text-xs sm:text-sm font-bold text-[#4C1D95]/60 dark:text-indigo-200/60">Manage devices currently logged into your IA portal.</p>
                      </div>
                    </div>
                    {sessions.length > 1 && (
                      <button 
                        onClick={handleClearAllSessions}
                        className="w-full sm:w-auto px-6 py-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-150 hover:bg-rose-500 hover:text-white transition-all text-center flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        End All Others
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 bg-slate-50 dark:bg-[#181131] border border-slate-100 dark:border-violet-500/10 rounded-3xl group gap-4">
                        <div className="flex items-start sm:items-center gap-3 sm:gap-5 min-w-0 w-full sm:w-auto">
                          <div className={cn(
                            "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center border transition-all shadow-sm shrink-0",
                            session.token_id === currentToken ? "bg-[#7C3AED] text-white border-[#7C3AED]" : "bg-white dark:bg-[#110A24] text-slate-400 border-slate-200 dark:border-violet-500/10"
                          )}>
                            <Smartphone className="w-5.5 h-5.5 sm:w-6 sm:h-6 shrink-0" />
                          </div>
                          <div className="min-w-0 text-left">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-black text-[#1E1B4B] dark:text-indigo-50 tracking-tight">{session.ip_address}</p>
                              {session.token_id === currentToken && (
                                <span className="text-[8px] font-black bg-[#7C3AED]/10 text-[#7C3AED] px-2 py-0.5 rounded-full uppercase tracking-widest">Current</span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-indigo-200/40 mt-0.5 break-all line-clamp-2" title={session.user_agent}>{session.user_agent}</p>
                            <p className="text-[9px] font-black text-slate-300 dark:text-violet-400/40 uppercase tracking-widest mt-1">
                              Last active: {formatDate(session.created_at)}
                            </p>
                          </div>
                        </div>
                        {session.token_id !== currentToken && (
                          <div className="w-full sm:w-auto flex justify-end shrink-0 border-t border-slate-200/40 sm:border-t-0 pt-3 sm:pt-0">
                            <button 
                              onClick={() => handleTerminateSession(session.id)}
                              className="w-full sm:w-auto px-4 py-2.5 sm:p-3 bg-white dark:bg-[#110A24] hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 rounded-xl border border-slate-200 dark:border-violet-500/10 hover:border-rose-200 transition-all shadow-sm flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 shrink-0" />
                              <span className="sm:hidden">Revoke Session</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
