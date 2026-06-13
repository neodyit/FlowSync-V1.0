import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Target, 
  ArrowUpRight,
  CheckCircle2,
  PieChart
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import { cn, getImageUrl } from '@/lib/utils';

interface DeptRanking {
  id: number;
  dept_name: string;
  total_faculty: number;
  total_points: number;
  total_bonus: number;
  total_score: number;
  completed_tasks: number;
}

interface FacultyPerformer {
  id: number;
  name: string;
  dept_name: string;
  total_score: number;
  department_id: number;
  profile_pic: string | null;
}

const HODLeaderboard: React.FC = () => {
  const [deptRankings, setDeptRankings] = useState<DeptRanking[]>([]);
  const [facultyList, setFacultyList] = useState<FacultyPerformer[]>([]);
  const [myDeptId, setMyDeptId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/leaderboard.php`, {
        credentials: 'include'
      });
      const result = await response.json();
      if (result.status === 'success') {
        setDeptRankings(result.data.college_rankings);
        setFacultyList(result.data.faculty_leaderboard);
        setMyDeptId(result.data.my_dept_id);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const myDeptIndex = deptRankings.findIndex(d => d.id === myDeptId);
  const myDept = deptRankings[myDeptIndex];

  // Determine if our department is in the top 3, otherwise append it so we know where we stand!
  const isMyDeptInTop3 = myDeptIndex >= 0 && myDeptIndex < 3;
  const cardsToRender = [...deptRankings.slice(0, 3)];
  if (myDept && !isMyDeptInTop3) {
    cardsToRender.push(myDept);
  }

  // Filter faculty vanguard to show only own department faculties
  const ownDeptFaculties = facultyList.filter(f => f.department_id === myDeptId);

  return (
    <div className="max-w-7xl mx-auto space-y-8 md:space-y-12 pb-20 px-3 md:px-0">
      <SEO title="Leadership Leaderboard" description="Compare departmental performance and track institutional talent." />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#7C3AED]/5 rounded-xl mb-3">
            <PieChart className="w-4 h-4 text-[#7C3AED]" />
            <span className="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest">College Analytics</span>
          </div>
          <h1 className="text-4xl font-black text-[#1E184B] tracking-tight">Institutional <span className="text-[#7C3AED]">Benchmarking</span></h1>
          <p className="text-[#1E184B]/60 font-bold mt-2">Strategic performance comparison across departments and faculty.</p>
        </div>

        {myDept && (
          <div className="bg-[#7C3AED] rounded-3xl p-6 text-white flex items-center gap-6 shadow-xl shadow-[#7C3AED]/20">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Your Dept Rank</p>
              <p className="text-2xl font-black">#{myDeptIndex + 1} <span className="text-sm font-bold text-white/40 ml-1">Overall</span></p>
            </div>
          </div>
        )}
      </div>

      {/* Top Cards - Departmental Comparison */}
      <div className={cn(
        "grid grid-cols-1 gap-6",
        cardsToRender.length === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-2 lg:grid-cols-3"
      )}>
        {cardsToRender.map((dept, idx) => {
          const actualRank = deptRankings.findIndex(d => d.id === dept.id) + 1;
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={dept.id}
              className={cn(
                "p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border relative overflow-hidden group transition-all",
                dept.id === myDeptId 
                  ? "bg-[#1E184B] border-[#1E184B] text-white shadow-2xl shadow-[#1E184B]/20 scale-105 z-10" 
                  : "bg-white border-[#7C3AED]/10 text-[#1E184B] hover:shadow-xl"
              )}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-current to-transparent opacity-5 -mr-10 -mt-10" />
              
              <div className="flex items-center justify-between mb-8">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center font-black",
                  dept.id === myDeptId ? "bg-white/10" : "bg-[#7C3AED]/5 text-[#7C3AED]"
                )}>
                  #{actualRank}
                </div>
                <ArrowUpRight className={cn(
                  "w-5 h-5",
                  dept.id === myDeptId ? "text-white/40" : "text-slate-300"
                )} />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black truncate">{dept.dept_name}</h3>
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  dept.id === myDeptId ? "text-white/40" : "text-slate-400"
                )}>{dept.total_faculty} Active Faculty</p>
              </div>

              <div className="mt-8 pt-8 border-t border-current/10 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-black">{dept.total_score}</p>
                  <p className={cn("text-[9px] font-black uppercase tracking-widest", dept.id === myDeptId ? "text-[#7C3AED]" : "text-[#7C3AED]")}>Total Points</p>
                </div>
                <div>
                  <p className="text-2xl font-black">{dept.completed_tasks}</p>
                  <p className={cn("text-[9px] font-black uppercase tracking-widest", dept.id === myDeptId ? "text-emerald-400" : "text-emerald-500")}>Tasks Done</p>
                </div>
              </div>

              {dept.id === myDeptId && (
                <div className="mt-6 flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Target: Next Rank</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Full Department List */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">All College Departments</h2>
          </div>
          <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-[#7C3AED]/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#7C3AED]/5">
                    <th className="px-3 sm:px-8 py-4 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rank</th>
                    <th className="px-3 sm:px-8 py-4 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</th>
                    <th className="px-3 sm:px-8 py-4 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Score</th>
                    <th className="px-3 sm:px-8 py-4 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Missions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#7C3AED]/5">
                  {deptRankings.map((dept, idx) => (
                    <tr key={dept.id} className={cn(
                      "hover:bg-slate-50/50 transition-colors group",
                      dept.id === myDeptId && "bg-[#7C3AED]/[0.02]"
                    )}>
                      <td className="px-3 sm:px-8 py-4 sm:py-6">
                        <span className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black",
                          idx < 3 ? "bg-amber-50 text-amber-600" : "text-slate-400"
                        )}>{idx + 1}</span>
                      </td>
                      <td className="px-3 sm:px-8 py-4 sm:py-6">
                        <div>
                          <p className="font-black text-sm sm:text-base text-[#1E184B] group-hover:text-[#7C3AED] transition-colors">{dept.dept_name}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">{dept.total_faculty} Academic Staff</p>
                        </div>
                      </td>
                      <td className="px-3 sm:px-8 py-4 sm:py-6 text-center">
                        <span className="text-sm font-black text-[#1E184B]">{dept.total_score}</span>
                      </td>
                      <td className="px-3 sm:px-8 py-4 sm:py-6 text-right">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-lg">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] font-black text-emerald-600">{dept.completed_tasks}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Faculty List Sidebar */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Faculty Vanguard</h2>
            <span className="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest">Dept Top</span>
          </div>
          <div className="space-y-3">
            {ownDeptFaculties.length > 0 ? (
              ownDeptFaculties.map((performer, idx) => (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={performer.id}
                  className={cn(
                    "bg-white rounded-2xl border p-4 flex items-center gap-4 transition-all",
                    performer.department_id === myDeptId 
                      ? "border-[#7C3AED]/30 shadow-lg shadow-[#7C3AED]/5 bg-[#7C3AED]/[0.01]" 
                      : "border-[#7C3AED]/5"
                  )}
                >
                  <div className="w-6 flex items-center justify-center font-black text-xs text-[#1E184B] dark:text-indigo-100 shrink-0">
                    {idx + 1}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-[#110A24] overflow-hidden flex items-center justify-center font-black text-xs text-[#1E184B] shrink-0">
                    {performer.profile_pic ? (
                      <img src={getImageUrl(performer.profile_pic)} className="w-full h-full object-cover" alt="" loading="lazy" />
                    ) : (
                      performer.name.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/hod/profile/${performer.id}`} className="text-sm font-black text-[#1E184B] truncate hover:text-[#7C3AED] transition-colors block">
                      {performer.name}
                    </Link>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{performer.dept_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-[#7C3AED]">{performer.total_score}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pts</p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-8 bg-white border border-[#7C3AED]/5 rounded-3xl text-center">
                <p className="text-xs text-slate-400 font-bold italic">No faculty records found in your department.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HODLeaderboard;
