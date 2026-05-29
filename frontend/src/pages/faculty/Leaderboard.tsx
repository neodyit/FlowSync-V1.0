import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Medal, 
  Star, 
  TrendingUp, 
  Users, 
  Target,
  Award,
  Crown,
  Building2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import { cn } from '@/lib/utils';

interface Performer {
  id: number;
  name: string;
  email: string;
  dept_name: string;
  college_name: string;
  total_points: number;
  total_bonus: number;
  total_score: number;
  profile_pic: string | null;
}

interface Standing {
  rank: number | string;
  score: number;
}

const Leaderboard: React.FC = () => {
  const [performers, setPerformers] = useState<Performer[]>([]);
  const [myStanding, setMyStanding] = useState<Standing | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/leaderboard.php`, {
        credentials: 'include'
      });
      const result = await response.json();
      if (result.status === 'success') {
        setPerformers(result.data.top_performers);
        setMyStanding(result.data.my_standing);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    // Polling for updates every 20 seconds
    const interval = setInterval(() => {
      fetchLeaderboard();
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const top3 = performers.slice(0, 3);
  const others = performers.slice(3);

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      <SEO title="Leaderboard" description="View top departmental performers and your global standing." />

      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#7C3AED]/5 dark:bg-[#7C3AED]/10 rounded-2xl">
          <Trophy className="w-4 h-4 text-[#7C3AED]" />
          <span className="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest">Departmental Standings</span>
        </div> 
        <h1 className="text-5xl md:text-7xl font-black text-[#1E184B] dark:text-indigo-100 tracking-tight">
          Hall of <span className="text-[#7C3AED]">Excellence</span>
        </h1>
        <p className="text-[#1E184B]/60 dark:text-violet-400/60 max-w-2xl mx-auto font-bold text-lg">
          Celebrating our top academic contributors and their departmental impact.
        </p>
      </div>

      {/* Podium Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 items-end gap-6 pt-10 px-4">
        {/* 2nd Place */}
        {top3[1] && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="order-2 md:order-1 bg-white dark:bg-[#1A0F35]/80 rounded-[2.5rem] border border-[#7C3AED]/10 dark:border-violet-500/15 p-8 text-center space-y-6 relative group hover:shadow-2xl hover:shadow-[#7C3AED]/10 transition-all"
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-slate-100 dark:bg-[#110A24] rounded-2xl flex items-center justify-center border-4 border-white dark:border-[#130C24] text-slate-500 dark:text-violet-400 font-black">2</div>
            <div className="w-20 h-20 bg-slate-100 dark:bg-[#110A24] rounded-[1.5rem] overflow-hidden flex items-center justify-center mx-auto text-2xl font-black text-slate-400">
              {top3[1].profile_pic ? (
                <img src={`${import.meta.env.VITE_API_URL}/${top3[1].profile_pic}`} className="w-full h-full object-cover" alt="" />
              ) : (
                top3[1].name.charAt(0)
              )}
            </div>
            <div>
              <Link to={`/faculty/profile/${top3[1].id}`} className="font-black text-[#1E184B] dark:text-indigo-100 text-lg truncate hover:text-[#7C3AED] transition-colors block">
                {top3[1].name}
              </Link>
              <p className="text-[10px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest mt-1">{top3[1].dept_name}</p>
            </div>
            <div className="pt-4 border-t border-slate-50 dark:border-violet-500/10">
              <p className="text-2xl font-black text-[#1E184B] dark:text-indigo-100">{top3[1].total_score}</p>
              <p className="text-[9px] font-black text-[#7C3AED] uppercase tracking-widest">Skill Points</p>
            </div>
          </motion.div>
        )}

        {/* 1st Place */}
        {top3[0] && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="order-1 md:order-2 bg-[#1E184B] dark:bg-[#150B30] rounded-[3rem] p-10 text-center space-y-8 border border-transparent dark:border-violet-500/20 relative shadow-2xl shadow-[#1E184B]/20 transform md:-translate-y-6"
          >
            <Crown className="absolute -top-10 left-1/2 -translate-x-1/2 w-16 h-16 text-amber-400 drop-shadow-lg" />
            <Sparkles className="absolute top-10 right-10 w-8 h-8 text-white/10" />
            <div className="w-28 h-28 bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] rounded-[2rem] overflow-hidden flex items-center justify-center mx-auto text-4xl font-black text-white shadow-2xl shadow-[#7C3AED]/40">
              {top3[0].profile_pic ? (
                <img src={`${import.meta.env.VITE_API_URL}/${top3[0].profile_pic}`} className="w-full h-full object-cover" alt="" />
              ) : (
                top3[0].name.charAt(0)
              )}
            </div>
            <div className="space-y-2">
              <Link to={`/faculty/profile/${top3[0].id}`} className="font-black text-white text-2xl truncate hover:text-[#7C3AED] transition-colors block">
                {top3[0].name}
              </Link>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{top3[0].dept_name}</p>
            </div>
            <div className="bg-white/10 dark:bg-white/5 rounded-[2rem] p-6 border border-white/10 dark:border-violet-500/10 backdrop-blur-md">
              <p className="text-4xl font-black text-white">{top3[0].total_score}</p>
              <p className="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest mt-1">Institutional Leader</p>
            </div>
          </motion.div>
        )}

        {/* 3rd Place */}
        {top3[2] && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="order-3 md:order-3 bg-white dark:bg-[#1A0F35]/80 rounded-[2.5rem] border border-[#7C3AED]/10 dark:border-violet-500/15 p-8 text-center space-y-6 relative group hover:shadow-2xl hover:shadow-[#7C3AED]/10 transition-all"
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-amber-50 dark:bg-amber-950/20 rounded-2xl flex items-center justify-center border-4 border-white dark:border-[#130C24] text-amber-600 font-black">3</div>
            <div className="w-20 h-20 bg-amber-50 dark:bg-amber-950/20 rounded-[1.5rem] overflow-hidden flex items-center justify-center mx-auto text-2xl font-black text-amber-400">
              {top3[2].profile_pic ? (
                <img src={`${import.meta.env.VITE_API_URL}/${top3[2].profile_pic}`} className="w-full h-full object-cover" alt="" />
              ) : (
                top3[2].name.charAt(0)
              )}
            </div>
            <div>
              <Link to={`/faculty/profile/${top3[2].id}`} className="font-black text-[#1E184B] dark:text-indigo-100 text-lg truncate hover:text-[#7C3AED] transition-colors block">
                {top3[2].name}
              </Link>
              <p className="text-[10px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest mt-1">{top3[2].dept_name}</p>
            </div>
            <div className="pt-4 border-t border-slate-50 dark:border-violet-500/10">
              <p className="text-2xl font-black text-[#1E184B] dark:text-indigo-100">{top3[2].total_score}</p>
              <p className="text-[9px] font-black text-[#7C3AED] uppercase tracking-widest">Skill Points</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Main List Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-6 mb-6">
            <h2 className="text-xs font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-[0.2em]">Top 10 Performers</h2>
            <div className="flex items-center gap-2 text-[10px] font-black text-[#7C3AED] uppercase tracking-widest">
              <Users className="w-3 h-3" />
              Department Faculty
            </div>
          </div>
          
          <div className="space-y-3">
            {others.map((performer, idx) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={performer.id}
                className="bg-white dark:bg-[#1A0F35]/80 rounded-3xl border border-[#7C3AED]/5 dark:border-violet-500/10 p-5 flex items-center gap-6 hover:border-[#7C3AED]/20 dark:hover:border-violet-400/40 hover:shadow-xl hover:shadow-[#7C3AED]/5 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-[#110A24] overflow-hidden flex items-center justify-center text-[#1E184B] font-black text-sm group-hover:bg-[#7C3AED] group-hover:text-white transition-all">
                  {performer.profile_pic ? (
                    <img src={`${import.meta.env.VITE_API_URL}/${performer.profile_pic}`} className="w-full h-full object-cover" alt="" />
                  ) : (
                    idx + 4
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <Link to={`/faculty/profile/${performer.id}`} className="font-black text-[#1E184B] dark:text-indigo-100 group-hover:text-[#7C3AED] transition-colors truncate block">
                    {performer.name}
                  </Link>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-[10px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-widest flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {performer.dept_name}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xl font-black text-[#1E184B] dark:text-indigo-100">{performer.total_score}</p>
                  <p className="text-[9px] font-black text-[#7C3AED] uppercase tracking-widest">Points</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* My Standing Section */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#7C3AED] dark:bg-[#150B30] border border-transparent dark:border-violet-500/20 rounded-[2.5rem] p-10 text-white space-y-8 relative overflow-hidden shadow-2xl shadow-[#7C3AED]/20">
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <Award className="absolute -top-10 -right-10 w-40 h-40 text-white/5" />
            
            <div className="relative z-10 space-y-8">
              <div>
                <h3 className="text-xs font-black text-white/60 uppercase tracking-[0.2em]">Your Department Pulse</h3>
                <p className="text-4xl font-black mt-2">Rank #{myStanding?.rank}</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white/10 dark:bg-white/5 rounded-2xl p-5 border border-white/10 dark:border-violet-500/10 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Total Accumulation</span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-black">{myStanding?.score}</p>
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mt-1">Skill Points + Bonus</p>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10">
                <p className="text-[11px] font-bold text-white/60 leading-relaxed">
                  You are in the top {(myStanding?.rank as number) < 50 ? 'tier' : 'percentile'} of active academic contributors. Keep pushing missions to climb higher!
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1A0F35]/80 rounded-[2.5rem] border border-[#7C3AED]/10 dark:border-violet-500/15 p-8 space-y-6">
            <h3 className="text-[10px] font-black text-[#1E184B]/40 dark:text-violet-400/50 uppercase tracking-[0.2em]">Leadership Metrics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#110A24] rounded-2xl">
                <div className="flex items-center gap-3">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-[#1E184B] dark:text-indigo-100">Peak Performance</span>
                </div>
                <span className="text-xs font-black text-[#7C3AED]">Top 10%</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#110A24] rounded-2xl">
                <div className="flex items-center gap-3">
                  <Target className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold text-[#1E184B] dark:text-indigo-100">Growth Velocity</span>
                </div>
                <span className="text-xs font-black text-emerald-500">+12%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
