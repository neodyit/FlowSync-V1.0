import React, { useState, useEffect } from 'react';
import { Mail, Phone, Briefcase, Award, Lock, CheckCircle2, Sparkles, Building2, X, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

interface CollaboratorProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number | null;
}

export const CollaboratorProfileModal: React.FC<CollaboratorProfileModalProps> = ({
  isOpen,
  onClose,
  userId
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !userId) {
      setProfile(null);
      setError(null);
      return;
    }

    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/profile.php?id=${userId}`, {
          credentials: 'include'
        });
        const result = await response.json();
        if (result.status === 'success') {
          setProfile(result.data);
        } else {
          setError(result.message || 'Profile not accessible.');
        }
      } catch (error) {
        setError('Connection to protocol failed.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [isOpen, userId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative bg-white dark:bg-[#130C24] rounded-[2.5rem] md:rounded-[3.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-transparent dark:border-violet-500/20"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 z-50 p-3 bg-slate-50 dark:bg-[#1A0F35] text-slate-400 dark:text-violet-400/60 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-500 dark:hover:text-rose-400 transition-all border border-transparent dark:border-violet-500/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center min-h-[350px] gap-4">
                  <div className="w-10 h-10 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] rounded-full animate-spin" />
                  <p className="text-xs font-black text-[#1E184B]/40 dark:text-violet-400/50 uppercase tracking-widest animate-pulse">Decrypting Profile Data...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-6">
                  <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-2xl flex items-center justify-center shadow-sm">
                    <Lock className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#1E184B] dark:text-white">Access Restricted</h3>
                    <p className="text-slate-500 dark:text-violet-400/50 font-bold mt-2 text-sm">{error}</p>
                  </div>
                </div>
              ) : profile ? (
                <div className="space-y-10">
                  {/* Hero Information */}
                  <div className="flex flex-col md:flex-row items-center gap-8 border-b border-slate-50 dark:border-violet-500/10 pb-8">
                    <div className="w-28 h-28 rounded-[2rem] bg-slate-100 dark:bg-[#1A0F35] overflow-hidden border-2 border-slate-100 dark:border-violet-500/20 shadow-lg shrink-0">
                      {profile.profile_pic ? (
                        <img
                          src={`${import.meta.env.VITE_API_URL}/${profile.profile_pic}`}
                          alt={profile.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl font-black text-[#7C3AED]">
                          {profile.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="text-center md:text-left flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
                        <span className="px-3.5 py-1 bg-[#7C3AED]/10 dark:bg-[#7C3AED]/25 text-[#7C3AED] dark:text-violet-400 text-[9px] font-black rounded-full uppercase tracking-wider">
                          {profile.role_name}
                        </span>
                        {profile.is_public === 0 && (
                          <span className="px-3.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            Private Profile
                          </span>
                        )}
                      </div>

                      <h2 className="text-2xl md:text-3xl font-black text-[#1E184B] dark:text-indigo-100 tracking-tight truncate leading-tight">
                        {profile.name}
                      </h2>
                      <p className="text-sm font-bold text-[#1E184B]/60 dark:text-violet-400/60 mt-1 flex items-center justify-center md:justify-start gap-1.5 truncate">
                        <Briefcase className="w-4 h-4 text-[#7C3AED]" />
                        {profile.designation || 'Academic Professional'}
                      </p>
                      {profile.department_name && (
                        <p className="text-xs font-bold text-slate-400 dark:text-violet-500/50 mt-1.5 flex items-center justify-center md:justify-start gap-1.5">
                          <Building2 className="w-3.5 h-3.5" />
                          {profile.department_name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Details Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column (Contact Details) */}
                    <div className="lg:col-span-5 space-y-8">
                      <div className="bg-slate-50 dark:bg-[#1A0F35]/40 rounded-[2rem] border border-slate-100 dark:border-violet-500/10 p-6 space-y-5">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Protocols</h4>
                        
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#110A24] flex items-center justify-center text-slate-400 dark:text-violet-500/40 border border-slate-100 dark:border-violet-500/10">
                              <Mail className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Email</p>
                              <p className="text-xs font-bold text-[#1E184B] dark:text-indigo-100 truncate">{profile.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#110A24] flex items-center justify-center text-slate-400 dark:text-violet-500/40 border border-slate-100 dark:border-violet-500/10">
                              <Phone className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Comm Line</p>
                              <p className="text-xs font-bold text-[#1E184B] dark:text-indigo-100 truncate">{profile.phone || 'Not Registered'}</p>
                            </div>
                          </div>
                        </div>

                        {profile.is_public === 0 && (
                          <div className="p-3 bg-amber-50/50 dark:bg-amber-950/10 rounded-xl border border-amber-100/50 dark:border-amber-900/35">
                            <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400 leading-tight">
                              Contact info is hidden or locked because this user profile is set to Private.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] rounded-[2rem] p-6 text-white shadow-xl shadow-[#7C3AED]/15">
                        <Sparkles className="w-6 h-6 text-amber-300 mb-3" />
                        <h4 className="text-sm font-black mb-1">Active Collaborator</h4>
                        <p className="text-white/80 text-[10px] font-medium leading-relaxed">
                          Assigned to the same operations pipeline. Coordinate, share insights, and finalize assignments collaboratively.
                        </p>
                      </div>
                    </div>

                    {/* Right Column (Bio and Milestones) */}
                    <div className="lg:col-span-7 space-y-8">
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Professional Mission</h4>
                        <div className="p-6 bg-slate-50 dark:bg-[#1A0F35]/30 rounded-[2rem] border border-dashed border-slate-150 dark:border-violet-500/10">
                          <p className="text-slate-500 dark:text-violet-400/60 text-xs font-bold leading-relaxed italic">
                            {profile.bio || "No professional profile brief has been recorded yet."}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Career Milestones</h4>
                        <div className="grid grid-cols-1 gap-2.5 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                          {profile.achievements && profile.achievements.map((ach) => (
                            <div key={ach.id} className="p-4 bg-white dark:bg-[#1A0F35]/40 border border-slate-100 dark:border-violet-500/10 rounded-xl flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/5 dark:bg-[#7C3AED]/10 flex items-center justify-center text-[#7C3AED] dark:text-violet-400 shrink-0">
                                  <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-black text-[#1E184B] dark:text-indigo-100">{ach.title}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-400 dark:text-violet-500/40">
                                <Calendar className="w-3 h-3" />
                                <span className="text-[9px] font-bold uppercase tracking-widest">{ach.date}</span>
                              </div>
                            </div>
                          ))}
                          {(!profile.achievements || profile.achievements.length === 0) && (
                            <div className="p-6 text-center bg-slate-50/50 dark:bg-[#1A0F35]/10 rounded-xl border border-dashed border-slate-100 dark:border-violet-500/10">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No milestones recorded</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
