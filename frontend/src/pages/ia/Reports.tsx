import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Download, 
  Search, 
  Building2, 
  Users, 
  UserCheck, 
  AlertTriangle,
  Award,
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react';

interface DepartmentReport {
  id: number;
  name: string;
  code: string;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  engagement_score: number;
}

interface FacultyReport {
  id: number;
  name: string;
  email: string;
  department_name: string | null;
  assigned_tasks: number;
  completion_rate: number;
  rework_count: number;
  points_earned: number;
}

interface HODReport {
  id: number;
  name: string;
  email: string;
  department_name: string | null;
  department_performance: number;
  team_productivity: number;
  approval_metrics: number;
}

type TabType = 'departments' | 'hods' | 'faculty';

export default function IAReports() {
  const [activeTab, setActiveTab] = useState<TabType>('departments');
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState<{
    departments: DepartmentReport[];
    faculty: FacultyReport[];
    hods: HODReport[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        const response = await fetch(`${apiUrl}/ia/reports.php`, {
          credentials: 'include'
        });
        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('Reporting features are disabled for this institution.');
          }
          throw new Error('Failed to fetch reports data');
        }
        const result = await response.json();
        if (result.status === 'success') {
          setData(result.data);
        } else {
          setError(result.message || 'An error occurred while fetching reports');
        }
      } catch (err: any) {
        setError(err.message || 'Connection to the reports API failed.');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleExportCSV = () => {
    if (!data) return;

    let csvContent = '';
    let filename = '';

    const escapeCSV = (str: string) => {
      if (!str) return '""';
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    if (activeTab === 'departments') {
      const headers = ['Department Name', 'Code', 'Total Tasks', 'Completed Tasks', 'Pending Tasks', 'Engagement Score'];
      csvContent += headers.join(',') + '\n';
      
      const filtered = data.departments.filter(d => 
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        d.code.toLowerCase().includes(searchQuery.toLowerCase())
      );

      filtered.forEach(d => {
        csvContent += [
          escapeCSV(d.name),
          escapeCSV(d.code),
          d.total_tasks,
          d.completed_tasks,
          d.pending_tasks,
          d.engagement_score
        ].join(',') + '\n';
      });
      filename = 'Department_Performance_Report.csv';
    } else if (activeTab === 'faculty') {
      const headers = ['Faculty Name', 'Email', 'Department', 'Assigned Tasks', 'Completion Rate (%)', 'Rework Count', 'Points Earned'];
      csvContent += headers.join(',') + '\n';

      const filtered = data.faculty.filter(f => 
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (f.department_name && f.department_name.toLowerCase().includes(searchQuery.toLowerCase()))
      );

      filtered.forEach(f => {
        csvContent += [
          escapeCSV(f.name),
          escapeCSV(f.email),
          escapeCSV(f.department_name || 'Unassigned'),
          f.assigned_tasks,
          `${f.completion_rate}%`,
          f.rework_count,
          f.points_earned
        ].join(',') + '\n';
      });
      filename = 'Faculty_Performance_Report.csv';
    } else {
      const headers = ['HOD Name', 'Email', 'Department', 'Department Performance (%)', 'Team Productivity', 'Approval Metrics'];
      csvContent += headers.join(',') + '\n';

      const filtered = data.hods.filter(h => 
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (h.department_name && h.department_name.toLowerCase().includes(searchQuery.toLowerCase()))
      );

      filtered.forEach(h => {
        csvContent += [
          escapeCSV(h.name),
          escapeCSV(h.email),
          escapeCSV(h.department_name || 'Unassigned'),
          `${h.department_performance}%`,
          h.team_productivity,
          h.approval_metrics
        ].join(',') + '\n';
      });
      filename = 'HOD_Performance_Report.csv';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] dark:border-violet-500/20 dark:border-t-violet-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/30 rounded-3xl flex items-center gap-4 text-rose-600 dark:text-rose-400 max-w-xl mx-auto mt-12">
        <AlertTriangle className="w-6 h-6 flex-shrink-0" />
        <div>
          <h3 className="font-black text-sm uppercase tracking-wider">Reports Error</h3>
          <p className="text-xs mt-1 font-bold">{error}</p>
        </div>
      </div>
    );
  }

  const getFilteredData = () => {
    if (!data) return [];
    const q = searchQuery.toLowerCase();
    if (activeTab === 'departments') {
      return data.departments.filter(d => 
        d.name.toLowerCase().includes(q) || 
        d.code.toLowerCase().includes(q)
      );
    } else if (activeTab === 'faculty') {
      return data.faculty.filter(f => 
        f.name.toLowerCase().includes(q) || 
        (f.department_name && f.department_name.toLowerCase().includes(q))
      );
    } else {
      return data.hods.filter(h => 
        h.name.toLowerCase().includes(q) || 
        (h.department_name && h.department_name.toLowerCase().includes(q))
      );
    }
  };

  const filteredItems = getFilteredData();

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1E1B4B] dark:text-indigo-50 tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-[#4C1D95]/60 dark:text-indigo-200/60 mt-1">
            Analyze, monitor, and export performance metrics for departments, HODs, and faculty.
          </p>
        </div>
        
        {data && filteredItems.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white rounded-2xl font-bold text-sm shadow-md hover:shadow-lg transition duration-200"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-[#7C3AED]/10 dark:border-violet-500/20 gap-8">
        {(['departments', 'hods', 'faculty'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setSearchQuery('');
            }}
            className={`pb-4 text-sm font-bold tracking-wide capitalize relative transition-colors ${
              activeTab === tab 
                ? 'text-[#7C3AED] dark:text-violet-400' 
                : 'text-[#4C1D95]/50 dark:text-indigo-200/40 hover:text-[#7C3AED]/80 dark:hover:text-violet-400/80'
            }`}
          >
            <div className="flex items-center gap-2">
              {tab === 'departments' && <Building2 className="w-4 h-4" />}
              {tab === 'hods' && <UserCheck className="w-4 h-4" />}
              {tab === 'faculty' && <Users className="w-4 h-4" />}
              {tab === 'hods' ? 'HODs' : tab}
            </div>
            {activeTab === tab && (
              <motion.div 
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C3AED] dark:bg-violet-400" 
              />
            )}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4C1D95]/40 dark:text-indigo-200/40" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#7C3AED]/10 dark:border-violet-500/20 bg-white dark:bg-[#110A24] text-sm text-[#1E1B4B] dark:text-indigo-50 focus:outline-none focus:border-[#7C3AED]"
          />
        </div>

        <div className="text-xs font-bold text-[#4C1D95]/50 dark:text-indigo-200/40">
          Showing {filteredItems.length} records
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#4C1D95]/30 dark:text-indigo-200/30">
              <FileText className="w-16 h-16 stroke-[1.5]" />
              <p className="text-sm font-bold mt-4">No report data found matching search criteria.</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#7C3AED]/10 dark:border-violet-500/20 bg-[#FAF9FF] dark:bg-[#181131]">
                  {activeTab === 'departments' && (
                    <>
                      <th className="px-6 py-4 text-xs font-black uppercase text-[#4C1D95]/70 dark:text-indigo-200/70 tracking-wider">Department</th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-[#4C1D95]/70 dark:text-indigo-200/70 tracking-wider">Code</th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-[#4C1D95]/70 dark:text-indigo-200/70 tracking-wider text-center">Total Tasks</th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-[#4C1D95]/70 dark:text-indigo-200/70 tracking-wider text-center">Completed Tasks</th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-[#4C1D95]/70 dark:text-indigo-200/70 tracking-wider text-center">Pending Tasks</th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-[#4C1D95]/70 dark:text-indigo-200/70 tracking-wider text-center">Engagement Score</th>
                    </>
                  )}
                  {activeTab === 'faculty' && (
                    <>
                      <th className="px-6 py-4 text-xs font-black uppercase text-[#4C1D95]/70 dark:text-indigo-200/70 tracking-wider">Faculty Member</th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-[#4C1D95]/70 dark:text-indigo-200/70 tracking-wider">Department</th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-[#4C1D95]/70 dark:text-indigo-200/70 tracking-wider text-center">Assigned Tasks</th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-[#4C1D95]/70 dark:text-indigo-200/70 tracking-wider text-center">Completion Rate</th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-[#4C1D95]/70 dark:text-indigo-200/70 tracking-wider text-center">Rework Count</th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-[#4C1D95]/70 dark:text-indigo-200/70 tracking-wider text-center">Points Earned</th>
                    </>
                  )}
                  {activeTab === 'hods' && (
                    <>
                      <th className="px-6 py-4 text-xs font-black uppercase text-[#4C1D95]/70 dark:text-indigo-200/70 tracking-wider">HOD</th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-[#4C1D95]/70 dark:text-indigo-200/70 tracking-wider">Department</th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-[#4C1D95]/70 dark:text-indigo-200/70 tracking-wider text-center">Dept Performance</th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-[#4C1D95]/70 dark:text-indigo-200/70 tracking-wider text-center">Team Productivity</th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-[#4C1D95]/70 dark:text-indigo-200/70 tracking-wider text-center">Approval Metrics</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#7C3AED]/5 dark:divide-violet-500/10">
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((item: any, idx: number) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15, delay: idx * 0.02 }}
                      className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {activeTab === 'departments' && (
                        <>
                          <td className="px-6 py-4 text-sm font-bold text-[#1E1B4B] dark:text-indigo-50">{item.name}</td>
                          <td className="px-6 py-4 text-sm text-[#4C1D95]/60 dark:text-indigo-200/60 font-mono">{item.code || 'N/A'}</td>
                          <td className="px-6 py-4 text-sm text-[#1E1B4B] dark:text-indigo-50 text-center font-bold">{item.total_tasks}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle className="w-3.5 h-3.5" />
                              {item.completed_tasks}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400">
                              <Clock className="w-3.5 h-3.5" />
                              {item.pending_tasks}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-sm font-black text-[#7C3AED] dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30">
                              <Award className="w-4 h-4 text-amber-500" />
                              {item.engagement_score}
                            </span>
                          </td>
                        </>
                      )}
                      
                      {activeTab === 'faculty' && (
                        <>
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-[#1E1B4B] dark:text-indigo-50">{item.name}</div>
                            <div className="text-xs text-[#4C1D95]/50 dark:text-indigo-200/40">{item.email}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#4C1D95]/60 dark:text-indigo-200/60 font-bold">
                            {item.department_name || <span className="text-rose-500">Unassigned</span>}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#1E1B4B] dark:text-indigo-50 text-center font-bold">{item.assigned_tasks}</td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden hidden sm:block">
                                <div 
                                  className="bg-emerald-500 h-full rounded-full" 
                                  style={{ width: `${item.completion_rate}%` }}
                                />
                              </div>
                              <span className="text-xs font-black text-[#1E1B4B] dark:text-indigo-50">{item.completion_rate}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {item.rework_count > 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400">
                                <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
                                {item.rework_count} Reworks
                              </span>
                            ) : (
                              <span className="text-xs text-[#4C1D95]/40 dark:text-indigo-200/30 font-bold">0</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-sm font-black text-[#7C3AED] dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30">
                              <Award className="w-4 h-4 text-amber-500" />
                              {item.points_earned}
                            </span>
                          </td>
                        </>
                      )}

                      {activeTab === 'hods' && (
                        <>
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-[#1E1B4B] dark:text-indigo-50">{item.name}</div>
                            <div className="text-xs text-[#4C1D95]/50 dark:text-indigo-200/40">{item.email}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#4C1D95]/60 dark:text-indigo-200/60 font-bold">
                            {item.department_name || <span className="text-rose-500">Unassigned</span>}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden hidden sm:block">
                                <div 
                                  className="bg-indigo-500 h-full rounded-full" 
                                  style={{ width: `${item.department_performance}%` }}
                                />
                              </div>
                              <span className="text-xs font-black text-[#1E1B4B] dark:text-indigo-50">{item.department_performance}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm font-bold text-[#1E1B4B] dark:text-indigo-50">{item.team_productivity} pts</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-violet-50 dark:bg-violet-950/20 text-[#7C3AED] dark:text-violet-400">
                              {item.approval_metrics} Reviews
                            </span>
                          </td>
                        </>
                      )}
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
