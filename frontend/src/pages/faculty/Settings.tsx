import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Shield, 
  Bell, 
  User, 
  Trophy, 
  Clock, 
  Smartphone, 
  Globe, 
  ChevronRight, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2,
  Trash2,
  Moon,
  Zap,
  Target,
  Hash,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';
import { cn, formatDate } from '@/lib/utils';
import Swal from 'sweetalert2';

interface Session {
  id: number;
  token_id: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  expires_at: string;
}

const FacultySettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Security' | 'Notifications' | 'Profile'>('Profile');
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
    expertise_tags: '',
    office_hours: '',
    availability_status: 'Ready',
    merit_goal: 100,
    profile_pic: null as string | null
  });

  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [currentPoints, setCurrentPoints] = useState(0);

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
        setCurrentPoints(data.data.current_points || 0);
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
          text: 'Settings saved successfully.',
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
        Swal.fire('Success', 'Password changed successfully', 'success');
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
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <SEO title="Account Settings" description="Manage your mission profile, notifications and security." />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#1E184B] dark:text-indigo-100 tracking-tight">Portal Control</h1>
          <p className="text-[#1E184B]/60 dark:text-violet-400/60 mt-1 font-bold flex items-center gap-2 text-sm uppercase tracking-widest">
            <Settings className="w-4 h-4 text-[#7C3AED] dark:text-violet-400" />
            Personalize your institutional experience
          </p>
        </div>

        <div className="flex items-center p-1.5 bg-[#7C3AED]/5 dark:bg-violet-950/20 border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-2xl w-full md:w-auto">
          {(['Profile', 'Notifications', 'Security'] as const).map((tab) => {
            const Icon = tab === 'Profile' ? User : tab === 'Notifications' ? Bell : Shield;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  activeTab === tab 
                    ? "bg-white dark:bg-[#1A0F35] text-[#7C3AED] dark:text-violet-400 shadow-lg shadow-[#7C3AED]/10 dark:shadow-violet-950/20 border border-[#7C3AED]/10 dark:border-violet-500/20" 
                    : "text-[#1E184B]/40 dark:text-violet-400/40 hover:text-[#1E184B] dark:hover:text-indigo-100"
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
          <div className="bg-white dark:bg-[#1A0F35] rounded-[2.5rem] border border-[#7C3AED]/10 dark:border-violet-500/15 p-8 shadow-xl shadow-[#7C3AED]/5 dark:shadow-violet-950/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
              <User className="w-32 h-32 text-[#7C3AED] dark:text-violet-400" />
            </div>
            
            <div className="relative z-10">
              <div className="w-20 h-20 rounded-3xl bg-[#7C3AED]/5 dark:bg-violet-950/30 border border-[#7C3AED]/10 dark:border-violet-500/20 overflow-hidden flex items-center justify-center mb-6 shadow-inner">
                {settings.profile_pic ? (
                  <img src={`${import.meta.env.VITE_API_URL}/${settings.profile_pic}`} className="w-full h-full object-cover" alt="" />
                ) : (
                  <User className="w-10 h-10 text-[#7C3AED] dark:text-violet-400" />
                )}
              </div>
              <h3 className="text-xl font-black text-[#1E184B] dark:text-indigo-100">{JSON.parse(localStorage.getItem('user') || '{}').name}</h3>
              <p className="text-sm font-bold text-[#1E184B]/50 dark:text-violet-400/50 mb-6">{JSON.parse(localStorage.getItem('user') || '{}').email}</p>
              
              <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-violet-500/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 dark:text-violet-400/40 uppercase tracking-widest">Monthly Goal</span>
                  <span className="text-[10px] font-black text-[#7C3AED] dark:text-violet-400">{currentPoints} / {settings.merit_goal} pts</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-[#110A24] rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (currentPoints / settings.merit_goal) * 100)}%` }}
                    className="h-full bg-gradient-to-r from-[#7C3AED] to-[#A855F7]"
                  />
                </div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-violet-400/40 italic">
                  {Math.round((currentPoints / settings.merit_goal) * 100)}% of your target reached
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1E184B] to-[#2D246D] rounded-[2.5rem] p-8 text-white shadow-2xl shadow-[#1E184B]/20 relative overflow-hidden">
            <Zap className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5" />
            <h4 className="text-lg font-black mb-2 uppercase tracking-tight">Mission Readiness</h4>
            <p className="text-white/60 text-sm font-medium mb-6">Keep your status updated so the HOD can assign relevant tasks.</p>
            
            <div className="space-y-3">
              {(['Ready', 'Overloaded', 'DND'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => handleUpdateSettings({ availability_status: status })}
                  className={cn(
                    "w-full px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-between group",
                    settings.availability_status === status 
                      ? "bg-white dark:bg-indigo-100 text-[#1E184B] dark:text-[#110A24] border-white dark:border-indigo-100 shadow-xl shadow-white/10 dark:shadow-indigo-950/20" 
                      : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                  )}
                >
                  {status}
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    status === 'Ready' ? "bg-emerald-500 shadow-lg shadow-emerald-500/50" :
                    status === 'Overloaded' ? "bg-amber-500" : "bg-rose-500"
                  )} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Settings Content */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {activeTab === 'Profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white dark:bg-[#1A0F35] rounded-[2.5rem] border border-[#7C3AED]/10 dark:border-violet-500/15 p-10 shadow-xl shadow-[#7C3AED]/5 dark:shadow-violet-950/10">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="p-3 bg-[#7C3AED]/5 dark:bg-violet-950/30 rounded-2xl border border-[#7C3AED]/10 dark:border-violet-500/20">
                      <Target className="w-6 h-6 text-[#7C3AED] dark:text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[#1E184B] dark:text-indigo-100">Academic Profile</h3>
                      <p className="text-sm font-bold text-[#1E184B]/40 dark:text-violet-400/50">Manage your expertise and availability.</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest ml-1">Expertise Tags</label>
                        <div className="relative">
                          <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C3AED] dark:text-violet-400" />
                          <input 
                            type="text"
                            value={settings.expertise_tags || ''}
                            onChange={(e) => setSettings({...settings, expertise_tags: e.target.value})}
                            placeholder="e.g. Research, Python, Lab"
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 rounded-2xl text-sm font-bold dark:text-indigo-100 focus:bg-white dark:focus:bg-[#150D2E] focus:border-[#7C3AED] dark:focus:border-violet-500 focus:ring-4 focus:ring-[#7C3AED]/5 dark:focus:ring-violet-500/5 transition-all outline-none dark:placeholder-violet-400/20"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest ml-1">Office Hours</label>
                        <div className="relative">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C3AED] dark:text-violet-400" />
                          <input 
                            type="text"
                            value={settings.office_hours || ''}
                            onChange={(e) => setSettings({...settings, office_hours: e.target.value})}
                            placeholder="e.g. Mon-Fri, 10AM - 2PM"
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 rounded-2xl text-sm font-bold dark:text-indigo-100 focus:bg-white dark:focus:bg-[#150D2E] focus:border-[#7C3AED] dark:focus:border-violet-500 focus:ring-4 focus:ring-[#7C3AED]/5 dark:focus:ring-violet-500/5 transition-all outline-none dark:placeholder-violet-400/20"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest">Monthly Merit Goal</label>
                        <span className="text-sm font-black text-[#7C3AED] dark:text-violet-400 bg-[#7C3AED]/5 dark:bg-violet-950/30 px-4 py-1.5 rounded-full border border-[#7C3AED]/10 dark:border-violet-500/20">{settings.merit_goal} Points</span>
                      </div>
                      <input 
                        type="range"
                        min="10"
                        max="1000"
                        step="10"
                        value={settings.merit_goal || 10}
                        onChange={(e) => setSettings({...settings, merit_goal: parseInt(e.target.value)})}
                        className="w-full h-2 bg-slate-100 dark:bg-[#110A24] rounded-full appearance-none cursor-pointer accent-[#7C3AED]"
                      />
                      <div className="flex justify-between text-[9px] font-black text-slate-300 dark:text-violet-400/30 uppercase tracking-tighter">
                        <span>10 Points</span>
                        <span>1000 Points</span>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-50 dark:border-violet-500/10 flex justify-end">
                      <button 
                        onClick={() => handleUpdateSettings({
                          expertise_tags: settings.expertise_tags,
                          office_hours: settings.office_hours,
                          merit_goal: settings.merit_goal
                        })}
                        disabled={isSubmitting}
                        className="px-10 py-4 bg-[#7C3AED] dark:bg-violet-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-[#7C3AED]/20 dark:shadow-violet-950/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                      >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
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
                <div className="bg-white dark:bg-[#1A0F35] rounded-[2.5rem] border border-[#7C3AED]/10 dark:border-violet-500/15 p-10 shadow-xl shadow-[#7C3AED]/5 dark:shadow-violet-950/10">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="p-3 bg-[#7C3AED]/5 dark:bg-violet-950/30 rounded-2xl border border-[#7C3AED]/10 dark:border-violet-500/20">
                      <Bell className="w-6 h-6 text-[#7C3AED] dark:text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[#1E184B] dark:text-indigo-100">Alert Preferences</h3>
                      <p className="text-sm font-bold text-[#1E184B]/40 dark:text-violet-400/50">Configure how and when you stay updated.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {Object.entries(settings.notification_settings || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 rounded-3xl group hover:bg-white dark:hover:bg-[#1A0F35] hover:border-[#7C3AED]/20 dark:hover:border-violet-500/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-white dark:bg-[#150D2E] rounded-xl border border-slate-200 dark:border-violet-500/10 group-hover:border-[#7C3AED]/20 dark:group-hover:border-violet-500/30 text-slate-400 dark:text-violet-400/40 group-hover:text-[#7C3AED] dark:group-hover:text-violet-400 transition-all">
                            {key.includes('email') ? <Globe className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-sm font-black text-[#1E184B] dark:text-indigo-100 capitalize tracking-tight">{key.replace(/_/g, ' ')}</p>
                            <p className="text-xs font-bold text-slate-400 dark:text-violet-400/40">Receive alerts via {key.split('_')[0]}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            const newSettings = { ...settings.notification_settings, [key]: !value };
                            handleUpdateSettings({ notification_settings: newSettings });
                          }}
                          className={cn(
                            "w-12 h-6 rounded-full relative transition-all duration-300",
                            value ? "bg-[#7C3AED] dark:bg-violet-600 shadow-lg shadow-[#7C3AED]/20 dark:shadow-violet-950/30" : "bg-slate-200 dark:bg-[#110A24]"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white dark:bg-indigo-100 rounded-full transition-all duration-300",
                            value ? "left-7" : "left-1"
                          )} />
                        </button>
                      </div>
                    ))}

                    <div className="mt-10 p-8 bg-[#1E184B]/[0.02] dark:bg-violet-950/5 border border-[#1E184B]/5 dark:border-violet-500/10 rounded-[2rem]">
                      <div className="flex items-center gap-3 mb-6">
                        <Moon className="w-5 h-5 text-[#7C3AED] dark:text-violet-400" />
                        <h4 className="text-sm font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest">Quiet Hours</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 dark:text-violet-400/40 uppercase tracking-widest ml-1">Start Time</label>
                          <input 
                            type="time" 
                            value={settings.quiet_hours_start || ''}
                            onChange={(e) => setSettings({...settings, quiet_hours_start: e.target.value})}
                            className="w-full px-6 py-4 bg-white dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 rounded-2xl text-sm font-black dark:text-indigo-100 outline-none focus:border-[#7C3AED] dark:focus:border-violet-500 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 dark:text-violet-400/40 uppercase tracking-widest ml-1">End Time</label>
                          <input 
                            type="time" 
                            value={settings.quiet_hours_end || ''}
                            onChange={(e) => setSettings({...settings, quiet_hours_end: e.target.value})}
                            className="w-full px-6 py-4 bg-white dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 rounded-2xl text-sm font-black dark:text-indigo-100 outline-none focus:border-[#7C3AED] dark:focus:border-violet-500 transition-all"
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => handleUpdateSettings({
                          quiet_hours_start: settings.quiet_hours_start,
                          quiet_hours_end: settings.quiet_hours_end
                        })}
                        className="mt-6 w-full py-4 bg-white dark:bg-[#110A24] border border-[#7C3AED]/20 dark:border-violet-500/20 text-[#7C3AED] dark:text-violet-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#7C3AED] dark:hover:bg-violet-600 hover:text-white dark:hover:text-white transition-all"
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
                <div className="bg-white dark:bg-[#1A0F35] rounded-[2.5rem] border border-[#7C3AED]/10 dark:border-violet-500/15 p-10 shadow-xl shadow-[#7C3AED]/5 dark:shadow-violet-950/10">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="p-3 bg-[#7C3AED]/5 dark:bg-violet-950/30 rounded-2xl border border-[#7C3AED]/10 dark:border-violet-500/20">
                      <Shield className="w-6 h-6 text-[#7C3AED] dark:text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[#1E184B] dark:text-indigo-100">Security Suite</h3>
                      <p className="text-sm font-bold text-[#1E184B]/40 dark:text-violet-400/50">Manage your access and active sessions.</p>
                    </div>
                  </div>

                  <form onSubmit={handlePasswordChange} className="space-y-6 max-w-xl">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest ml-1">Current Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C3AED] dark:text-violet-400" />
                        <input 
                          type={showPass ? "text" : "password"}
                          value={passwords.current}
                          onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                          className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 rounded-2xl text-sm font-bold dark:text-indigo-100 focus:bg-white dark:focus:bg-[#150D2E] focus:border-[#7C3AED] dark:focus:border-violet-500 transition-all outline-none dark:placeholder-violet-400/20"
                          placeholder="••••••••"
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#7C3AED] dark:hover:text-violet-400"
                        >
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest ml-1">New Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C3AED] dark:text-violet-400" />
                          <input 
                            type={showPass ? "text" : "password"}
                            value={passwords.new}
                            onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 rounded-2xl text-sm font-bold dark:text-indigo-100 focus:bg-white dark:focus:bg-[#150D2E] focus:border-[#7C3AED] dark:focus:border-violet-500 transition-all outline-none dark:placeholder-violet-400/20"
                            placeholder="Minimum 8 characters"
                          />
                        </div>
                      </div>

                      {/* Strength Meter */}
                      <div className="px-1 space-y-1.5">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                          <span className="text-slate-400 dark:text-violet-400/40">Security Strength</span>
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
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-[#110A24] rounded-full overflow-hidden flex gap-1">
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
                        <label className="text-[10px] font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest ml-1">Confirm New Password</label>
                        <input 
                          type={showPass ? "text" : "password"}
                          value={passwords.confirm}
                          onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                          className="w-full px-6 py-4 bg-slate-50 dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 rounded-2xl text-sm font-bold dark:text-indigo-100 focus:bg-white dark:focus:bg-[#150D2E] focus:border-[#7C3AED] dark:focus:border-violet-500 transition-all outline-none dark:placeholder-violet-400/20"
                          placeholder="Repeat new password"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={isSubmitting || !passwords.new || passwords.new !== passwords.confirm}
                      className="w-full py-4 bg-[#1E184B] dark:bg-violet-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-[#1E184B]/20 dark:shadow-violet-950/20 hover:bg-[#2D246D] dark:hover:bg-violet-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Access Protocol'}
                    </button>
                  </form>
                </div>

                {/* Active Sessions */}
                <div className="bg-white dark:bg-[#1A0F35] rounded-[2.5rem] border border-[#7C3AED]/10 dark:border-violet-500/15 p-10 shadow-xl shadow-[#7C3AED]/5 dark:shadow-violet-950/10">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-[#7C3AED]/5 dark:bg-violet-950/30 rounded-2xl border border-[#7C3AED]/10 dark:border-violet-500/20">
                        <Globe className="w-6 h-6 text-[#7C3AED] dark:text-violet-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-[#1E184B] dark:text-indigo-100">Active Sessions</h3>
                        <p className="text-sm font-bold text-[#1E184B]/40 dark:text-violet-400/50">Manage devices currently logged into your portal.</p>
                      </div>
                    </div>
                    {sessions.length > 1 && (
                      <button 
                        onClick={handleClearAllSessions}
                        className="px-6 py-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-100 dark:border-rose-500/20 hover:bg-rose-500 dark:hover:bg-rose-600 hover:text-white dark:hover:text-white transition-all"
                      >
                        End All Others
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 rounded-3xl group">
                        <div className="flex items-center gap-5">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all shadow-sm",
                            session.token_id === currentToken 
                              ? "bg-[#7C3AED] dark:bg-violet-600 text-white border-[#7C3AED] dark:border-violet-600" 
                              : "bg-white dark:bg-[#150D2E] text-slate-400 dark:text-violet-400/40 border-slate-200 dark:border-violet-500/10"
                          )}>
                            <Smartphone className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-black text-[#1E184B] dark:text-indigo-100 tracking-tight">{session.ip_address}</p>
                              {session.token_id === currentToken && (
                                <span className="text-[8px] font-black bg-[#7C3AED]/10 dark:bg-violet-950/40 text-[#7C3AED] dark:text-violet-400 px-2 py-0.5 rounded-full uppercase tracking-widest">Current</span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-violet-400/40 line-clamp-1 mt-0.5">{session.user_agent}</p>
                            <p className="text-[9px] font-black text-slate-300 dark:text-violet-400/30 uppercase tracking-widest mt-1">
                              Last active: {formatDate(session.created_at)}
                            </p>
                          </div>
                        </div>
                        {session.token_id !== currentToken && (
                          <button 
                            onClick={() => handleTerminateSession(session.id)}
                            className="p-3 bg-white dark:bg-[#150D2E] text-slate-400 dark:text-violet-400/50 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-500 dark:hover:text-rose-400 border border-slate-100 dark:border-violet-500/10 hover:border-rose-100 dark:hover:border-rose-500/20 transition-all shadow-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

export default FacultySettings;
