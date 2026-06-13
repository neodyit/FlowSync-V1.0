import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  User, 
  Mail, 
  Trophy, 
  Award, 
  CheckCircle2, 
  Star,
  Activity,
  Shield,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Target,
  Users
} from 'lucide-react';
import { motion } from 'framer-motion';
import SEO from '@/components/SEO';
import { cn, getImageUrl } from '@/lib/utils';

interface TeamMember {
  id: number;
  name: string;
  email: string;
  profile_pic: string | null;
  is_public: number;
}

interface DeptData {
  department: string;
  college: string;
  hod: {
    id?: number | null;
    name: string;
    email: string;
    profile_pic: string | null;
    is_public?: number;
  };
  stats: {
    rank: number | string;
    points: number;
    bonus: number;
    completed: number;
    total: number;
  };
  team: TeamMember[];
}

const FacultyDepartment: React.FC = () => {
  const [data, setData] = useState<DeptData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shuffledMembersWithPics, setShuffledMembersWithPics] = useState<TeamMember[]>([]);
  const [failedImageIds, setFailedImageIds] = useState<number[]>([]);

  const fetchDeptData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/faculty/department.php`, {
        credentials: 'include'
      });
      const result = await response.json();
      if (result.status === 'success') {
        setData(result.data);
        const withPics = (result.data.team || []).filter((m: TeamMember) => m.profile_pic && m.profile_pic.trim() !== '');
        const shuffled = [...withPics].sort(() => 0.5 - Math.random());
        setShuffledMembersWithPics(shuffled);
      }
    } catch (error) {
      console.error('Failed to fetch department data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeptData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const visibleMembers = shuffledMembersWithPics.filter(m => !failedImageIds.includes(m.id));

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <SEO title="My Department" description="View departmental details and your performance standing." />

      {/* Hero Section */}
      <div className="relative p-10 md:p-16 bg-white dark:bg-[#1A0F35]/80 rounded-[3.5rem] border border-[#7C3AED]/10 dark:border-violet-500/15 shadow-sm overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#7C3AED]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-[#7C3AED]/10 transition-colors duration-500" />
        
        <div className="relative z-10 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#7C3AED]/5 dark:bg-[#7C3AED]/10 rounded-2xl">
                <GraduationCap className="w-4 h-4 text-[#7C3AED]" />
                <span className="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest">{data.college}</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-[#1E184B] dark:text-indigo-100 tracking-tight leading-tight">
                Department of <br />
                <span className="text-[#7C3AED]">{data.department}</span>
              </h1>
            </div>
            
            <div className="flex -space-x-4">
              {visibleMembers.slice(0, 4).map((member, idx) => (
                <div key={idx} className="w-16 h-16 rounded-2xl border-4 border-white dark:border-[#130C24] bg-slate-100 dark:bg-[#1A0F35] overflow-hidden flex items-center justify-center font-black text-[#7C3AED] shadow-lg">
                  <img 
                    src={getImageUrl(member.profile_pic)} 
                    className="w-full h-full object-cover" 
                    alt="" 
                    loading="lazy" 
                    onError={() => setFailedImageIds(prev => [...prev, member.id])}
                  />
                </div>
              ))}
              {visibleMembers.length > 4 && (
                <div className="w-16 h-16 rounded-2xl border-4 border-white dark:border-[#130C24] bg-[#7C3AED] flex items-center justify-center font-black text-white text-sm shadow-lg">
                  +{visibleMembers.length - 4}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-[#7C3AED]/5 dark:border-violet-500/10">
            <div className="flex items-center gap-5 group/item">
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/20 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm group-hover/item:bg-indigo-600 group-hover/item:text-white transition-all duration-300">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest">Institution</p>
                <p className="text-sm font-black text-[#1E184B] dark:text-indigo-100">{data.college}</p>
              </div>
            </div>

            <div className="flex items-center gap-5 group/item">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm group-hover/item:bg-emerald-600 group-hover/item:text-white transition-all duration-300">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest">Departmental Activity</p>
                <p className="text-sm font-black text-[#1E184B] dark:text-indigo-100">High Engagement</p>
              </div>
            </div>

            <div className="flex items-center gap-5 group/item">
              <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/20 rounded-2xl flex items-center justify-center text-amber-500 shadow-sm group-hover/item:bg-amber-500 group-hover/item:text-white transition-all duration-300">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest">Active Objectives</p>
                <p className="text-sm font-black text-[#1E184B] dark:text-indigo-100">{data.stats.total} Projects</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* HOD Profile Card */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-[#1A0F35]/80 border border-[#7C3AED]/10 dark:border-violet-500/15 p-10 space-y-8 h-full shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
              <Shield className="w-32 h-32 text-[#1E184B] dark:text-violet-400" />
            </div>
            
            <div className="space-y-6 relative z-10">
              <h3 className="text-xs font-black text-[#1E184B]/40 dark:text-violet-400/50 uppercase tracking-[0.2em]">Leadership Oversight</h3>
              
              <div className="flex flex-col items-center text-center space-y-4">
                {data.hod.is_public && data.hod.id ? (
                  <Link to={`/faculty/profile/${data.hod.id}`} className="w-24 h-24 bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] rounded-[2rem] overflow-hidden flex items-center justify-center text-white font-black text-3xl shadow-2xl shadow-[#7C3AED]/20 hover:scale-105 transition-all">
                    {data.hod.profile_pic ? (
                      <img src={getImageUrl(data.hod.profile_pic)} className="w-full h-full object-cover" alt="" loading="lazy" />
                    ) : (
                      data.hod.name.charAt(0)
                    )}
                  </Link>
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] rounded-[2rem] overflow-hidden flex items-center justify-center text-white font-black text-3xl shadow-2xl shadow-[#7C3AED]/20">
                    {data.hod.profile_pic ? (
                      <img src={getImageUrl(data.hod.profile_pic)} className="w-full h-full object-cover" alt="" loading="lazy" />
                    ) : (
                      data.hod.name.charAt(0)
                    )}
                  </div>
                )}
                <div>
                  {data.hod.is_public && data.hod.id ? (
                    <Link to={`/faculty/profile/${data.hod.id}`} className="text-2xl font-black text-[#1E184B] dark:text-indigo-100 hover:text-[#7C3AED] transition-colors">
                      {data.hod.name}
                    </Link>
                  ) : (
                    <h4 className="text-2xl font-black text-[#1E184B] dark:text-indigo-100">{data.hod.name}</h4>
                  )}
                  <p className="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest mt-1">Head of Department</p>
                </div>
              </div>

              <div className="space-y-3 pt-6">
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-[#110A24]/40 rounded-2xl border border-slate-100 dark:border-violet-500/10 group/link hover:border-[#7C3AED]/30 transition-all">
                  <div className="w-10 h-10 bg-white dark:bg-[#1A0F35] rounded-xl flex items-center justify-center text-slate-400 dark:text-violet-400/50 group-hover/link:text-[#7C3AED] transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest">Email Address</p>
                    <p className="text-sm font-black text-[#1E184B] dark:text-indigo-100 truncate">{data.hod.email}</p>
                  </div>
                </div>
                
                {data.hod.is_public && data.hod.id && (
                  <Link to={`/faculty/profile/${data.hod.id}`} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-[#110A24]/40 rounded-2xl border border-slate-100 dark:border-violet-500/10 group/link hover:border-[#7C3AED]/30 transition-all cursor-pointer">
                    <div className="w-10 h-10 bg-white dark:bg-[#1A0F35] rounded-xl flex items-center justify-center text-slate-400 dark:text-violet-400/50 group-hover/link:text-[#7C3AED] transition-colors">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest">Portfolio</p>
                      <p className="text-sm font-black text-[#1E184B] dark:text-indigo-100 truncate">View HOD Profile</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* My Standing / Achievement Card */}
        <div className="lg:col-span-7">
          <div className="bg-[#1E184B] dark:bg-[#150B30] border border-transparent dark:border-violet-500/20 rounded-[2.5rem] p-10 text-white space-y-10 shadow-2xl relative overflow-hidden group h-full">
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-[#7C3AED]/20 to-transparent pointer-events-none" />
            <Sparkles className="absolute top-10 right-10 w-20 h-20 text-white/5 animate-pulse" />
            
            <div className="relative z-10 space-y-10">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Personal Performance Standing</h3>
                <div className="px-4 py-2 bg-white/10 rounded-2xl backdrop-blur-md">
                  <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Rank #{data.stats.rank}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
                    <Trophy className="w-6 h-6 text-amber-400" />
                  </div>
                  <p className="text-3xl font-black">{data.stats.rank}</p>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Dept Rank</p>
                </div>

                <div className="space-y-2">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
                    <Star className="w-6 h-6 text-emerald-400" />
                  </div>
                  <p className="text-3xl font-black">{data.stats.points}</p>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Skill Pts</p>
                </div>

                <div className="space-y-2">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
                    <Award className="w-6 h-6 text-[#7C3AED]" />
                  </div>
                  <p className="text-3xl font-black">+{data.stats.bonus}</p>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Bonus Pool</p>
                </div>

                <div className="space-y-2">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-6 h-6 text-indigo-400" />
                  </div>
                  <p className="text-3xl font-black">{data.stats.completed}</p>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Completed</p>
                </div>
              </div>

              <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-black text-white/80">Departmental Contribution</h4>
                  <span className="text-xs font-black text-[#7C3AED] dark:text-violet-400">
                    {data.stats.total > 0 ? Math.round((data.stats.completed / data.stats.total) * 100) : 0}% Efficiency
                  </span>
                </div>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${data.stats.total > 0 ? (data.stats.completed / data.stats.total) * 100 : 0}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-[#7C3AED] to-indigo-400" 
                  />
                </div>
                <p className="text-[10px] font-bold text-white/40 mt-4 uppercase tracking-widest">
                  Progressing through {data.stats.completed} of your {data.stats.total} total assigned missions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="bg-white dark:bg-[#1A0F35]/80 rounded-[3rem] border border-[#7C3AED]/10 dark:border-violet-500/15 p-10 space-y-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-[#1E184B] dark:text-indigo-100">Departmental Team</h3>
            <p className="text-xs font-bold text-slate-400 dark:text-violet-400/50 uppercase tracking-widest mt-1">Academic Peers & Colleagues</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-[#110A24]/40 rounded-2xl border border-slate-100 dark:border-violet-500/10">
            <Users className="w-4 h-4 text-[#7C3AED]" />
            <span className="text-xs font-black text-[#1E184B] dark:text-indigo-100">{data.team?.length || 0} Members</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.team?.map((member, idx) => (
            member.is_public ? (
              <Link 
                to={`/faculty/profile/${member.id}`}
                key={idx} 
                className="flex items-center gap-4 p-4 bg-slate-50/50 dark:bg-[#110A24]/30 rounded-2xl border border-transparent dark:border-violet-500/10 hover:border-[#7C3AED]/20 dark:hover:border-violet-400/40 hover:bg-white dark:hover:bg-[#1A0F35]/80 hover:shadow-xl hover:shadow-[#7C3AED]/5 dark:hover:shadow-violet-950/20 hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer"
              >
                <div className="w-12 h-12 bg-[#7C3AED]/5 dark:bg-violet-950/40 rounded-xl border border-slate-100 dark:border-violet-500/15 overflow-hidden flex items-center justify-center font-black text-[#7C3AED] dark:text-violet-400 group-hover:bg-[#7C3AED] dark:group-hover:bg-violet-600 group-hover:text-white dark:group-hover:text-white transition-all shadow-sm shrink-0 hover:scale-105">
                  {member.profile_pic ? (
                    <img src={getImageUrl(member.profile_pic)} className="w-full h-full object-cover" alt="" loading="lazy" />
                  ) : (
                    member.name.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-[#1E184B] dark:text-indigo-100 truncate group-hover:text-[#7C3AED] dark:group-hover:text-violet-400 transition-colors">{member.name}</p>
                  <p className="text-xs font-medium text-slate-400 dark:text-violet-400/60 lowercase truncate mt-0.5">{member.email}</p>
                </div>
              </Link>
            ) : (
              <div 
                key={idx} 
                className="flex items-center gap-4 p-4 bg-slate-50/50 dark:bg-[#110A24]/30 rounded-2xl border border-transparent dark:border-violet-500/10 hover:border-[#7C3AED]/5 dark:hover:border-violet-400/10 hover:bg-white dark:hover:bg-[#1A0F35]/80 transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-[#7C3AED]/5 dark:bg-violet-950/40 rounded-xl border border-slate-100 dark:border-violet-500/15 overflow-hidden flex items-center justify-center font-black text-[#7C3AED] dark:text-violet-400 shadow-sm shrink-0">
                  {member.profile_pic ? (
                    <img src={getImageUrl(member.profile_pic)} className="w-full h-full object-cover" alt="" loading="lazy" />
                  ) : (
                    member.name.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-[#1E184B] dark:text-indigo-100 truncate">{member.name}</p>
                  <p className="text-xs font-medium text-slate-400 dark:text-violet-400/60 lowercase truncate mt-0.5">{member.email}</p>
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
};

export default FacultyDepartment;
