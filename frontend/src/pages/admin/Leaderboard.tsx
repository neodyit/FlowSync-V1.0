import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, RefreshCw, AlertTriangle, Loader2, Award, Medal, CheckCircle2 } from 'lucide-react';
import SEO from '@/components/SEO';
import { cn } from '@/lib/utils';

interface Leader {
  id: number;
  name: string;
  email: string;
  profile_pic: string | null;
  total_points: number;
  tasks_completed: number;
  college_name: string | null;
  department_name: string | null;
}

const Leaderboard: React.FC = () => {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/leaderboard.php`, { credentials: 'include' });
      const json = await res.json();
      if (json.status === 'success') {
        setLeaders(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/leaderboard.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'reset_season' })
      });
      const json = await res.json();
      if (json.status === 'success') {
        fetchLeaderboard();
        setShowConfirm(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsResetting(false);
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
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      <SEO title="Global Leaderboard" description="Cross-institutional performance rankings." />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#1E184B] tracking-tight">Global Leaderboard</h1>
          <p className="text-[#1E184B]/60 mt-2 font-bold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Top performers across the entire university network.
          </p>
        </div>
        
        {showConfirm ? (
          <div className="flex items-center gap-4 bg-rose-50 p-2 rounded-2xl border border-rose-100">
            <span className="text-xs font-black text-rose-600 uppercase tracking-widest pl-3">Reset All Points?</span>
            <button onClick={() => setShowConfirm(false)} className="px-4 py-2 bg-white text-slate-500 hover:text-slate-700 rounded-xl font-bold text-xs">Cancel</button>
            <button onClick={handleReset} disabled={isResetting} className="px-6 py-2 bg-rose-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:bg-rose-600 disabled:opacity-50 flex items-center gap-2">
              {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              Confirm
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            className="px-6 py-4 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-3"
          >
            <RefreshCw className="w-4 h-4" />
            Start New Season
          </button>
        )}
      </div>

      {/* Top 3 Podium */}
      {leaders.length >= 3 && (
        <div className="flex flex-col md:flex-row items-end justify-center gap-6 pt-10 pb-8">
          {[1, 0, 2].map((rankIdx) => {
            const leader = leaders[rankIdx];
            if (!leader) return null;
            
            const isFirst = rankIdx === 0;
            const rank = rankIdx + 1;
            
            return (
              <motion.div 
                key={leader.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: rankIdx * 0.1 }}
                className={cn(
                  "relative bg-white rounded-t-[3rem] border border-b-0 border-slate-100 shadow-sm flex flex-col items-center pt-10 px-8 w-full md:w-64",
                  isFirst ? "h-72 z-10 shadow-2xl scale-110 border-amber-200 bg-gradient-to-t from-amber-50 to-white" : "h-64"
                )}
              >
                <div className={cn(
                  "absolute -top-8 w-16 h-16 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg border-4 border-white z-20",
                  rank === 1 ? "bg-gradient-to-br from-amber-300 to-amber-600" :
                  rank === 2 ? "bg-gradient-to-br from-slate-300 to-slate-500" :
                  "bg-gradient-to-br from-orange-300 to-orange-600"
                )}>
                  #{rank}
                </div>
                
                <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-md mb-4">
                  {leader.profile_pic ? (
                    <img src={`${import.meta.env.VITE_API_URL}/${leader.profile_pic}`} alt={leader.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-slate-300 text-2xl">{leader.name.charAt(0)}</div>
                  )}
                </div>
                
                <h3 className="font-black text-[#1E184B] text-center mb-1 leading-tight">{leader.name}</h3>
                <p className="text-[9px] font-bold text-slate-400 text-center mb-4 truncate w-full">{leader.college_name}</p>
                
                <div className="mt-auto pb-6 w-full text-center">
                  <p className={cn("text-2xl font-black", rank === 1 ? "text-amber-600" : "text-[#1E184B]")}>{leader.total_points}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Points</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Full List */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-8 border-b border-slate-50">
          <h3 className="text-lg font-black text-[#1E184B] flex items-center gap-3">
            <Medal className="w-5 h-5 text-indigo-500" />
            Global Roster
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">Rank</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Faculty Member</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Institution</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Missions</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {leaders.length > 0 ? leaders.map((leader, idx) => (
                <tr key={leader.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-5">
                    <span className="text-sm font-black text-slate-400">#{idx + 1}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        {leader.profile_pic ? (
                          <img src={`${import.meta.env.VITE_API_URL}/${leader.profile_pic}`} alt={leader.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-black text-slate-400 text-xs">{leader.name.charAt(0)}</div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#1E184B]">{leader.name}</p>
                        <p className="text-[10px] font-bold text-slate-400">{leader.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs font-bold text-[#1E184B]">{leader.department_name || '--'}</p>
                    <p className="text-[10px] font-bold text-slate-400">{leader.college_name || '--'}</p>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-black">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {leader.tasks_completed}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <p className="text-lg font-black text-[#1E184B]">{leader.total_points}</p>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Award className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-sm font-black text-[#1E184B]">No leaderboard data available.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
