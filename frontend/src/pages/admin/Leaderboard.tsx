import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Trophy, RefreshCw, AlertTriangle, Loader2, Award, Medal, CheckCircle2, ChevronRight, ChevronDown, Building2, Layers, ArrowUpRight, User } from 'lucide-react';
import SEO from '@/components/SEO';
import { cn, getImageUrl } from '@/lib/utils';

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

  const [treeData, setTreeData] = useState<any[]>([]);
  const [expandedColleges, setExpandedColleges] = useState<Record<number, boolean>>({});
  const [isTreeLoading, setIsTreeLoading] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    setIsTreeLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/leaderboard.php?overview=1`, { credentials: 'include' });
      const json = await res.json();
      if (json.status === 'success') {
        setTreeData(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsTreeLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/leaderboard.php`, { credentials: 'include' });
      const json = await res.json();
      if (json.status === 'success') {
        setLeaders(json.data || []);
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
        fetchOverview();
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
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-8 sm:space-y-10">
      <SEO title="Global Leaderboard" description="Cross-institutional performance rankings." />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#1E184B] dark:text-indigo-100 tracking-tight">Global Leaderboard</h1>
          <p className="text-[#1E184B]/60 dark:text-violet-400/60 mt-2 font-bold flex items-center gap-2 text-sm">
            <Trophy className="w-4 h-4 text-amber-500" />
            Top performers across the entire university network.
          </p>
        </div>
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
                  "relative bg-white dark:bg-[#1A0F35]/20 backdrop-blur-md rounded-t-[3rem] border border-b-0 border-slate-100 dark:border-violet-500/20 shadow-sm flex flex-col items-center pt-10 px-8 w-full md:w-64",
                  isFirst ? "h-72 z-10 shadow-2xl scale-110 border-amber-200 dark:border-amber-500/30 bg-gradient-to-t from-amber-50 to-white dark:from-amber-950/20 dark:to-[#1A0F35]/20" : "h-64"
                )}
              >
                <div className={cn(
                  "absolute -top-8 w-16 h-16 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg border-4 border-white dark:border-[#0E0820] z-20",
                  rank === 1 ? "bg-gradient-to-br from-amber-300 to-amber-600" :
                    rank === 2 ? "bg-gradient-to-br from-slate-300 to-slate-500" :
                      "bg-gradient-to-br from-orange-300 to-orange-600"
                )}>
                  #{rank}
                </div>

                <Link to={`/admin/profile/${leader.id}`} className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 dark:bg-[#110A24] border-4 border-white dark:border-[#0E0820] shadow-md mb-4 block hover:scale-105 transition-all">
                  {leader.profile_pic ? (
                    <img src={getImageUrl(leader.profile_pic)} alt={leader.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-slate-300 dark:text-violet-400 text-2xl bg-[#7C3AED]/10 dark:bg-violet-950/40">{leader.name.charAt(0)}</div>
                  )}
                </Link>

                <Link to={`/admin/profile/${leader.id}`} className="font-black text-[#1E184B] dark:text-indigo-100 text-center mb-1 leading-tight hover:text-[#7C3AED] transition-colors block">
                  {leader.name}
                </Link>
                <p className="text-[9px] font-bold text-slate-400 dark:text-violet-400/60 text-center mb-4 truncate w-full">{leader.college_name}</p>

                <div className="mt-auto pb-6 w-full text-center">
                  <p className={cn("text-2xl font-black", rank === 1 ? "text-amber-600 dark:text-amber-400" : "text-[#1E184B] dark:text-indigo-200")}>{leader.total_points}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-violet-400/50">Total Points</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Tree Overview of Institutions */}
      <div className="bg-white dark:bg-[#1A0F35]/20 backdrop-blur-md rounded-[3rem] border border-slate-100 dark:border-violet-500/20 shadow-sm p-8 space-y-6">
        <div>
          <h3 className="text-lg font-black text-[#1E184B] dark:text-indigo-100 flex items-center gap-3">
            <Building2 className="w-5 h-5 text-[#7C3AED] dark:text-violet-400" />
            Institutional Rankings & Structure
          </h3>
          <p className="text-xs text-slate-400 dark:text-violet-400/60 font-bold mt-1">Hierarchical tree view of colleges and active departments sorted by overall points.</p>
        </div>

        {isTreeLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
          </div>
        ) : treeData.length === 0 ? (
          <div className="text-center py-8 text-slate-400 font-bold">No institutional scores available.</div>
        ) : (
          <div className="space-y-4">
            {treeData.map((college) => {
              const isExpanded = !!expandedColleges[college.college_id];
              return (
                <div
                  key={college.college_id}
                  className="border border-[#7C3AED]/10 dark:border-violet-500/10 rounded-[2rem] overflow-hidden bg-slate-50/[0.3] dark:bg-[#110A24]/10 transition-all"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 gap-4 hover:bg-slate-100/30 dark:hover:bg-[#1A0F35]/20 transition-all">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => setExpandedColleges(prev => ({ ...prev, [college.college_id]: !isExpanded }))}
                        className="p-1.5 hover:bg-slate-200/50 dark:hover:bg-violet-950/40 rounded-lg transition-colors text-slate-400 dark:text-violet-400 cursor-pointer"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div className="w-10 h-10 bg-[#7C3AED]/10 dark:bg-violet-950/40 rounded-xl flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-[#7C3AED] dark:text-violet-400" />
                      </div>
                      <div>
                        <span className="text-sm font-black text-gray-900 dark:text-indigo-100 block leading-tight">{college.college_name}</span>
                        <span className="text-[10px] font-black uppercase text-[#7C3AED] dark:text-violet-400/70 tracking-wider mt-0.5">{college.college_short_name}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t border-slate-100 dark:border-violet-500/5 sm:border-0">
                      <div className="flex items-center gap-6">
                        <div className="text-center sm:text-left">
                          <span className="text-[9px] font-bold text-slate-400 dark:text-violet-400/50 uppercase tracking-widest block">Missions Done</span>
                          <span className="text-sm font-black text-slate-600 dark:text-indigo-200">{college.tasks_completed}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-bold text-slate-400 dark:text-violet-400/50 uppercase tracking-widest block">Total Points</span>
                          <span className="text-sm font-black text-amber-500 flex items-center gap-1">
                            <Trophy className="w-3.5 h-3.5" />
                            {college.total_points}
                          </span>
                        </div>
                      </div>

                      <Link
                        to={`/admin/colleges/${college.college_short_name || college.college_id}`}
                        onClick={() => sessionStorage.setItem('college_details_active_tab', 'leaderboard')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-500/10 cursor-pointer shrink-0"
                      >
                        Open Leaderboard
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 dark:border-violet-500/5 bg-white/40 dark:bg-[#1A0F35]/10 p-5 space-y-3 pl-8 sm:pl-12">
                      <h4 className="text-[9px] font-black text-slate-400 dark:text-violet-400/50 uppercase tracking-[0.2em] mb-2">Departments ({college.departments?.length || 0})</h4>
                      {college.departments && college.departments.length > 0 ? (
                        college.departments.map((dept: any) => (
                          <div
                            key={dept.department_id}
                            className="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-[#110A24]/30 rounded-xl border border-slate-100/50 dark:border-violet-500/5 hover:border-[#7C3AED]/20 dark:hover:border-violet-500/20 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-100 dark:bg-violet-950/20 rounded-lg flex items-center justify-center shrink-0">
                                <Layers className="w-4 h-4 text-slate-400 dark:text-violet-400" />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-gray-800 dark:text-indigo-200 block">{dept.department_name}</span>
                                {dept.department_code && (
                                  <span className="text-[9px] font-black text-[#7C3AED] dark:text-violet-400 uppercase tracking-widest block mt-0.5">{dept.department_code}</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <span className="text-[8px] font-bold text-slate-400 dark:text-violet-400/40 uppercase tracking-widest block">Missions</span>
                                <span className="text-xs font-black text-slate-500 dark:text-indigo-300/60">{dept.tasks_completed}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[8px] font-bold text-slate-400 dark:text-violet-400/40 uppercase tracking-widest block">Points</span>
                                <span className="text-xs font-black text-[#7C3AED] dark:text-violet-400 flex items-center gap-1">
                                  <Award className="w-3.5 h-3.5" />
                                  {dept.total_points}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-slate-400 dark:text-violet-400/40 font-bold italic py-2">No departments initialized for this college.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Roster List */}
      <div className="bg-white dark:bg-[#1A0F35]/20 backdrop-blur-md rounded-[3rem] border border-slate-100 dark:border-violet-500/20 shadow-sm overflow-hidden flex flex-col">
        <div className="p-8 border-b border-slate-50 dark:border-violet-500/10">
          <h3 className="text-lg font-black text-[#1E184B] dark:text-indigo-100 flex items-center gap-3">
            <Medal className="w-5 h-5 text-indigo-500 dark:text-violet-400" />
            Global Roster
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-violet-950/20">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-violet-400/80 uppercase tracking-widest w-16">Rank</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-violet-400/80 uppercase tracking-widest">Faculty Member</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-violet-400/80 uppercase tracking-widest">Institution</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-violet-400/80 uppercase tracking-widest text-center">Missions</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-violet-400/80 uppercase tracking-widest text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-violet-500/10">
              {leaders.length > 0 ? leaders.map((leader, idx) => (
                <tr key={leader.id} className="hover:bg-slate-50/50 dark:hover:bg-violet-950/30 transition-all border-b border-slate-50 dark:border-violet-500/10">
                  <td className="px-8 py-5">
                    <span className="text-sm font-black text-slate-400">#{idx + 1}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <Link to={`/admin/profile/${leader.id}`} className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#110A24] border border-slate-200 dark:border-violet-500/20 shrink-0 block hover:scale-105 transition-all">
                        {leader.profile_pic ? (
                          <img src={getImageUrl(leader.profile_pic)} alt={leader.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-black text-slate-400 dark:text-violet-300 text-xs bg-[#7C3AED]/10 dark:bg-violet-950/40">{leader.name.charAt(0)}</div>
                        )}
                      </Link>
                      <div>
                        <Link to={`/admin/profile/${leader.id}`} className="text-sm font-black text-[#1E184B] dark:text-indigo-100 hover:text-[#7C3AED] transition-colors block">
                          {leader.name}
                        </Link>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-violet-400/60">{leader.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs font-bold text-[#1E184B] dark:text-indigo-200">{leader.department_name || '--'}</p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-violet-400/60">{leader.college_name || '--'}</p>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-black">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {leader.tasks_completed}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <p className="text-lg font-black text-[#1E184B] dark:text-indigo-100">{leader.total_points}</p>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center">
                    <div className="w-12 h-12 bg-slate-50 dark:bg-violet-950/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Award className="w-5 h-5 text-slate-400 dark:text-violet-400" />
                    </div>
                    <p className="text-sm font-black text-[#1E184B] dark:text-indigo-100">No leaderboard data available.</p>
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
