import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Phone, 
  Briefcase, 
  Award, 
  Globe, 
  Lock, 
  CheckCircle2,
  Sparkles,
  Building2,
  ArrowLeft,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
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

const PublicProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/profile.php?id=${id}`, {
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
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black text-[#1E184B]/40 uppercase tracking-widest">Decrypting Mission Data...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center space-y-6">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-[#1E184B]">Access Denied</h2>
          <p className="text-slate-500 font-bold mt-2">{error || "This profile is private or does not exist."}</p>
        </div>
        <button 
          onClick={() => navigate(-1)}
          className="px-8 py-4 bg-[#1E184B] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 mx-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Base
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <SEO title={`${profile.name} | FlowSync Profile`} description={`Professional profile of ${profile.name} on FlowSync.`} />

      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-[#7C3AED] transition-colors group mb-4"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Intelligence
      </button>

      {/* Hero Header */}
      <div className="relative bg-white rounded-[3rem] border border-slate-100 p-8 md:p-12 shadow-sm overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#7C3AED]/5 to-transparent rounded-full -mr-32 -mt-32 blur-3xl" />
        
        <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
          <div className="w-40 h-40 rounded-[2.5rem] bg-slate-100 overflow-hidden border-4 border-white shadow-xl shrink-0">
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

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
              <span className="px-4 py-1 bg-[#7C3AED]/10 text-[#7C3AED] text-[10px] font-black rounded-full uppercase tracking-widest">
                {profile.role_name}
              </span>
              <span className="px-4 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase tracking-widest flex items-center gap-2">
                <Globe className="w-3 h-3" />
                Public Record
              </span>
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Contact Protocol</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Official Email</p>
                  <p className="text-sm font-bold text-[#1E184B]">{profile.email}</p>
                </div>
              </div>
              {profile.phone && (
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Comm Line</p>
                    <p className="text-sm font-bold text-[#1E184B]">{profile.phone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] rounded-[2.5rem] p-8 text-white shadow-xl shadow-[#7C3AED]/20">
            <Sparkles className="w-8 h-8 text-amber-300 mb-4" />
            <h3 className="text-xl font-black mb-2">Performance Rank</h3>
            <p className="text-white/80 text-xs font-medium leading-relaxed">
              This professional is an active contributor to the department's mission objectives and academic excellence.
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-[3rem] border border-slate-100 p-8 md:p-10 shadow-sm">
            <div className="space-y-10">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-[#1E184B] uppercase tracking-widest flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#7C3AED]" /> Professional Mission
                </h3>
                <div className="p-8 bg-slate-50 rounded-[2rem] border border-dashed border-slate-100">
                  <p className="text-slate-500 font-bold leading-relaxed whitespace-pre-wrap italic">
                    {profile.bio || "This professional has not yet defined their mission brief."}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xs font-black text-[#1E184B] uppercase tracking-widest flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#7C3AED]" /> Career Milestones
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {profile.achievements.map((ach) => (
                    <div key={ach.id} className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/5 flex items-center justify-center text-[#7C3AED]">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm font-black text-[#1E184B]">{ach.title}</span>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Calendar className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">{ach.date}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {profile.achievements.length === 0 && (
                    <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No milestones publicly recorded</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;
