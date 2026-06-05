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
  Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';
import { cn, formatDate } from '@/lib/utils';
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

const Settings: React.FC = () => {
  const { theme: currentTheme, setTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'Security' | 'Notifications' | 'Department') || 'Department';
  const [activeTab, setActiveTab] = useState<'Security' | 'Notifications' | 'Department'>(initialTab);
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

  // Security State
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    fetchSettings();
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
          text: 'Departmental preferences saved.',
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-[#7C3AED] animate-spin opacity-20" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 pb-20 px-3 md:px-0">
      <SEO title="Portal Control" description="Manage departmental protocols and security." />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#1E184B] tracking-tight">Portal Control</h1>
          <p className="text-[#1E184B]/60 mt-1 font-bold flex items-center gap-2 text-sm uppercase tracking-widest">
            <SettingsIcon className="w-4 h-4 text-[#7C3AED]" />
            Manage institutional protocols
          </p>
        </div>

        <div className="flex items-center p-1.5 bg-[#7C3AED]/5 border border-[#7C3AED]/10 rounded-2xl w-full md:w-auto">
          {(['Department', 'Notifications', 'Security'] as const).map((tab) => {
            const Icon = tab === 'Department' ? LayoutGrid : tab === 'Notifications' ? Bell : Shield;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  activeTab === tab 
                    ? "bg-white text-[#7C3AED] shadow-lg shadow-[#7C3AED]/10 border border-[#7C3AED]/10" 
                    : "text-[#1E184B]/40 hover:text-[#1E184B]"
                )}
              >
                <Icon className={cn("w-4 h-4 md:hidden", activeTab === tab ? "block" : "block")} />
                <span className={cn(
                  "transition-all duration-300",
                  activeTab === tab ? "block" : "hidden md:block"
                )}>
                  {tab}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Sidebar Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-[#7C3AED]/10 p-8 shadow-xl shadow-[#7C3AED]/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
              <Building2 className="w-32 h-32 text-[#7C3AED]" />
            </div>
            
            <div className="relative z-10">
              <div className="w-20 h-20 rounded-3xl bg-[#7C3AED]/5 border border-[#7C3AED]/10 overflow-hidden flex items-center justify-center mb-6 shadow-inner">
                {settings.profile_pic ? (
                  <img src={`${import.meta.env.VITE_API_URL}/${settings.profile_pic}`} className="w-full h-full object-cover" alt="" />
                ) : (
                  <Building2 className="w-10 h-10 text-[#7C3AED]" />
                )}
              </div>
              <h3 className="text-xl font-black text-[#1E184B]">{JSON.parse(localStorage.getItem('user') || '{}').name}</h3>
              <p className="text-xs font-black text-[#7C3AED] uppercase tracking-widest mt-1">Head of Department</p>
              
              <div className="mt-8 pt-8 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dept. Health</span>
                  <span className="text-[10px] font-black text-emerald-500">Optimal</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '92%' }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                  />
                </div>
                <p className="text-[10px] font-bold text-slate-400 italic">Faculty engagement is at 92%</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] rounded-[2.5rem] p-8 text-white shadow-2xl shadow-[#7C3AED]/20 relative overflow-hidden">
            <Zap className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5" />
            <h4 className="text-lg font-black mb-2 uppercase tracking-tight">Mission Control</h4>
            <p className="text-white/60 text-sm font-medium mb-6">Standardize how missions are delivered and evaluated across your department.</p>
            <button className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
              View Audit Logs
            </button>
          </div>
        </div>

        {/* Main Settings Content */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {activeTab === 'Department' && (
              <motion.div
                key="dept"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white dark:bg-[#110A24] rounded-[2.5rem] border border-[#7C3AED]/10 dark:border-[#8B5CF6]/10 p-10 shadow-xl shadow-[#7C3AED]/5 dark:shadow-none">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="p-3 bg-[#7C3AED]/5 dark:bg-[#8B5CF6]/5 rounded-2xl border border-[#7C3AED]/10 dark:border-[#8B5CF6]/15">
                      <LayoutGrid className="w-6 h-6 text-[#7C3AED] dark:text-[#A78BFA]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[#1E184B] dark:text-white">Departmental Protocols</h3>
                      <p className="text-sm font-bold text-[#1E184B]/40 dark:text-white/40">Configure default behaviors for the portal.</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <h4 className="text-xs font-black text-[#1E184B] dark:text-white uppercase tracking-widest mb-4">Appearance Theme</h4>
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
                                  ? "bg-white dark:bg-[#160E35] border-[#7C3AED] dark:border-[#8B5CF6] shadow-xl shadow-[#7C3AED]/10 dark:shadow-none" 
                                  : "bg-slate-50 dark:bg-[#1A1235]/30 border-slate-100 dark:border-slate-800/40 hover:border-[#7C3AED]/30 dark:hover:border-[#8B5CF6]/30"
                              )}
                            >
                              <div className="flex items-center justify-between mb-4">
                                <div className={cn(
                                  "p-2.5 rounded-xl border transition-all",
                                  isSelected
                                    ? "bg-[#7C3AED]/10 dark:bg-[#8B5CF6]/10 border-[#7C3AED]/20 dark:border-[#8B5CF6]/20 text-[#7C3AED] dark:text-[#A78BFA]"
                                    : "bg-white dark:bg-[#110A24] border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500"
                                )}>
                                  {t === 'light' ? <Sun className="w-5 h-5" /> : t === 'dark' ? <Moon className="w-5 h-5" /> : <SettingsIcon className="w-5 h-5" />}
                                </div>
                                {isSelected && (
                                  <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED] dark:bg-[#8B5CF6] shadow-[0_0_8px_#7C3AED] dark:shadow-[0_0_8px_#8B5CF6]" />
                                )}
                              </div>
                              <p className="text-sm font-black text-[#1E184B] dark:text-white capitalize tracking-tight">{t} Mode</p>
                              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                                {t === 'light' ? 'Crisp light environment' : t === 'dark' ? 'Futuristic sleek dark mode' : 'Adapts to system configuration'}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-6 flex justify-end border-t border-slate-100 dark:border-slate-800/40">
                      <button 
                        onClick={() => handleUpdateSettings({})}
                        disabled={isSubmitting}
                        className="px-10 py-4 bg-[#7C3AED] dark:bg-[#8B5CF6] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-[#7C3AED]/20 dark:shadow-[#8B5CF6]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                      >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply Defaults'}
                      </button>
                    </div>
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
                <div className="bg-white rounded-[2.5rem] border border-[#7C3AED]/10 p-10 shadow-xl shadow-[#7C3AED]/5">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="p-3 bg-[#7C3AED]/5 rounded-2xl border border-[#7C3AED]/10">
                      <Bell className="w-6 h-6 text-[#7C3AED]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[#1E184B]">Broadcast Engine</h3>
                      <p className="text-sm font-bold text-[#1E184B]/40">Manage your administrative alert flow.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {Object.entries(settings.notification_settings || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-3xl group hover:bg-white hover:border-[#7C3AED]/20 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-white rounded-xl border border-slate-200 group-hover:border-[#7C3AED]/20 text-slate-400 group-hover:text-[#7C3AED] transition-all">
                            {key.includes('email') ? <Globe className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-sm font-black text-[#1E184B] capitalize tracking-tight">{key.replace(/_/g, ' ')}</p>
                            <p className="text-xs font-bold text-slate-400">Receive alerts via {key.split('_')[0]}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            const newSettings = { ...settings.notification_settings, [key]: !value };
                            handleUpdateSettings({ notification_settings: newSettings });
                          }}
                          className={cn(
                            "w-12 h-6 rounded-full relative transition-all duration-300",
                            value ? "bg-[#7C3AED] shadow-lg shadow-[#7C3AED]/20" : "bg-slate-200"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300",
                            value ? "left-7" : "left-1"
                          )} />
                        </button>
                      </div>
                    ))}

                    <div className="mt-10 p-8 bg-[#1E184B]/[0.02] border border-[#1E184B]/5 rounded-[2rem]">
                      <div className="flex items-center gap-3 mb-6">
                        <Moon className="w-5 h-5 text-[#7C3AED]" />
                        <h4 className="text-sm font-black text-[#1E184B] uppercase tracking-widest">Quiet Hours</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Time</label>
                          <input 
                            type="time" 
                            value={settings.quiet_hours_start || ''}
                            onChange={(e) => setSettings({...settings, quiet_hours_start: e.target.value})}
                            className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-[#7C3AED] transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Time</label>
                          <input 
                            type="time" 
                            value={settings.quiet_hours_end || ''}
                            onChange={(e) => setSettings({...settings, quiet_hours_end: e.target.value})}
                            className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-[#7C3AED] transition-all"
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => handleUpdateSettings({
                          quiet_hours_start: settings.quiet_hours_start,
                          quiet_hours_end: settings.quiet_hours_end
                        })}
                        className="mt-6 w-full py-4 bg-white border border-[#7C3AED]/20 text-[#7C3AED] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#7C3AED] hover:text-white transition-all"
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
                <div className="bg-white rounded-[2.5rem] border border-[#7C3AED]/10 p-10 shadow-xl shadow-[#7C3AED]/5">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="p-3 bg-[#7C3AED]/5 rounded-2xl border border-[#7C3AED]/10">
                      <Shield className="w-6 h-6 text-[#7C3AED]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[#1E184B]">Security Protocols</h3>
                      <p className="text-sm font-bold text-[#1E184B]/40">Manage your administrative access.</p>
                    </div>
                  </div>

                  <form onSubmit={handlePasswordChange} className="space-y-6 max-w-xl">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest ml-1">Current Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C3AED]" />
                        <input 
                          type={showPass ? "text" : "password"}
                          value={passwords.current}
                          onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                          className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-[#7C3AED] transition-all outline-none"
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
                        <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest ml-1">New Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C3AED]" />
                          <input 
                            type={showPass ? "text" : "password"}
                            value={passwords.new}
                            onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-[#7C3AED] transition-all outline-none"
                            placeholder="Minimum 8 characters"
                          />
                        </div>
                      </div>

                      {/* Strength Meter */}
                      <div className="px-1 space-y-1.5">
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
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
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
                        <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest ml-1">Confirm New Password</label>
                        <input 
                          type={showPass ? "text" : "password"}
                          value={passwords.confirm}
                          onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-[#7C3AED] transition-all outline-none"
                          placeholder="Repeat new password"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={isSubmitting || !passwords.new || passwords.new !== passwords.confirm}
                      className="w-full py-4 bg-[#1E184B] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-[#1E184B]/20 hover:bg-[#2D246D] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Access Protocol'}
                    </button>
                  </form>
                </div>

                {/* Active Sessions */}
                <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-[#7C3AED]/10 p-5 sm:p-10 shadow-xl shadow-[#7C3AED]/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-[#7C3AED]/5 rounded-2xl border border-[#7C3AED]/10 shrink-0">
                        <Globe className="w-6 h-6 text-[#7C3AED]" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-black text-[#1E184B]">Active Sessions</h3>
                        <p className="text-xs sm:text-sm font-bold text-[#1E184B]/40">Manage devices currently logged into your HOD portal.</p>
                      </div>
                    </div>
                    {sessions.length > 1 && (
                      <button 
                        onClick={handleClearAllSessions}
                        className="w-full sm:w-auto px-6 py-3 bg-rose-50 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-100 hover:bg-rose-500 hover:text-white transition-all text-center flex items-center justify-center shrink-0"
                      >
                        End All Others
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 bg-slate-50 border border-slate-100 rounded-3xl group gap-4">
                        <div className="flex items-start sm:items-center gap-3 sm:gap-5 min-w-0 w-full sm:w-auto">
                          <div className={cn(
                            "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center border transition-all shadow-sm shrink-0",
                            session.token_id === currentToken ? "bg-[#7C3AED] text-white border-[#7C3AED]" : "bg-white text-slate-400 border-slate-200"
                          )}>
                            <Smartphone className="w-5.5 h-5.5 sm:w-6 sm:h-6 shrink-0" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-black text-[#1E184B] tracking-tight">{session.ip_address}</p>
                              {session.token_id === currentToken && (
                                <span className="text-[8px] font-black bg-[#7C3AED]/10 text-[#7C3AED] px-2 py-0.5 rounded-full uppercase tracking-widest">Current</span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5 break-all line-clamp-2" title={session.user_agent}>{session.user_agent}</p>
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">
                              Last active: {formatDate(session.created_at)}
                            </p>
                          </div>
                        </div>
                        {session.token_id !== currentToken && (
                          <div className="w-full sm:w-auto flex justify-end shrink-0 border-t border-slate-200/40 sm:border-t-0 pt-3 sm:pt-0">
                            <button 
                              onClick={() => handleTerminateSession(session.id)}
                              className="w-full sm:w-auto px-4 py-2.5 sm:p-3 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl border border-slate-200 hover:border-rose-200 transition-all shadow-sm flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider"
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
};

export default Settings;
