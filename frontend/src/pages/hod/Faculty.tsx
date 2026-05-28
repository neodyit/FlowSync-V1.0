import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar,
  Activity,
  Briefcase,
  ExternalLink,
  User,
  ArrowRight,
  Eye,
  Trophy,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';
import { cn, formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  deadline: string;
  accepted_at: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  declined_at: string | null;
  created_at: string;
  points: number;
  bonus_points: number;
}

interface FacultyMember {
  id: number;
  name: string;
  email: string;
  is_active: number;
  tasks: Task[];
  task_count: number;
  completed_count: number;
  active_count: number;
  total_points: number;
  profile_pic: string | null;
}

const HODFaculty: React.FC = () => {
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyMember | null>(null);
  const navigate = useNavigate();

  const fetchFaculty = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/faculty.php`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        setFaculty(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch faculty:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculty();
  }, []);

  const filteredFaculty = faculty.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Assigned': return { color: 'text-blue-500', bg: 'bg-blue-500', label: 'Pending' };
      case 'Broadcasted': return { color: 'text-indigo-500', bg: 'bg-indigo-500', label: 'Broadcast' };
      case 'Accepted': return { color: 'text-indigo-500', bg: 'bg-indigo-500', label: 'Accepted' };
      case 'In Progress': return { color: 'text-amber-500', bg: 'bg-amber-500', label: 'Working' };
      case 'Submitted': return { color: 'text-purple-500', bg: 'bg-purple-500', label: 'For Review' };
      case 'Approved':
      case 'Completed': return { color: 'text-emerald-500', bg: 'bg-emerald-500', label: 'Finalized' };
      case 'Rejected':
      case 'Declined': return { color: 'text-rose-500', bg: 'bg-rose-500', label: 'Rejected' };
      case 'Rework Required': return { color: 'text-orange-500', bg: 'bg-orange-500', label: 'Rework' };
      default: return { color: 'text-slate-400', bg: 'bg-slate-400', label: status };
    }
  };

  const getTaskCardStyle = (status: string) => {
    switch (status) {
      case 'Assigned': 
      case 'Broadcasted':
        return 'bg-blue-50/40 dark:bg-blue-950/15 backdrop-blur-md border-blue-100/60 dark:border-blue-900/35 hover:bg-blue-50/60 dark:hover:bg-blue-950/25 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xl hover:shadow-blue-500/[0.04]';
      case 'Accepted': 
        return 'bg-indigo-50/40 dark:bg-indigo-950/15 backdrop-blur-md border-indigo-100/60 dark:border-indigo-900/35 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/25 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xl hover:shadow-indigo-500/[0.04]';
      case 'In Progress': 
        return 'bg-amber-50/40 dark:bg-amber-950/15 backdrop-blur-md border-amber-100/60 dark:border-amber-900/35 hover:bg-amber-50/60 dark:hover:bg-amber-950/25 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-xl hover:shadow-amber-500/[0.04]';
      case 'Submitted': 
        return 'bg-purple-50/40 dark:bg-purple-950/15 backdrop-blur-md border-purple-100/60 dark:border-purple-900/35 hover:bg-purple-50/60 dark:hover:bg-purple-950/25 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-xl hover:shadow-purple-500/[0.04]';
      case 'Approved':
      case 'Completed': 
        return 'bg-emerald-50/40 dark:bg-emerald-950/15 backdrop-blur-md border-emerald-100/60 dark:border-emerald-900/35 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/25 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-xl hover:shadow-emerald-500/[0.04]';
      case 'Rejected':
      case 'Declined': 
        return 'bg-rose-50/40 dark:bg-rose-950/15 backdrop-blur-md border-rose-100/60 dark:border-rose-900/35 hover:bg-rose-50/60 dark:hover:bg-rose-950/25 hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-xl hover:shadow-rose-500/[0.04]';
      case 'Rework Required': 
        return 'bg-orange-50/40 dark:bg-orange-950/15 backdrop-blur-md border-orange-100/60 dark:border-orange-900/35 hover:bg-orange-50/60 dark:hover:bg-orange-950/25 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-xl hover:shadow-orange-500/[0.04]';
      default: 
        return 'bg-white/40 dark:bg-[#110A24]/40 backdrop-blur-md border-slate-100 dark:border-slate-800 hover:bg-white/60 dark:hover:bg-[#110A24]/60 hover:border-[#7C3AED]/30 dark:hover:border-[#8B5CF6]/30 hover:shadow-xl hover:shadow-[#7C3AED]/[0.04]';
    }
  };

  const TaskTimeline = ({ task }: { task: Task }) => {
    const stages = [
      { key: 'created_at', label: 'Assigned', date: task.created_at },
      { key: 'accepted_at', label: 'Accepted', date: task.accepted_at || (['Accepted', 'In Progress', 'Submitted', 'Approved', 'Completed'].includes(task.status) ? task.created_at : null) },
      { key: 'working', label: 'Working', date: (['In Progress', 'Submitted', 'Approved', 'Completed'].includes(task.status)) ? (task.accepted_at || task.created_at) : null },
      { key: 'submitted_at', label: 'Submitted', date: task.submitted_at || (['Submitted', 'Approved', 'Completed'].includes(task.status) ? task.created_at : null) },
      { key: 'completed_at', label: 'Finalized', date: (['Approved', 'Completed'].includes(task.status)) ? (task.completed_at || task.created_at) : (task.declined_at || (task.status === 'Rejected' ? task.created_at : null)) }
    ];

    return (
      <div className="overflow-x-auto -mx-2 px-2 no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style dangerouslySetInnerHTML={{__html: `.no-scrollbar::-webkit-scrollbar { display: none; }`}} />
        <div className="flex items-center gap-1.5 py-4 min-w-[260px] sm:min-w-0 justify-between no-scrollbar">
          {stages.map((stage, i) => {
            const isDone = !!stage.date;
            const isLast = i === stages.length - 1;
            const config = getStatusConfig(task.status);
            
            return (
              <React.Fragment key={stage.key}>
                <div className="flex flex-col items-center gap-1 group shrink-0">
                  <div className={cn(
                    "w-3 h-3 rounded-full transition-all duration-500 relative",
                    isDone ? config.bg : 'bg-slate-200'
                  )}>
                    {isDone && <div className={cn("absolute inset-0 rounded-full animate-ping opacity-20", config.bg)} />}
                  </div>
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-tighter transition-colors",
                    isDone ? "text-[#1E184B]" : "text-slate-300"
                  )}>
                    {stage.label}
                  </span>
                </div>
                {!isLast && (
                  <div className={cn(
                    "flex-1 h-[2px] mb-4 transition-all duration-500 min-w-[12px]",
                    isDone && !!stages[i+1].date ? config.bg : 'bg-slate-100'
                  )} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto">
      <SEO title="Faculty Oversight" description="Monitor departmental workload and task progress." />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-[#1E184B] tracking-tight">Faculty Monitoring</h1>
          <p className="text-[#1E184B]/60 mt-1 text-xs md:text-sm font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#7C3AED]" />
            Real-time workload and task progression.
          </p>
        </div>
        
        {/* Hide search input on mobile when detail pane is active */}
        <div className={cn("relative group w-full md:w-80", selectedFaculty && "hidden md:block")}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#7C3AED] transition-colors" />
          <input 
            type="text" 
            placeholder="Search faculty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 md:py-3.5 bg-white border border-[#7C3AED]/10 rounded-xl md:rounded-2xl outline-none focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-xs md:text-sm font-bold shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Left Column: Faculty List - Hidden on mobile when a faculty member is selected */}
        <div className={cn("lg:col-span-4 space-y-4", selectedFaculty && "hidden lg:block")}>
          {isLoading ? (
            [1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-3xl animate-pulse border border-slate-100" />)
          ) : filteredFaculty.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-100 text-center text-[#1E184B]/30 font-bold italic text-sm">
              No faculty members found.
            </div>
          ) : (
            filteredFaculty.map((f) => (
              <motion.button
                key={f.id}
                onClick={() => setSelectedFaculty(f)}
                className={cn(
                  "w-full p-4 md:p-5 rounded-2xl md:rounded-3xl border transition-all text-left group",
                  selectedFaculty?.id === f.id 
                    ? "bg-[#7C3AED] border-[#7C3AED] shadow-xl shadow-[#7C3AED]/20" 
                    : "bg-white border-slate-100 hover:border-[#7C3AED]/30 hover:shadow-lg"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl overflow-hidden flex items-center justify-center font-black text-sm md:text-lg shrink-0 transition-colors",
                    selectedFaculty?.id === f.id ? "bg-white/20 text-white" : "bg-slate-50 text-[#7C3AED]"
                  )}>
                    {f.profile_pic ? (
                      <img src={`${import.meta.env.VITE_API_URL}/${f.profile_pic}`} className="w-full h-full object-cover" alt="" />
                    ) : (
                      f.name.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={cn(
                      "font-black text-sm md:text-base truncate",
                      selectedFaculty?.id === f.id ? "text-white" : "text-[#1E184B]"
                    )}>
                      {f.name}
                    </h3>
                    <div className="flex items-center gap-1.5 md:gap-3 mt-1 flex-wrap">
                      <span className={cn(
                        "text-[9px] md:text-[10px] font-bold uppercase tracking-widest",
                        selectedFaculty?.id === f.id ? "text-white/60" : "text-slate-400"
                      )}>
                        {f.active_count} Active
                      </span>
                      <span className="w-1 h-1 rounded-full bg-current opacity-20" />
                      <span className={cn(
                        "text-[9px] md:text-[10px] font-bold uppercase tracking-widest",
                        selectedFaculty?.id === f.id ? "text-white/60" : "text-slate-400"
                      )}>
                        {f.completed_count} Done
                      </span>
                      <span className="w-1 h-1 rounded-full bg-current opacity-20" />
                      <span className={cn(
                        "text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-1",
                        selectedFaculty?.id === f.id ? "text-white" : "text-amber-600"
                      )}>
                        <Trophy className="w-2.5 h-2.5 md:w-3 md:h-3" /> {f.total_points}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={cn(
                    "w-4 h-4 md:w-5 md:h-5 transition-transform shrink-0",
                    selectedFaculty?.id === f.id ? "text-white translate-x-1" : "text-slate-300"
                  )} />
                </div>
              </motion.button>
            ))
          )}
        </div>

        {/* Right Column: Faculty Details & Timeline - Hidden on mobile when no faculty member is selected */}
        <div className={cn("lg:col-span-8", !selectedFaculty && "hidden lg:block")}>
          <AnimatePresence mode="wait">
            {selectedFaculty ? (
              <motion.div
                key={selectedFaculty.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl md:rounded-[2.5rem] border border-[#7C3AED]/10 p-5 md:p-8 shadow-sm"
              >
                {/* Back Button for mobile viewports */}
                <button 
                  onClick={() => setSelectedFaculty(null)} 
                  className="lg:hidden flex items-center gap-2 mb-6 text-[#7C3AED] hover:text-[#6D28D9] font-black text-xs uppercase tracking-widest transition-all"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Faculty List
                </button>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 md:mb-10 shrink-0">
                  <div className="flex items-center gap-4 md:gap-5 min-w-0">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-[#7C3AED] rounded-xl md:rounded-[1.5rem] overflow-hidden flex items-center justify-center text-white font-black text-xl md:text-2xl shadow-xl shadow-[#7C3AED]/20 shrink-0">
                      {selectedFaculty.profile_pic ? (
                        <img src={`${import.meta.env.VITE_API_URL}/${selectedFaculty.profile_pic}`} className="w-full h-full object-cover" alt="" />
                      ) : (
                        selectedFaculty.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg md:text-2xl font-black text-[#1E184B] truncate leading-tight">{selectedFaculty.name}</h2>
                      <p className="text-xs md:text-sm font-bold text-slate-400 truncate">{selectedFaculty.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <div className="flex-1 sm:flex-none px-3 py-2 bg-emerald-50 rounded-xl md:rounded-2xl text-center">
                      <p className="text-[9px] md:text-xs font-black text-emerald-600 uppercase tracking-tighter">Success Rate</p>
                      <p className="text-lg md:text-xl font-black text-emerald-700">
                        {selectedFaculty.task_count > 0 
                          ? Math.round((selectedFaculty.completed_count / selectedFaculty.task_count) * 100) 
                          : 0}%
                      </p>
                    </div>
                    <div className="flex-1 sm:flex-none px-3 py-2 bg-amber-50 rounded-xl md:rounded-2xl text-center">
                      <p className="text-[9px] md:text-xs font-black text-amber-600 uppercase tracking-tighter">Total Merit</p>
                      <p className="text-lg md:text-xl font-black text-amber-700">
                        {selectedFaculty.total_points}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  <h3 className="text-xs font-black text-[#1E184B]/40 uppercase tracking-[0.2em] mb-4">Current Task Timeline</h3>
                  {selectedFaculty.tasks.length === 0 ? (
                    <div className="py-16 md:py-20 text-center border-2 border-dashed border-slate-100 rounded-2xl md:rounded-[2rem]">
                      <Briefcase className="w-8 h-8 md:w-10 md:h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">No assigned tasks found</p>
                    </div>
                  ) : (
                    selectedFaculty.tasks.map((task) => {
                      const config = getStatusConfig(task.status);
                      return (
                        <div key={task.id} className={cn(
                          "p-4 md:p-6 rounded-2xl md:rounded-[2rem] border transition-all duration-300 group shadow-sm",
                          getTaskCardStyle(task.status)
                        )}>
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-black text-sm md:text-base text-[#1E184B] group-hover:text-[#7C3AED] transition-colors truncate">{task.title}</h4>
                                <span className={cn(
                                  "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter border shrink-0",
                                  task.priority === 'High' || task.priority === 'Critical' ? 'bg-rose-50 text-rose-500 border-rose-100' : 
                                  task.priority === 'Medium' ? 'bg-amber-50 text-amber-500 border-amber-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'
                                )}>
                                  {task.priority}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
                                  <Calendar className="w-3 h-3" /> Due: {formatDate(task.deadline)}
                                </span>
                                <span className={cn("text-[10px] font-black uppercase tracking-widest shrink-0", config.color)}>
                                  {task.status}
                                </span>
                                {(task.points > 0 || task.bonus_points > 0) && (
                                  <span className="text-[9px] md:text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0">
                                    <Trophy className="w-3 h-3" /> {Number(task.points) + Number(task.bonus_points)} Merit
                                  </span>
                                )}
                              </div>
                            </div>
                            <button 
                              onClick={() => navigate(`/hod/tasks?taskId=${task.id}`)}
                              className="p-2 md:p-2.5 bg-white rounded-xl shadow-sm text-slate-400 hover:text-[#7C3AED] transition-all self-start sm:self-auto shrink-0"
                              title="Review Task"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <TaskTimeline task={task} />
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-dashed border-[#7C3AED]/20 p-10 md:p-20 text-center h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-[#7C3AED]/5 rounded-2xl md:rounded-3xl flex items-center justify-center mb-6">
                  <User className="w-8 h-8 md:w-10 md:h-10 text-[#7C3AED]/20" />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-[#1E184B]/20 uppercase tracking-widest">Select Faculty</h2>
                <p className="text-[#1E184B]/30 font-bold mt-2 max-w-xs text-xs md:text-sm">Select a faculty member from the list to view their task progression and performance.</p>
                <div className="mt-8 flex items-center gap-2 text-[#7C3AED] font-black text-xs uppercase tracking-widest animate-bounce">
                  <ArrowRight className="w-4 h-4" />
                  Explore Workload
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default HODFaculty;
