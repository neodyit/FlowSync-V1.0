import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Award, 
  Camera, 
  Globe, 
  Lock, 
  Save, 
  Plus, 
  Trash2, 
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import { cn } from "@/lib/utils";
import SEO from '@/components/SEO';

interface Achievement {
  id: string;
  title: string;
  date: string;
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role_name: string;
  department_name?: string;
  phone: string;
  bio: string;
  achievements: Achievement[];
  profile_pic: string | null;
  is_public: number;
  designation: string;
}

const Profile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/profile.php`, {
        credentials: 'include'
      });
      const result = await response.json();
      if (result.status === 'success') {
        setProfile(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/profile.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profile)
      });
      const result = await response.json();
      if (result.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'Profile Updated',
          text: 'Your mission credentials have been synchronized.',
          timer: 2000,
          showConfirmButton: false
        });
        localStorage.setItem('user', JSON.stringify({
          ...JSON.parse(localStorage.getItem('user') || '{}'),
          name: profile.name,
          profile_pic: profile.profile_pic
        }));
        window.dispatchEvent(new CustomEvent('profile-updated'));
        setIsEditing(false);
      }
    } catch (error) {
      Swal.fire('Error', 'Failed to synchronize profile.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!profile) return;
    const newIsPublic = profile.is_public ? 0 : 1;
    
    setProfile(prev => prev ? { ...prev, is_public: newIsPublic } : null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/profile.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...profile, is_public: newIsPublic })
      });
      const result = await response.json();
      if (result.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: newIsPublic ? 'Profile is now Public' : 'Profile is now Private',
          text: newIsPublic ? 'Other department members can now search and view your profile.' : 'Your profile is now hidden from the departmental roster.',
          timer: 2000,
          showConfirmButton: false
        });
        window.dispatchEvent(new CustomEvent('profile-updated'));
      } else {
        setProfile(prev => prev ? { ...prev, is_public: profile.is_public } : null);
        Swal.fire('Error', 'Failed to update visibility status.', 'error');
      }
    } catch (error) {
      setProfile(prev => prev ? { ...prev, is_public: profile.is_public } : null);
      Swal.fire('Error', 'Failed to update visibility status.', 'error');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profile_pic', file);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/profile.php`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      const result = await response.json();
      if (result.status === 'success') {
        setProfile(prev => prev ? { ...prev, profile_pic: result.url } : null);
        localStorage.setItem('user', JSON.stringify({
          ...JSON.parse(localStorage.getItem('user') || '{}'),
          profile_pic: result.url
        }));
        window.dispatchEvent(new CustomEvent('profile-updated'));
        Swal.fire('Updated', 'Profile picture has been updated.', 'success');
      }
    } catch (error) {
      Swal.fire('Error', 'Failed to upload image.', 'error');
    }
  };

  const addAchievement = () => {
    if (!profile) return;
    const newAchievement = {
      id: Math.random().toString(36).substr(2, 9),
      title: '',
      date: new Date().toISOString().split('T')[0]
    };
    setProfile({
      ...profile,
      achievements: [...profile.achievements, newAchievement]
    });
  };

  const removeAchievement = (id: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      achievements: profile.achievements.filter(a => a.id !== id)
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <SEO title={`${profile.name} | Professional Profile`} description="View and manage your academic and professional mission credentials." />

      {/* Hero Header */}
      <div className="relative bg-white rounded-[3rem] border border-slate-100 p-8 md:p-12 shadow-sm overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#7C3AED]/5 to-transparent rounded-full -mr-32 -mt-32 blur-3xl" />
        
        <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
          <div className="relative group">
            <div className="w-40 h-40 rounded-[2.5rem] bg-slate-100 overflow-hidden border-4 border-white shadow-xl">
              {profile.profile_pic ? (
                <img 
                  src={`${import.meta.env.VITE_API_URL}/${profile.profile_pic}`} 
                  alt={profile.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl font-black text-[#7C3AED]">
                  {profile.name.charAt(0)}
                </div>
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-2 right-2 p-3 bg-[#7C3AED] text-white rounded-2xl shadow-lg shadow-[#7C3AED]/20 hover:scale-110 transition-transform"
            >
              <Camera className="w-5 h-5" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload}
            />
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
              <span className="px-4 py-1 bg-[#7C3AED]/10 text-[#7C3AED] text-[10px] font-black rounded-full uppercase tracking-widest">
                {profile.role_name}
              </span>
              <div className={cn(
                "px-4 py-1 text-[10px] font-black rounded-full uppercase tracking-widest flex items-center gap-2",
                profile.is_public ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
              )}>
                {profile.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {profile.is_public ? "Public Profile" : "Private Session"}
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-[#1E184B] tracking-tight mb-2">
              {profile.name}
            </h1>
            <p className="text-lg font-bold text-[#1E184B]/60 flex items-center justify-center md:justify-start gap-2">
              <Briefcase className="w-5 h-5 text-[#7C3AED]" />
              {profile.designation || 'Academic Professional'}
            </p>
            {profile.department_name && (
              <p className="text-sm font-bold text-slate-400 mt-2 flex items-center justify-center md:justify-start gap-2">
                <Building2 className="w-4 h-4" />
                {profile.department_name}
              </p>
            )}
          </div>

          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              "px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95",
              isEditing ? "bg-slate-100 text-slate-500" : "bg-[#7C3AED] text-white shadow-xl shadow-[#7C3AED]/20 hover:bg-[#6D28D9]"
            )}
          >
            {isEditing ? "Cancel Mission" : "Edit Credentials"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Basic Info */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Contact Protocol
            </h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#7C3AED]/10 group-hover:text-[#7C3AED] transition-all">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Email Channel</p>
                  <p className="text-sm font-bold text-[#1E184B]">{profile.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#7C3AED]/10 group-hover:text-[#7C3AED] transition-all">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Comm Line</p>
                  <p className="text-sm font-bold text-[#1E184B]">{profile.phone || 'No active line'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1E184B] to-[#110D2C] rounded-[2.5rem] p-8 text-white shadow-xl flex flex-col justify-between">
            <div>
              <Sparkles className="w-8 h-8 text-amber-400 mb-4" />
              <h3 className="text-xl font-black mb-2">Profile Privacy</h3>
              <p className="text-white/60 text-xs font-medium leading-relaxed mb-6">
                Choose if others can discover and view your professional credentials on department rosters and leaderboards.
              </p>
              
              <div className="flex items-center gap-3 mb-6 p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className={cn(
                  "w-3 h-3 rounded-full animate-pulse",
                  profile.is_public ? "bg-emerald-400" : "bg-amber-400"
                )} />
                <span className="text-xs font-black uppercase tracking-widest text-white/95">
                  Status: {profile.is_public ? "Public Profile" : "Private Session"}
                </span>
              </div>
            </div>
            
            <button 
              type="button"
              onClick={handleToggleVisibility}
              className={cn(
                "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95",
                profile.is_public 
                  ? "bg-slate-100/10 hover:bg-slate-100/20 text-white border border-white/10" 
                  : "bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
              )}
            >
              {profile.is_public ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
              {profile.is_public ? "Make Profile Private" : "Make Profile Public"}
            </button>
          </div>
        </div>

        {/* Right Column: Bio & Achievements */}
        <div className="lg:col-span-8">
          <form onSubmit={handleUpdate} className="space-y-8">
            <div className="bg-white rounded-[3rem] border border-slate-100 p-8 md:p-10 shadow-sm">
              <div className="space-y-8">
                {/* Bio Section */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-[#1E184B] uppercase tracking-widest flex items-center gap-2">
                    <User className="w-4 h-4 text-[#7C3AED]" />
                    Professional Mission Bio
                  </h3>
                  {isEditing ? (
                    <textarea 
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-bold text-[#1E184B] focus:ring-4 focus:ring-[#7C3AED]/5 outline-none transition-all min-h-[200px] resize-none"
                      placeholder="Define your academic vision and professional focus..."
                    />
                  ) : (
                    <div className="p-8 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-100">
                      <p className="text-slate-500 font-bold leading-relaxed whitespace-pre-wrap italic">
                        {profile.bio || "No mission brief provided yet. Define your professional identity by editing your credentials."}
                      </p>
                    </div>
                  )}
                </div>

                {/* Achievements Section */}
                <div className="space-y-6 pt-8 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-[#1E184B] uppercase tracking-widest flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#7C3AED]" />
                      Mission Milestones
                    </h3>
                    {isEditing && (
                      <button 
                        type="button"
                        onClick={addAchievement}
                        className="px-4 py-2 bg-[#7C3AED]/10 text-[#7C3AED] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#7C3AED] hover:text-white transition-all flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Add Record
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <AnimatePresence>
                      {profile.achievements.map((ach) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          key={ach.id} 
                          className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 group hover:shadow-lg transition-all"
                        >
                          <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/5 flex items-center justify-center text-[#7C3AED]">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            {isEditing ? (
                              <div className="flex flex-col md:flex-row gap-3">
                                <input 
                                  value={ach.title}
                                  onChange={(e) => {
                                    const updated = profile.achievements.map(a => a.id === ach.id ? { ...a, title: e.target.value } : a);
                                    setProfile({ ...profile, achievements: updated });
                                  }}
                                  placeholder="Milestone title..."
                                  className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                                />
                                <input 
                                  type="date"
                                  value={ach.date}
                                  onChange={(e) => {
                                    const updated = profile.achievements.map(a => a.id === ach.id ? { ...a, date: e.target.value } : a);
                                    setProfile({ ...profile, achievements: updated });
                                  }}
                                  className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-black text-[#1E184B]">{ach.title || "Untitled Achievement"}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ach.date}</span>
                              </div>
                            )}
                          </div>
                          {isEditing && (
                            <button 
                              type="button"
                              onClick={() => removeAchievement(ach.id)}
                              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {profile.achievements.length === 0 && !isEditing && (
                      <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-100">
                        <Award className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No milestones recorded</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit Form Fields */}
                {isEditing && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-slate-100">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest ml-1">Full Name</label>
                      <input 
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-[#1E184B] focus:ring-4 focus:ring-[#7C3AED]/5 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest ml-1">Designation</label>
                      <input 
                        value={profile.designation || ''}
                        onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
                        placeholder="e.g. Associate Professor"
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-[#1E184B] focus:ring-4 focus:ring-[#7C3AED]/5 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest ml-1">Phone Line</label>
                      <input 
                        value={profile.phone || ''}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        placeholder="+91 XXXXX XXXXX"
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-[#1E184B] focus:ring-4 focus:ring-[#7C3AED]/5 outline-none transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="mt-10 flex gap-4">
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-4 bg-[#7C3AED] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[#7C3AED]/20 hover:bg-[#6D28D9] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Mission Data
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-10 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Abort
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
