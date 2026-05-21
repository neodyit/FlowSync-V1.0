import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Loader2, 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  Bell, 
  TrendingUp,
  FileText,
  ChevronDown
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

interface AT_Task {
  id: number;
  title: string;
  status: string;
  deadline: string;
}

interface AT_Assignment {
  user_id: number;
  faculty_name: string;
  faculty_email: string;
  profile_pic: string | null;
  status: string;
  progress: number;
  submitted_at: string | null;
  completed_at: string | null;
  points: number;
  bonus_points: number;
  reminder_count: number;
  warning_count: number;
  is_late: number;
  days_late: number;
}

interface AT_Data {
  task: AT_Task & { description: string; points: number; bonus_points: number; };
  assignments: AT_Assignment[];
  kpis: {
    total_assigned: number;
    completed_count: number;
    completion_rate: number;
    late_submissions: number;
    total_reminders: number;
    total_warnings: number;
  };
}

export const AdvancedTracking: React.FC = () => {
  const [tasks, setTasks] = useState<AT_Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [trackingData, setTrackingData] = useState<AT_Data | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState(false);
  
  // Filters
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    fetchTaskList();
  }, []);

  useEffect(() => {
    if (selectedTaskId) {
      fetchTrackingData(selectedTaskId);
    } else {
      setTrackingData(null);
    }
  }, [selectedTaskId]);

  const fetchTaskList = async () => {
    setIsLoadingList(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/hod/advanced_tracking.php`, { credentials: 'include' });
      const json = await res.json();
      if (json.status === 'success') {
        setTasks(json.data.tasks);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingList(false);
    }
  };

  const fetchTrackingData = async (id: number) => {
    setIsLoadingData(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/hod/advanced_tracking.php?task_id=${id}`, { credentials: 'include' });
      const json = await res.json();
      if (json.status === 'success') {
        setTrackingData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingData(false);
    }
  };

  const filteredAssignments = trackingData?.assignments.filter(a => {
    const matchesSearch = a.faculty_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  if (isLoadingList) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
        <p className="text-xs font-black text-[#1E184B] uppercase tracking-[0.2em] animate-pulse">Loading Mission Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Filter Bar */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 items-center z-50">
        <div className="relative flex-1 w-full">
          <FileText className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
          
          <div className="relative w-full">
            <button 
              onClick={() => setIsTaskDropdownOpen(!isTaskDropdownOpen)}
              className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-black text-[#1E184B] focus:ring-4 focus:ring-[#7C3AED]/5 transition-all outline-none flex justify-between items-center hover:border-indigo-200"
            >
              {selectedTaskId ? tasks.find(t => t.id === selectedTaskId)?.title + ` (${tasks.find(t => t.id === selectedTaskId)?.status})` : 'Select a Mission to Analyze...'}
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isTaskDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isTaskDropdownOpen && (
              <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-[100] flex flex-col">
                <div className="p-2 border-b border-slate-100 bg-slate-50/50 sticky top-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search mission name..."
                      value={taskSearchQuery}
                      onChange={(e) => setTaskSearchQuery(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#1E184B] focus:ring-2 focus:ring-[#7C3AED]/20 transition-all outline-none"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <button
                    onClick={() => { setSelectedTaskId(null); setIsTaskDropdownOpen(false); setTaskSearchQuery(''); }}
                    className={`w-full text-left px-5 py-3.5 text-xs font-black transition-colors ${!selectedTaskId ? 'bg-indigo-600 text-white' : 'text-[#1E184B] hover:bg-slate-50'}`}
                  >
                    Select a Mission to Analyze...
                  </button>
                  {tasks.filter(t => t.title.toLowerCase().includes(taskSearchQuery.toLowerCase())).map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setSelectedTaskId(t.id); setIsTaskDropdownOpen(false); setTaskSearchQuery(''); }}
                      className={`w-full text-left px-5 py-3.5 text-xs font-black transition-colors border-t border-slate-50 ${selectedTaskId === t.id ? 'bg-indigo-600 text-white' : 'text-[#1E184B] hover:bg-slate-50'}`}
                    >
                      {t.title} ({t.status})
                    </button>
                  ))}
                  {tasks.filter(t => t.title.toLowerCase().includes(taskSearchQuery.toLowerCase())).length === 0 && (
                    <div className="px-5 py-8 text-center text-xs font-bold text-slate-400">
                      No missions found matching "{taskSearchQuery}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoadingData && (
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
        </div>
      )}

      {!isLoadingData && trackingData && (
        <div className="space-y-8">
          
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {[
                { label: 'Completion Rate', value: `${trackingData.kpis.completion_rate}%`, sub: `${trackingData.kpis.completed_count}/${trackingData.kpis.total_assigned} Faculties`, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                { label: 'Late Submissions', value: trackingData.kpis.late_submissions, sub: 'Missed deadline', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
                { label: 'Total Reminders', value: trackingData.kpis.total_reminders, sub: 'Pings sent', icon: Bell, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                { label: 'Total Warnings', value: trackingData.kpis.total_warnings, sub: 'Escalations', icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-50' }
              ].map((kpi, i) => (
                <div key={kpi.label} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-bl-[4rem] transition-all group-hover:scale-110", kpi.bg)} />
                  <kpi.icon className={cn("w-6 h-6 mb-6 relative z-10", kpi.color)} />
                  <div className="relative z-10">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</h4>
                    <p className="text-3xl font-black text-[#1E184B]">{kpi.value}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-2 flex items-center gap-1">{kpi.sub}</p>
                  </div>
                </div>
              ))}
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <h3 className="text-lg font-black text-[#1E184B] flex items-center gap-3">
                <Users className="w-5 h-5 text-indigo-500" />
                Faculty Intel Roster
              </h3>
              
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search faculty..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold text-[#1E184B] focus:ring-2 focus:ring-[#7C3AED]/20 transition-all outline-none"
                  />
                </div>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 bg-slate-50 border-none rounded-xl text-[10px] font-black uppercase tracking-widest text-[#1E184B] outline-none cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Approved">Approved</option>
                  <option value="Completed">Completed</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Under Review">Under Review</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Rework Required">Rework Required</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Faculty Member</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timeline</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Alerts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredAssignments.length > 0 ? filteredAssignments.map(a => (
                    <tr key={a.user_id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                            {a.profile_pic ? (
                              <img src={`${import.meta.env.VITE_API_URL}/${a.profile_pic}`} alt={a.faculty_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-black text-slate-400 text-xs">{a.faculty_name.charAt(0)}</div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-black text-[#1E184B]">{a.faculty_name}</p>
                            <p className="text-[10px] font-bold text-slate-400">{a.progress}% Completed</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap",
                          ['Completed', 'Approved'].includes(a.status) ? "bg-emerald-50 text-emerald-600" :
                          ['Submitted', 'Under Review'].includes(a.status) ? "bg-indigo-50 text-indigo-600" :
                          a.status === 'Rework Required' ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-600"
                        )}>
                          {a.status}
                        </span>
                        {a.is_late === 1 && (
                          <span className="ml-2 px-2 py-1 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
                            Late ({a.days_late}d)
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-[10px] font-bold text-slate-500 space-y-1">
                          {a.submitted_at ? (
                            <p>Submitted: <span className="text-[#1E184B]">{formatDate(a.submitted_at)}</span></p>
                          ) : (
                            <p>Submitted: <span className="text-slate-300">--</span></p>
                          )}
                          {a.completed_at ? (
                            <p>Completed: <span className="text-[#1E184B]">{formatDate(a.completed_at)}</span></p>
                          ) : (
                            <p>Completed: <span className="text-slate-300">--</span></p>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-center gap-4">
                          <div className="flex flex-col items-center">
                            <Bell className={cn("w-4 h-4 mb-1", a.reminder_count > 0 ? "text-amber-500" : "text-slate-300")} />
                            <span className="text-[10px] font-black text-[#1E184B]">{a.reminder_count}</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <AlertTriangle className={cn("w-4 h-4 mb-1", a.warning_count > 0 ? "text-rose-500" : "text-slate-300")} />
                            <span className="text-[10px] font-black text-[#1E184B]">{a.warning_count}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-8 py-12 text-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Search className="w-5 h-5 text-slate-400" />
                        </div>
                        <p className="text-sm font-black text-[#1E184B]">No matching faculties found.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
