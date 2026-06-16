import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Users, 
  Award, 
  Loader2, 
  Search, 
  BarChart3, 
  Building2,
  Medal,
  ChevronRight,
  TrendingUp,
  ChevronDown
} from 'lucide-react';
import SEO from '../../components/SEO';
import { cn } from '../../lib/utils';
import Swal from 'sweetalert2';

interface Performer {
  id: number;
  name: string;
  email: string;
  profile_pic: string | null;
  dept_id: number | null;
  dept_name: string;
  total_score: number;
  tasks_completed: number;
  bonus_points: number;
}

interface DepartmentStats {
  dept_id: number;
  dept_name: string;
  faculty_count: number;
  total_score: number;
  avg_score: number;
  total_tasks_completed: number;
}

export default function IALeaderboard() {
  const [activeTab, setActiveTab] = useState<'performers' | 'departments'>('performers');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  
  const [performers, setPerformers] = useState<Performer[]>([]);
  const [departments, setDepartments] = useState<DepartmentStats[]>([]);

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/ia/leaderboard.php`, {
        credentials: 'include'
      });
      const result = await response.json();
      if (result.status === 'success') {
        setPerformers(result.data.top_performers || []);
        setDepartments(result.data.departments_report || []);
      } else {
        Swal.fire('Error', result.message || 'Failed to fetch leaderboard.', 'error');
      }
    } catch (error) {
      console.error('Leaderboard fetch failed:', error);
      Swal.fire('Error', 'Network or connection error. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Filter performers by department first
  const deptFilteredPerformers = selectedDeptId === 'all'
    ? performers
    : performers.filter(p => p.dept_id?.toString() === selectedDeptId);

  // 2. Filter by search query
  const filteredPerformers = deptFilteredPerformers.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.dept_name && p.dept_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredDepartments = departments.filter(d =>
    d.dept_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Determine limits: show top 20 for 'all', show all for a specific department leaderboard
  const performersLimit = selectedDeptId === 'all' ? 20 : 1000;
  const currentLeaderboard = filteredPerformers.slice(0, performersLimit);

  // Top 3 performers for podium display
  const topThree = searchQuery ? [] : currentLeaderboard.slice(0, 3);
  const restOfPerformers = searchQuery ? currentLeaderboard : currentLeaderboard.slice(3);

  const handleViewDepartmentLeaderboard = (deptId: number) => {
    setSelectedDeptId(deptId.toString());
    setActiveTab('performers');
    setSearchQuery('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 pb-20 text-left">
      <SEO title="Institution Leaderboard" description="Track comparative departmental and individual faculty performance scores." />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#1E1B4B] dark:text-indigo-50 tracking-tight flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-500 animate-bounce" />
            Institution Leaderboard
          </h1>
          <p className="text-[#4C1D95]/60 dark:text-indigo-200/60 mt-1 font-bold flex items-center gap-2 text-sm uppercase tracking-widest">
            <TrendingUp className="w-4 h-4 text-[#7C3AED]" />
            Evaluate department & personnel standings
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center p-1 bg-[#7C3AED]/5 border border-[#7C3AED]/10 rounded-2xl w-full md:w-auto overflow-x-auto shrink-0">
          <button
            onClick={() => { setActiveTab('performers'); setSearchQuery(''); }}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer",
              activeTab === 'performers' 
                ? "bg-white dark:bg-[#110A24] text-[#7C3AED] dark:text-violet-400 shadow-md border border-[#7C3AED]/10 dark:border-violet-500/20" 
                : "text-[#4C1D95]/40 dark:text-indigo-200/40 hover:text-[#7C3AED]"
            )}
          >
            <Users className="w-4 h-4" />
            <span>Top 20 Faculty</span>
          </button>
          <button
            onClick={() => { setActiveTab('departments'); setSearchQuery(''); }}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer",
              activeTab === 'departments' 
                ? "bg-white dark:bg-[#110A24] text-[#7C3AED] dark:text-violet-400 shadow-md border border-[#7C3AED]/10 dark:border-violet-500/20" 
                : "text-[#4C1D95]/40 dark:text-indigo-200/40 hover:text-[#7C3AED]"
            )}
          >
            <Building2 className="w-4 h-4" />
            <span>Department Report</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-12 h-12 text-[#7C3AED] animate-spin opacity-20" />
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            {/* Search bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#1E1B4B]/30 dark:text-white/30" />
              <input
                type="text"
                placeholder={activeTab === 'performers' ? "Search faculty or department..." : "Search department..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-6 py-3 w-full bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-2xl text-sm font-bold focus:border-[#7C3AED] dark:focus:border-violet-400 outline-none text-[#1E184B] dark:text-indigo-50 placeholder:text-[#1E184B]/20 dark:placeholder:text-indigo-100/20"
              />
            </div>

            {/* Department Dropdown Filter */}
            {activeTab === 'performers' && (
              <div className="relative shrink-0 min-w-[220px]">
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full pl-5 pr-10 py-3 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-2xl text-sm font-bold focus:border-[#7C3AED] dark:focus:border-violet-400 outline-none text-[#1E184B] dark:text-indigo-50 appearance-none cursor-pointer"
                >
                  <option value="all">All Departments</option>
                  {departments.map(d => (
                    <option key={d.dept_id} value={d.dept_id.toString()}>
                      {d.dept_name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#7C3AED]">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            )}
          </div>

          {activeTab === 'performers' ? (
            <div className="space-y-8">
              {/* Podium for Top 3 (Only show when search is empty to highlight true champions) */}
              {!searchQuery && topThree.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {topThree.map((performer, idx) => {
                    const place = idx + 1;
                    const placeStyle = 
                      place === 1 
                        ? { bg: 'bg-gradient-to-br from-amber-400/10 via-amber-500/5 to-transparent border-amber-400/30', badge: 'bg-amber-500 shadow-amber-500/30 text-white', medal: '🥇' }
                        : place === 2
                          ? { bg: 'bg-gradient-to-br from-slate-300/10 via-slate-400/5 to-transparent border-slate-300/30', badge: 'bg-slate-400 shadow-slate-400/30 text-white', medal: '🥈' }
                          : { bg: 'bg-gradient-to-br from-orange-400/10 via-orange-500/5 to-transparent border-orange-400/30', badge: 'bg-orange-500 shadow-orange-500/30 text-white', medal: '🥉' };

                    return (
                      <div 
                        key={performer.id}
                        className={cn(
                          "relative rounded-[2.5rem] border p-8 shadow-sm flex flex-col items-center text-center overflow-hidden transition-all hover:scale-[1.02]",
                          placeStyle.bg,
                          place === 1 ? "md:-translate-y-4 md:border-2" : ""
                        )}
                      >
                        <div className="absolute top-4 right-4 text-3xl font-black">{placeStyle.medal}</div>
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black uppercase tracking-widest absolute top-4 left-4 shadow-lg", placeStyle.badge)}>
                          #{place}
                        </div>

                        {/* Avatar */}
                        <div className="w-20 h-20 rounded-3xl bg-[#7C3AED]/5 border border-[#7C3AED]/10 dark:border-violet-500/20 overflow-hidden flex items-center justify-center shadow-md mb-4 mt-2">
                          {performer.profile_pic ? (
                            <img src={`${import.meta.env.VITE_API_URL}/${performer.profile_pic}`} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <Users className="w-10 h-10 text-[#7C3AED]" />
                          )}
                        </div>

                        <h3 className="text-lg font-black text-[#1E1B4B] dark:text-indigo-50 line-clamp-1">{performer.name}</h3>
                        <p className="text-xs font-black text-[#7C3AED] dark:text-violet-400 uppercase tracking-wider mt-1">{performer.dept_name || 'General Operations'}</p>

                        <div className="grid grid-cols-2 gap-4 w-full mt-6 pt-6 border-t border-[#7C3AED]/5 dark:border-violet-500/10 text-xs">
                          <div>
                            <span className="text-slate-400 dark:text-indigo-200/40 font-bold block">Tasks Done</span>
                            <span className="font-black text-[#1E1B4B] dark:text-indigo-50 text-base">{performer.tasks_completed}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 dark:text-indigo-200/40 font-bold block">Points</span>
                            <span className="font-black text-[#7C3AED] dark:text-violet-400 text-lg">{performer.total_score}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Performers List (Remaining rankings) */}
              <div className="bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-[#7C3AED]/5 dark:border-violet-500/10 bg-slate-50/50 dark:bg-violet-950/5 flex justify-between items-center">
                  <h3 className="text-sm font-black text-[#1E1B4B] dark:text-white uppercase tracking-widest">
                    {selectedDeptId === 'all' ? 'Faculty Leaderboard Standings' : `${departments.find(d => d.dept_id.toString() === selectedDeptId)?.dept_name || 'Department'} Standings`}
                  </h3>
                  <span className="text-xs font-bold text-slate-400 dark:text-indigo-200/40">
                    {selectedDeptId === 'all' ? 'Showing Top 20' : 'Showing All'}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-violet-500/10">
                  {(searchQuery ? filteredPerformers : restOfPerformers).length === 0 ? (
                    <div className="p-16 text-center text-slate-400">
                      <Award className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-sm font-bold">No standing records found matching query.</p>
                    </div>
                  ) : (
                    (searchQuery ? filteredPerformers : restOfPerformers).map((performer, index) => {
                      // Rank calculation based on the department-filtered subset
                      const actualRank = searchQuery 
                        ? deptFilteredPerformers.findIndex(p => p.id === performer.id) + 1 
                        : index + 4;
                      return (
                        <div 
                          key={performer.id}
                          className="flex items-center justify-between p-5 hover:bg-slate-50/50 dark:hover:bg-violet-950/10 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            {/* Rank Indicator */}
                            <span className="w-8 text-center text-sm font-black text-[#7C3AED]/40 dark:text-violet-400/40 uppercase tracking-widest">
                              #{actualRank}
                            </span>

                            {/* Avatar */}
                            <div className="w-11 h-11 rounded-xl bg-[#7C3AED]/5 border border-[#7C3AED]/10 dark:border-violet-500/10 overflow-hidden flex items-center justify-center shadow-sm shrink-0">
                              {performer.profile_pic ? (
                                <img src={`${import.meta.env.VITE_API_URL}/${performer.profile_pic}`} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <Users className="w-5 h-5 text-[#7C3AED]" />
                              )}
                            </div>

                            <div>
                              <p className="text-sm font-black text-[#1E1B4B] dark:text-indigo-100">{performer.name}</p>
                              <p className="text-[10px] font-black text-[#7C3AED] dark:text-violet-400 uppercase tracking-widest mt-0.5">{performer.dept_name || 'General Operations'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-8 text-right text-xs">
                            <div className="hidden sm:block">
                              <span className="text-[10px] text-slate-400 dark:text-indigo-200/30 font-bold block">Tasks Done</span>
                              <span className="font-black text-[#1E1B4B] dark:text-indigo-100">{performer.tasks_completed}</span>
                            </div>
                            <div className="hidden sm:block">
                              <span className="text-[10px] text-slate-400 dark:text-indigo-200/30 font-bold block">Bonus</span>
                              <span className="font-black text-amber-500">+{performer.bonus_points}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 dark:text-indigo-200/30 font-bold block">Total Points</span>
                              <span className="text-sm font-black text-[#7C3AED] dark:text-violet-400">{performer.total_score}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Departments Performance Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredDepartments.length === 0 ? (
                <div className="col-span-full bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-[2.5rem] p-16 text-center text-slate-400">
                  <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-bold">No department records found.</p>
                </div>
              ) : (
                filteredDepartments.map((dept, index) => {
                  const rank = index + 1;
                  return (
                    <div 
                      key={dept.dept_id}
                      className="bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group hover:border-[#7C3AED]/30 transition-all hover:scale-[1.01]"
                    >
                      <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                        <Building2 className="w-32 h-32 text-[#7C3AED]" />
                      </div>

                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <span className="text-[10px] font-black text-slate-400 dark:text-indigo-200/40 uppercase tracking-widest block">Rank #{rank}</span>
                          <h3 className="text-lg font-black text-[#1E1B4B] dark:text-indigo-50 mt-1">{dept.dept_name}</h3>
                        </div>
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-sm",
                          rank === 1 
                            ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                            : rank === 2
                              ? "bg-slate-400/10 text-slate-400 border border-slate-400/20"
                              : "bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/20"
                        )}>
                          #{rank}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 border-t border-slate-100 dark:border-violet-500/10 pt-6 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 dark:text-indigo-200/30 font-bold block uppercase tracking-wider">Faculty Count</span>
                          <span className="text-sm font-black text-[#1E1B4B] dark:text-indigo-50">{dept.faculty_count} Members</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 dark:text-indigo-200/30 font-bold block uppercase tracking-wider">Total Tasks</span>
                          <span className="text-sm font-black text-[#1E1B4B] dark:text-indigo-50">{dept.total_tasks_completed} Done</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 dark:text-indigo-200/30 font-bold block uppercase tracking-wider">Total Score</span>
                          <span className="text-sm font-black text-[#7C3AED] dark:text-violet-400">{dept.total_score} Pts</span>
                        </div>
                      </div>

                      <div className="mt-6 p-4 rounded-2xl bg-slate-50/50 dark:bg-violet-950/20 flex items-center justify-between border border-[#7C3AED]/5 dark:border-violet-500/5 text-xs font-bold text-slate-500 dark:text-indigo-200/50">
                        <span className="flex items-center gap-1.5">
                          <Medal className="w-4 h-4 text-[#7C3AED] dark:text-violet-400" />
                          Average Performance Score
                        </span>
                        <span className="font-black text-[#7C3AED] dark:text-violet-400 text-sm">{dept.avg_score} pts/faculty</span>
                      </div>

                      <button 
                        onClick={() => handleViewDepartmentLeaderboard(dept.dept_id)}
                        className="w-full mt-4 py-2.5 rounded-xl border border-[#7C3AED]/10 dark:border-violet-500/20 hover:border-[#7C3AED]/30 dark:hover:border-violet-400/40 hover:bg-[#7C3AED]/5 text-xs font-black uppercase tracking-wider text-[#7C3AED] dark:text-violet-400 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        View Standings <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
