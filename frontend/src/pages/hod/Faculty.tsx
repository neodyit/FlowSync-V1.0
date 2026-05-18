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
  Trophy
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

  const TaskTimeline = ({ task }: { task: Task }) => {
    const stages = [
      { key: 'created_at', label: 'Assigned', date: task.created_at },
      { key: 'accepted_at', label: 'Accepted', date: task.accepted_at || (['Accepted', 'In Progress', 'Submitted', 'Approved', 'Completed'].includes(task.status) ? task.created_at : null) },
      { key: 'working', label: 'Working', date: (['In Progress', 'Submitted', 'Approved', 'Completed'].includes(task.status)) ? (task.accepted_at || task.created_at) : null },
      { key: 'submitted_at', label: 'Submitted', date: task.submitted_at || (['Submitted', 'Approved', 'Completed'].includes(task.status) ? task.created_at : null) },
      { key: 'completed_at', label: 'Finalized', date: (['Approved', 'Completed'].includes(task.status)) ? (task.completed_at || task.created_at) : (task.declined_at || (task.status === 'Rejected' ? task.created_at : null)) }
    ];

    return (
      <div className="flex items-center gap-2 py-4">
        {stages.map((stage, i) => {
          const isDone = !!stage.date;
          const isLast = i === stages.length - 1;
          const config = getStatusConfig(task.status);
          
          return (
            <React.Fragment key={stage.key}>
              <div className="flex flex-col items-center gap-1 group">
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
                  "flex-1 h-[2px] mb-4 transition-all duration-500",
                  isDone && !!stages[i+1].date ? config.bg : 'bg-slate-100'
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <SEO title="Faculty Oversight" description="Monitor departmental workload and task progress." />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#1E184B] tracking-tight">Faculty Monitoring</h1>
          <p className="text-[#1E184B]/60 mt-1 font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#7C3AED]" />
            Real-time workload and task progression.
          </p>
        </div>
        
        <div className="relative group w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#7C3AED] transition-colors" />
          <input 
            type="text" 
            placeholder="Search faculty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-[#7C3AED]/10 rounded-2xl outline-none focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Faculty List */}
        <div className="lg:col-span-4 space-y-4">
          {isLoading ? (
            [1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-3xl animate-pulse border border-slate-100" />)
          ) : filteredFaculty.map((f) => (
            <motion.button
              key={f.id}
              onClick={() => setSelectedFaculty(f)}
              className={cn(
                "w-full p-5 rounded-3xl border transition-all text-left group",
                selectedFaculty?.id === f.id 
                  ? "bg-[#7C3AED] border-[#7C3AED] shadow-xl shadow-[#7C3AED]/20" 
                  : "bg-white border-slate-100 hover:border-[#7C3AED]/30 hover:shadow-lg"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center font-black text-lg transition-colors",
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
                    "font-black truncate",
                    selectedFaculty?.id === f.id ? "text-white" : "text-[#1E184B]"
                  )}>
                    {f.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      selectedFaculty?.id === f.id ? "text-white/60" : "text-slate-400"
                    )}>
                      {f.active_count} Active
                    </span>
                    <span className="w-1 h-1 rounded-full bg-current opacity-20" />
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      selectedFaculty?.id === f.id ? "text-white/60" : "text-slate-400"
                    )}>
                      {f.completed_count} Done
                    </span>
                    <span className="w-1 h-1 rounded-full bg-current opacity-20" />
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest flex items-center gap-1",
                      selectedFaculty?.id === f.id ? "text-white" : "text-amber-600"
                    )}>
                      <Trophy className="w-3 h-3" /> {f.total_points}
                    </span>
                  </div>
                </div>
                <ChevronRight className={cn(
                  "w-5 h-5 transition-transform",
                  selectedFaculty?.id === f.id ? "text-white translate-x-1" : "text-slate-300"
                )} />
              </div>
            </motion.button>
          ))}
        </div>

        {/* Right Column: Faculty Details & Timeline */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {selectedFaculty ? (
              <motion.div
                key={selectedFaculty.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-[2.5rem] border border-[#7C3AED]/10 p-8 shadow-sm h-full"
              >
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-[#7C3AED] rounded-[1.5rem] overflow-hidden flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-[#7C3AED]/20">
                      {selectedFaculty.profile_pic ? (
                        <img src={`${import.meta.env.VITE_API_URL}/${selectedFaculty.profile_pic}`} className="w-full h-full object-cover" alt="" />
                      ) : (
                        selectedFaculty.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-[#1E184B]">{selectedFaculty.name}</h2>
                      <p className="text-sm font-bold text-slate-400">{selectedFaculty.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="px-4 py-2 bg-emerald-50 rounded-2xl text-center">
                      <p className="text-xs font-black text-emerald-600 uppercase tracking-tighter">Success Rate</p>
                      <p className="text-xl font-black text-emerald-700">
                        {selectedFaculty.task_count > 0 
                          ? Math.round((selectedFaculty.completed_count / selectedFaculty.task_count) * 100) 
                          : 0}%
                      </p>
                    </div>
                    <div className="px-4 py-2 bg-amber-50 rounded-2xl text-center">
                      <p className="text-xs font-black text-amber-600 uppercase tracking-tighter">Total Merit</p>
                      <p className="text-xl font-black text-amber-700">
                        {selectedFaculty.total_points}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xs font-black text-[#1E184B]/40 uppercase tracking-[0.2em] mb-4">Current Task Timeline</h3>
                  {selectedFaculty.tasks.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                      <Briefcase className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No assigned tasks found</p>
                    </div>
                  ) : (
                    selectedFaculty.tasks.map((task) => {
                      const config = getStatusConfig(task.status);
                      return (
                        <div key={task.id} className="p-6 rounded-[2rem] border border-slate-50 hover:border-[#7C3AED]/20 transition-all group bg-slate-50/50">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <h4 className="font-black text-[#1E184B] group-hover:text-[#7C3AED] transition-colors">{task.title}</h4>
                                <span className={cn(
                                  "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter border",
                                  task.priority === 'High' || task.priority === 'Critical' ? 'bg-rose-50 text-rose-500 border-rose-100' : 
                                  task.priority === 'Medium' ? 'bg-amber-50 text-amber-500 border-amber-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'
                                )}>
                                  {task.priority}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> Due: {formatDate(task.deadline)}
                                </span>
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", config.color)}>
                                  {task.status}
                                </span>
                                {(task.points > 0 || task.bonus_points > 0) && (
                                  <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                    <Trophy className="w-3 h-3" /> {Number(task.points) + Number(task.bonus_points)} Merit Points
                                  </span>
                                )}
                              </div>
                            </div>
                            <button 
                              onClick={() => navigate(`/hod/tasks?taskId=${task.id}`)}
                              className="p-2.5 bg-white rounded-xl shadow-sm text-slate-400 hover:text-[#7C3AED] transition-all"
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
              <div className="bg-white rounded-[2.5rem] border border-dashed border-[#7C3AED]/20 p-20 text-center h-full flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-[#7C3AED]/5 rounded-3xl flex items-center justify-center mb-6">
                  <User className="w-10 h-10 text-[#7C3AED]/20" />
                </div>
                <h2 className="text-2xl font-black text-[#1E184B]/20 uppercase tracking-widest">Select Faculty</h2>
                <p className="text-[#1E184B]/30 font-bold mt-2 max-w-xs">Select a faculty member from the list to view their task progression and performance.</p>
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
