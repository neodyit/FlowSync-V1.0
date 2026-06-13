import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Users, 
  ArrowRight,
  Settings,
  Calendar,
  Bell,
  Shield,
  Check,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Info,
  ChevronDown,
  User,
  Award,
  Trophy
} from 'lucide-react';
import Swal from 'sweetalert2';
import SEO from '@/components/SEO';
import { cn, formatDate, getImageUrl } from '@/lib/utils';
import DateTimePicker from '@/components/ui/DateTimePicker';

interface Department {
  code: string;
  description: string;
  id: number;
  name: string;
  college_id: number;
  hod_id: number | null;
  hod_name?: string;
  faculty_count?: number;
  is_enabled: number;
}

interface College {
  id: number;
  name: string;
  short_name: string;
  address: string;
  is_enabled: number;
  auto_accept_tasks: number;
  allow_task_decline: number;
}

interface Season {
  id: number;
  college_id: number;
  name: string;
  start_date: string;
  end_date: string;
  type: 'Semester' | 'Academic Year' | 'Custom';
  description: string | null;
  status: 'Active' | 'Inactive' | 'Archived';
  is_default: number;
  is_locked: number;
}

interface FeatureGroup {
  category: string;
  features: { key: string; label: string; desc: string }[];
}

const FEATURE_METADATA: FeatureGroup[] = [
  {
    category: 'Reporting Features',
    features: [
      { key: 'reporting_personalized_faculty', label: 'Faculty Reports', desc: 'Allow faculty to view self-performance reports.' },
      { key: 'reporting_department', label: 'Department Reports', desc: 'Allow HODs to view department stats.' },
      { key: 'reporting_institution', label: 'Institution Reports', desc: 'Allow admins to export overall stats.' },
      { key: 'reporting_historical', label: 'Historical Reports', desc: 'Allow viewing reports from past seasons.' },
      { key: 'reporting_performance_analytics', label: 'Analytics Dashboard', desc: 'Show interactive performance metrics.' }
    ]
  },
  {
    category: 'Season Features',
    features: [
      { key: 'season_management', label: 'Season Control', desc: 'Define custom terms and term dates.' },
      { key: 'season_comparison_reports', label: 'Compare Seasons', desc: 'Compare metric reports between terms.' },
      { key: 'season_historical_analytics', label: 'Historical Trends', desc: 'Analyze overall performance history.' },
      { key: 'season_locking', label: 'Lock Seasons', desc: 'Prevent edits to past terms/seasons.' }
    ]
  },
  {
    category: 'Leaderboard Features',
    features: [
      { key: 'leaderboard_faculty', label: 'Faculty Leaderboard', desc: 'Show points ranking among faculty.' },
      { key: 'leaderboard_department', label: 'Department Leaderboard', desc: 'Show comparative department ranking.' },
      { key: 'leaderboard_institution_rankings', label: 'Campus Leaderboards', desc: 'Display global campus-wide rankings.' },
      { key: 'leaderboard_performance_awards', label: 'Badges & Achievements', desc: 'Enable awards and badges for high performance.' }
    ]
  },
  {
    category: 'Task Management Features',
    features: [
      { key: 'task_group', label: 'Group Tasks', desc: 'Assign tasks to collaborative groups.' },
      { key: 'task_broadcast', label: 'Broadcast Tasks', desc: 'Allow broadcasting tasks open to everyone.' },
      { key: 'task_acceptance_workflow', label: 'Task Acceptance', desc: 'Require staff to accept tasks manually.' },
      { key: 'task_auto_accept', label: 'Auto-Accept Tasks', desc: 'Bypass acceptance step for assigned tasks.' },
      { key: 'task_reminder_system', label: 'Reminders & Alerts', desc: 'Send automatic reminders for tasks.' },
      { key: 'task_deadline_tracking', label: 'Deadline Countdown', desc: 'Show timers and deadline warnings.' },
      { key: 'allow_ia_task_management', label: 'IA Task Privileges', desc: 'Let Institution Admins manage tasks.' },
      { key: 'grace_period_penalties', label: 'Grace Period Penalties', desc: 'Enable automated point deductions for late submissions after a grace period.' }
    ]
  },
  {
    category: 'Collaboration Features',
    features: [
      { key: 'collab_member_visibility', label: 'Member Visibility', desc: 'Allow browsing of other department staff.' },
      { key: 'collab_profile_access', label: 'Profile Access', desc: 'Allow viewing other staff members profile.' },
      { key: 'collab_tools', label: 'Comments & Forums', desc: 'Enable task boards chat and discussion.' }
    ]
  },
  {
    category: 'Notification Features',
    features: [
      { key: 'notice_popups', label: 'Login Popups', desc: 'Trigger important alerts upon log in.' },
      { key: 'notice_banners', label: 'Alert Banners', desc: 'Show notification banners on dashboard topbars.' },
      { key: 'notice_broadcasts', label: 'Global Alerts', desc: 'Send high-priority notifications to everyone.' }
    ]
  },
  {
    category: 'Audit & Security Features',
    features: [
      { key: 'ia_audit_log_visibility', label: 'Audit Log Center', desc: 'Allow IA access to Activity Center logs.' },
      { key: 'profile_completion', label: 'Profile Completion Requirement', desc: 'Prompt users with incomplete profiles to complete their setup.' },
      { key: 'profile_completion_strict', label: 'Strict Profile Completion', desc: 'Enforce mandatory profile completion, blocking portal access.' }
    ]
  }
];

interface CustomSelectProps {
  label?: string;
  value: string | number;
  onChange: (value: string | number) => void;
  options: { value: string | number; label: string }[];
  placeholder?: string;
  icon?: React.ElementType;
  disabled?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ 
  label, value, onChange, options, placeholder, icon: Icon, disabled 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value.toString() === value.toString());

  return (
    <div className="relative flex flex-col gap-1.5 w-full" ref={containerRef}>
      {label && <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">{label}</label>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between w-full px-5 py-3.5 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-2xl transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100
          ${isOpen ? 'border-[#7C3AED] dark:border-violet-400 ring-4 ring-[#7C3AED]/5 dark:ring-violet-400/5' : 'border-[#7C3AED]/10 dark:border-violet-500/20 hover:border-[#7C3AED]/30 dark:hover:border-violet-400/40'}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-violet-950/20' : 'cursor-pointer'}
        `}
      >
        <div className="flex items-center gap-3 truncate">
          {Icon && <Icon className="w-4 h-4 text-[#7C3AED] dark:text-violet-400 opacity-40" />}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-[#7C3AED] dark:text-violet-400" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-[#110A24] rounded-2xl border border-[#7C3AED]/10 dark:border-violet-500/20 shadow-2xl z-[100] overflow-hidden py-2"
          >
            <div className="max-h-60 overflow-y-auto">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full px-5 py-3 text-left text-sm font-bold transition-all flex items-center justify-between cursor-pointer
                    ${opt.value.toString() === value.toString() ? 'bg-[#7C3AED] dark:bg-violet-600 text-white' : 'text-[#1E1B4B] dark:text-indigo-200 hover:bg-[#7C3AED]/5 dark:hover:bg-violet-950/40 hover:text-[#7C3AED] dark:hover:text-violet-300'}
                  `}
                >
                  {opt.label}
                  {opt.value.toString() === value.toString() && <CheckCircle2 className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CollegeDetails: React.FC = () => {
  const { shortName } = useParams<{ shortName: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'departments' | 'seasons' | 'features' | 'broadcast' | 'leaderboard'>(() => {
    const saved = sessionStorage.getItem('college_details_active_tab');
    return (saved as any) || 'departments';
  });

  useEffect(() => {
    sessionStorage.setItem('college_details_active_tab', activeTab);
  }, [activeTab]);

  const [college, setCollege] = useState<College | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Leaderboard states
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [leaderboardDepts, setLeaderboardDepts] = useState<any[]>([]);
  const [leaderboardSeasons, setLeaderboardSeasons] = useState<any[]>([]);
  const [selectedLeaderboardDept, setSelectedLeaderboardDept] = useState<string>('');
  const [selectedLeaderboardSeason, setSelectedLeaderboardSeason] = useState<string>('');
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);

  // Departments Modals/Form
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptFormData, setDeptFormData] = useState({ name: '', code: '', description: '', hod_id: '' });
  const [hods, setHods] = useState<Array<{ id: number; name: string }>>([]);

  // Seasons Modals/Form
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [seasonFormData, setSeasonFormData] = useState({
    name: '', start_date: '', end_date: '', type: 'Semester' as any, description: '', status: 'Inactive' as any, is_default: false, is_locked: false
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Broadcast Notice Form
  const [broadcastData, setBroadcastData] = useState({ target: 'both', title: '', message: '' });
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Fetch college info & settings from endpoint
      const cRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/colleges.php`, { credentials: 'include' });
      const cData = await cRes.json();
      
      if (cData.status === 'success' && cData.data) {
        const found = cData.data.find((c: College) => c.short_name === shortName || c.id.toString() === shortName);
        
        if (found) {
          // Get specific settings (status, departments with status, features)
          const setRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/college_settings.php?college_id=${found.id}`, { credentials: 'include' });
          const setData = await setRes.json();

          if (setData.status === 'success') {
            setCollege(setData.college);
            setDepartments(setData.departments);
            setHods(setData.hods || []);
            
            // Map features to lookup object
            const flags: Record<string, boolean> = {};
            setData.features.forEach((f: any) => {
              flags[f.feature_key] = (f.is_enabled === 1);
            });
            setFeatureFlags(flags);
          }

          // Fetch seasons for this college
          const sRes = await fetch(`${import.meta.env.VITE_API_URL}/academic_seasons.php?college_id=${found.id}`, { credentials: 'include' });
          const sData = await sRes.json();
          if (sData.status === 'success') {
            setSeasons(sData.data);
          }
        }
      }
    } catch (error) {
      console.error('Fetch failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    if (!college) return;
    setIsLeaderboardLoading(true);
    try {
      let url = `${import.meta.env.VITE_API_URL}/admin/leaderboard.php?college_id=${college.id}`;
      if (selectedLeaderboardDept) {
        url += `&department_id=${selectedLeaderboardDept}`;
      }
      if (selectedLeaderboardSeason) {
        url += `&season_id=${selectedLeaderboardSeason}`;
      }
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      if (data.status === 'success') {
        setLeaderboardData(data.data || []);
        setLeaderboardDepts(data.departments || []);
        const seasonsList = data.seasons || [];
        setLeaderboardSeasons(seasonsList);
        
        if (!selectedLeaderboardSeason) {
          const defaultSeason = seasonsList.find((s: any) => s.is_default === 1 || s.is_default === '1');
          if (defaultSeason) {
            setSelectedLeaderboardSeason(defaultSeason.id.toString());
          } else if (data.active_season_id) {
            setSelectedLeaderboardSeason(data.active_season_id.toString());
          } else if (seasonsList.length > 0) {
            setSelectedLeaderboardSeason(seasonsList[0].id.toString());
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setIsLeaderboardLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'leaderboard' && college) {
      fetchLeaderboard();
    }
  }, [activeTab, college?.id, selectedLeaderboardDept, selectedLeaderboardSeason]);

  useEffect(() => {
    fetchData();
  }, [shortName]);

  // Dept handles
  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!college) return;

    const method = editingDept ? 'PUT' : 'POST';
    const body = editingDept 
      ? { ...deptFormData, id: editingDept.id } 
      : { ...deptFormData, college_id: college.id };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/departments.php`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.status === 'success') {
        Swal.fire('Success', editingDept ? 'Department updated' : 'Department created', 'success');
        fetchData();
        setIsDeptModalOpen(false);
      }
    } catch (error) {
      console.error('Operation failed:', error);
    }
  };

  const handleToggleDeptEnabled = async (dept: Department) => {
    if (!college) return;
    try {
      const nextStatus = dept.is_enabled === 1 ? 0 : 1;
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/college_settings.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          college_id: college.id,
          departments_status: { [dept.id]: nextStatus }
        }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        Swal.fire({ title: 'Status Updated', text: `Department ${nextStatus ? 'Activated' : 'Deactivated'} successfully`, icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDept = async (id: number) => {
    if (!window.confirm('Delete this department?')) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/departments.php?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.status === 'success') {
        fetchData();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  // General settings update (College enable/disable, Auto accept, Allow decline)
  const handleUpdateCollegeSetting = async (field: 'is_enabled' | 'auto_accept_tasks' | 'allow_task_decline', val: number) => {
    if (!college) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/college_settings.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          college_id: college.id,
          [field]: val
        }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        Swal.fire({ title: 'Setting Updated', text: 'Institution configuration synchronized', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Feature flag updates
  const handleToggleFeature = async (key: string, isEnabled: boolean) => {
    if (!college) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/college_settings.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          college_id: college.id,
          features: { [key]: isEnabled }
        }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        setFeatureFlags(prev => ({ ...prev, [key]: isEnabled }));
        Swal.fire({ title: 'Feature Synced', text: `${key.replace(/_/g, ' ')} flag updated`, icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Seasons handles
  const handleSeasonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!college) return;
    const payload = {
      id: editingSeason?.id,
      college_id: college.id,
      name: seasonFormData.name,
      start_date: seasonFormData.start_date,
      end_date: seasonFormData.end_date,
      type: seasonFormData.type,
      description: seasonFormData.description,
      status: seasonFormData.status,
      is_default: seasonFormData.is_default ? 1 : 0,
      is_locked: seasonFormData.is_locked ? 1 : 0
    };

    try {
      const url = `${import.meta.env.VITE_API_URL}/academic_seasons.php`;
      const method = editingSeason ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.status === 'success') {
        Swal.fire('Success', editingSeason ? 'Season refined' : 'Season initialized', 'success');
        setIsSeasonModalOpen(false);
        fetchData();
      } else {
        Swal.fire('Error', data.message || 'Validation failed', 'error');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleLockSeason = async (season: Season) => {
    if (!college) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/academic_seasons.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...season,
          college_id: college.id,
          is_locked: season.is_locked === 1 ? 0 : 1
        }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetDefaultSeason = async (season: Season) => {
    if (!college) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/academic_seasons.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...season,
          college_id: college.id,
          is_default: 1
        }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSeason = async (id: number) => {
    if (!college) return;
    if (!confirm('Are you sure you want to delete this season?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/academic_seasons.php?id=${id}&college_id=${college.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchData();
      } else {
        Swal.fire('Error', data.message, 'error');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Broadcast Notification handle
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!college || !broadcastData.message) return;
    setIsBroadcasting(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/college_settings.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'broadcast_notice',
          college_id: college.id,
          target: broadcastData.target,
          title: broadcastData.title || 'Broadcast Alert',
          message: broadcastData.message
        }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        Swal.fire('Broadcast Sent', data.message, 'success');
        setBroadcastData({ target: 'both', title: '', message: '' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsBroadcasting(false);
    }
  };

  if (isLoading) return (
    <div className="flex flex-col justify-center items-center py-32 gap-4">
      <div className="w-12 h-12 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase text-slate-400 dark:text-violet-400 tracking-widest">Enlisting college credentials...</p>
    </div>
  );

  if (!college) return <div className="p-8 text-center text-gray-500 font-bold">College not found.</div>;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      <SEO title={`${college.name} Settings`} />

      <button 
        onClick={() => navigate('/admin/institution')}
        className="flex items-center gap-2 text-[#7C3AED] dark:text-violet-400 font-bold mb-4 hover:gap-3 transition-all cursor-pointer text-sm"
      >
        <ChevronLeft className="w-5 h-5" />
        Back to Colleges
      </button>

      {/* College header */}
      <div className="bg-white dark:bg-[#1A0F35]/20 backdrop-blur-md rounded-[32px] p-6 sm:p-8 border border-[#7C3AED]/10 dark:border-violet-500/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#7C3AED]/10 dark:bg-violet-950/40 rounded-[24px] flex items-center justify-center shrink-0">
            <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-[#7C3AED] dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-[#1E1B4B] dark:text-indigo-100 leading-tight flex items-center gap-3">
              {college.name}
              {college.is_enabled === 0 && (
                <span className="text-[9px] font-black bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/25 px-2 py-0.5 rounded-md uppercase tracking-wider">Deactivated</span>
              )}
            </h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-[#7C3AED]/5 dark:bg-violet-500/10 text-[#7C3AED] dark:text-violet-400 text-[10px] sm:text-[11px] font-black tracking-wider uppercase border border-[#7C3AED]/10">
                {college.short_name}
              </span>
              <p className="text-gray-400 dark:text-violet-300/60 text-xs sm:text-sm font-medium">{college.address}</p>
            </div>
          </div>
        </div>

        {activeTab === 'departments' && (
          <button
            onClick={() => { setEditingDept(null); setDeptFormData({ name: '', code: '', description: '', hod_id: '' }); setIsDeptModalOpen(true); }}
            className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20 cursor-pointer text-sm shrink-0 self-start md:self-auto"
          >
            <Plus className="w-5 h-5" />
            Add Department
          </button>
        )}

        {activeTab === 'seasons' && (
          <button
            onClick={() => {
              setEditingSeason(null);
              setSeasonFormData({ name: '', start_date: '', end_date: '', type: 'Semester', description: '', status: 'Inactive', is_default: false, is_locked: false });
              setIsSeasonModalOpen(true);
            }}
            className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20 cursor-pointer text-sm shrink-0 self-start md:self-auto"
          >
            <Plus className="w-5 h-5" />
            Create Season
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-100 dark:border-violet-500/10 pb-px overflow-x-auto scrollbar-none">
        {([
          { id: 'departments', label: 'Departments', icon: Users },
          { id: 'seasons', label: 'Academic Seasons', icon: Calendar },
          { id: 'features', label: 'Features & Configurations', icon: Settings },
          { id: 'broadcast', label: 'Broadcast Notices', icon: Bell },
          { id: 'leaderboard', label: 'Leaderboard', icon: Trophy }
        ] as const).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-5 py-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap",
                isActive 
                  ? "border-[#7C3AED] text-[#7C3AED] dark:border-violet-400 dark:text-violet-400" 
                  : "border-transparent text-slate-400 dark:text-indigo-300/40 hover:text-slate-600 dark:hover:text-indigo-300"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Panels */}
      <div className="mt-6">
        {activeTab === 'departments' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept) => (
              <motion.div
                key={dept.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "bg-white dark:bg-[#1A0F35]/20 backdrop-blur-md rounded-[24px] border p-6 transition-all group",
                  dept.is_enabled === 0
                    ? "border-rose-200 dark:border-rose-950/40 opacity-70 grayscale-[30%]"
                    : "border-gray-100 dark:border-violet-500/10 hover:border-[#7C3AED]/30 dark:hover:border-violet-500/30"
                )}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-gray-50 dark:bg-violet-950/40 rounded-xl flex items-center justify-center group-hover:bg-[#7C3AED]/10 dark:group-hover:bg-violet-500/20 transition-colors border border-transparent dark:border-violet-500/10">
                    <Users className="w-6 h-6 text-gray-400 dark:text-violet-400/60 group-hover:text-[#7C3AED] dark:group-hover:text-violet-300" />
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleToggleDeptEnabled(dept)}
                      title={dept.is_enabled === 1 ? 'Disable Department' : 'Enable Department'}
                      className={cn("p-2 rounded-lg transition-colors cursor-pointer", dept.is_enabled === 1 ? "text-slate-400 hover:text-rose-500" : "text-slate-400 hover:text-emerald-500")}
                    >
                      {dept.is_enabled === 1 ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>
                    <button onClick={() => { setEditingDept(dept); setDeptFormData({ name: dept.name, code: dept.code || '', description: dept.description || '', hod_id: dept.hod_id?.toString() || '' }); setIsDeptModalOpen(true); }} className="p-2 text-gray-400 dark:text-violet-400/55 hover:text-[#7C3AED] dark:hover:text-violet-300 cursor-pointer">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteDept(dept.id)} className="p-2 text-gray-400 dark:text-violet-400/55 hover:text-rose-500 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-indigo-100 mb-2 leading-snug flex items-center gap-2">
                  {dept.name}
                  {dept.is_enabled === 0 && (
                    <span className="text-[8px] font-black bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">Disabled</span>
                  )}
                </h3>
                {dept.code && (
                  <span className="inline-block mb-3 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-violet-50 dark:bg-violet-950/40 text-[#7C3AED] dark:text-violet-400 rounded-md">
                    {dept.code}
                  </span>
                )}
                {dept.description && (
                  <p className="text-xs text-gray-400 dark:text-violet-300/40 line-clamp-2 mb-4 leading-relaxed">
                    {dept.description}
                  </p>
                )}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-400 dark:text-violet-400/60">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dept.is_enabled === 1 ? "bg-emerald-400" : "bg-rose-400")} />
                    HOD: <span className="text-gray-900 dark:text-indigo-200 font-bold">{dept.hod_name || 'Not Assigned'}</span>
                  </div>
                </div>

                <button 
                  onClick={() => navigate(`/admin/colleges/${shortName}/${dept.id}`)}
                  className="w-full mt-6 py-2.5 bg-gray-50 dark:bg-[#110A24] group-hover:bg-[#7C3AED] text-gray-500 dark:text-violet-400 group-hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-100/50 dark:border-violet-500/10"
                >
                  Manage Department
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'seasons' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {seasons.map((season) => (
              <motion.div
                key={season.id}
                className={cn(
                  "flex flex-col justify-between p-6 bg-white dark:bg-[#110A24]/30 border rounded-[2.5rem] transition-all shadow-sm",
                  season.is_default === 1
                    ? "border-[#7C3AED]/40 dark:border-violet-500/40 ring-4 ring-[#7C3AED]/5 dark:ring-violet-500/5 shadow-md"
                    : "border-[#7C3AED]/10 dark:border-violet-500/10 hover:border-[#7C3AED]/30 dark:hover:border-violet-500/30"
                )}
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className={cn(
                      "px-3 py-1 text-[9px] font-black rounded-full uppercase tracking-wider",
                      season.status === 'Active' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                      season.status === 'Archived' ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" :
                      "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                    )}>
                      {season.status}
                    </span>
                    <div className="flex gap-1.5">
                      {season.is_default === 1 && (
                        <span className="px-2 py-0.5 text-[9px] font-black bg-[#7C3AED] text-white rounded-md tracking-wider">DEFAULT</span>
                      )}
                      {season.is_locked === 1 && (
                        <span className="px-2 py-0.5 text-[9px] font-black bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 rounded-md flex items-center gap-1">
                          <Lock className="h-3 w-3" /> LOCKED
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-[#1E1B4B] dark:text-indigo-100">{season.name}</h3>
                    <p className="text-[10px] font-black text-[#7C3AED] dark:text-violet-400 uppercase tracking-widest mt-0.5">{season.type}</p>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-indigo-200/80 bg-slate-50 dark:bg-[#0E0820]/40 px-3 py-2.5 rounded-2xl border border-slate-100 dark:border-violet-500/5">
                    <Calendar className="h-4 w-4 text-[#7C3AED] dark:text-violet-400" />
                    <span>{formatDate(season.start_date)} – {formatDate(season.end_date)}</span>
                  </div>

                  {season.description && (
                    <p className="text-slate-500 dark:text-indigo-200/60 text-xs leading-relaxed line-clamp-2">{season.description}</p>
                  )}
                </div>

                <div className="flex justify-end gap-1.5 mt-6 pt-4 border-t border-slate-100 dark:border-violet-500/5">
                  {season.is_default !== 1 && (
                    <button
                      onClick={() => handleSetDefaultSeason(season)}
                      title="Set as Default active season"
                      className="p-2.5 text-slate-400 hover:text-[#7C3AED] bg-slate-50 dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 hover:border-[#7C3AED]/20 rounded-xl transition-all cursor-pointer"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleLockSeason(season)}
                    title={season.is_locked === 1 ? "Unlock season" : "Lock season"}
                    className="p-2.5 text-slate-400 hover:text-amber-500 bg-slate-50 dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 hover:border-amber-500/20 rounded-xl transition-all cursor-pointer"
                  >
                    {season.is_locked === 1 ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => {
                      setEditingSeason(season);
                      setSeasonFormData({
                        name: season.name,
                        start_date: season.start_date,
                        end_date: season.end_date,
                        type: season.type,
                        description: season.description || '',
                        status: season.status,
                        is_default: season.is_default === 1,
                        is_locked: season.is_locked === 1
                      });
                      setIsSeasonModalOpen(true);
                    }}
                    title="Edit settings"
                    className="p-2.5 text-slate-400 hover:text-[#7C3AED] bg-slate-50 dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 hover:border-slate-300 dark:hover:border-violet-500/30 rounded-xl transition-all cursor-pointer"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  {season.is_default !== 1 && (
                    <button
                      onClick={() => handleDeleteSeason(season.id)}
                      title="Delete season"
                      className="p-2.5 text-slate-400 hover:text-rose-500 bg-slate-50 dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 hover:border-rose-500/20 rounded-xl transition-all cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'features' && (
          <div className="space-y-8">
            {/* General Institution Configurations */}
            <div className="bg-white dark:bg-[#1A0F35]/20 border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-[24px] p-6 space-y-6">
              <h3 className="text-sm font-black text-[#1E1B4B] dark:text-white uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#7C3AED]" /> General Configurations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* College active status */}
                <div className="flex items-center justify-between bg-slate-50 dark:bg-[#110A24]/30 px-5 py-4 rounded-2xl border border-slate-100 dark:border-violet-500/10">
                  <div>
                    <span className="text-[11px] font-black text-[#1E1B4B] dark:text-indigo-100 uppercase tracking-widest block">Institution Enable Status</span>
                    <span className="text-[9px] text-slate-400 dark:text-indigo-200/40 font-bold block mt-0.5">Toggle overall system login and API access</span>
                  </div>
                  <button 
                    onClick={() => handleUpdateCollegeSetting('is_enabled', college.is_enabled == 1 ? 0 : 1)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border",
                      college.is_enabled == 1
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                    )}
                  >
                    {college.is_enabled == 1 ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                {/* Auto Accept Tasks */}
                <div className="flex items-center justify-between bg-slate-50 dark:bg-[#110A24]/30 px-5 py-4 rounded-2xl border border-slate-100 dark:border-violet-500/10">
                  <div>
                    <span className="text-[11px] font-black text-[#1E1B4B] dark:text-indigo-100 uppercase tracking-widest block">Auto-Accept Tasks</span>
                    <span className="text-[9px] text-slate-400 dark:text-indigo-200/40 font-bold block mt-0.5">Assigned tasks are auto-accepted (skips workflow)</span>
                  </div>
                  <button 
                    onClick={() => handleUpdateCollegeSetting('auto_accept_tasks', college.auto_accept_tasks == 1 ? 0 : 1)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border",
                      college.auto_accept_tasks == 1
                        ? "bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/20"
                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}
                  >
                    {college.auto_accept_tasks == 1 ? 'ON (Auto-Accept)' : 'OFF (Workflow)'}
                  </button>
                </div>

                {/* Allow Task Decline */}
                <div className="flex items-center justify-between bg-slate-50 dark:bg-[#110A24]/30 px-5 py-4 rounded-2xl border border-slate-100 dark:border-violet-500/10">
                  <div>
                    <span className="text-[11px] font-black text-[#1E1B4B] dark:text-indigo-100 uppercase tracking-widest block">Allow Task Decline</span>
                    <span className="text-[9px] text-slate-400 dark:text-indigo-200/40 font-bold block mt-0.5">Faculty users can decline assigned tasks</span>
                  </div>
                  <button 
                    onClick={() => handleUpdateCollegeSetting('allow_task_decline', college.allow_task_decline == 1 ? 0 : 1)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border",
                      college.allow_task_decline == 1
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                    )}
                  >
                    {college.allow_task_decline == 1 ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
            </div>

            {/* Feature Flags Module */}
            <div className="bg-white dark:bg-[#1A0F35]/20 border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-[24px] p-6 space-y-6">
              <div>
                <h3 className="text-sm font-black text-[#1E1B4B] dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#7C3AED]" /> Feature Flags Manager
                </h3>
                <p className="text-xs text-slate-400 dark:text-violet-300/60 mt-1 font-bold">Configure active modules and visibility settings across dashboards.</p>
              </div>

              <div className="space-y-8">
                {FEATURE_METADATA.map((group) => (
                  <div key={group.category} className="space-y-4">
                    <h4 className="text-[10px] font-black text-[#7C3AED] dark:text-violet-400 uppercase tracking-widest border-b border-slate-100 dark:border-violet-500/10 pb-2">{group.category}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {group.features.map((feature) => {
                        const isEnabled = featureFlags[feature.key] !== false; // Default true
                        return (
                          <div 
                            key={feature.key}
                            onClick={() => handleToggleFeature(feature.key, !isEnabled)}
                            className={cn(
                              "flex items-start gap-4 bg-slate-50 dark:bg-[#1A0F35]/30 px-5 py-4 rounded-2xl border cursor-pointer hover:bg-slate-100/50 dark:hover:bg-[#1A0F35]/50 transition-all select-none",
                              isEnabled ? "border-transparent" : "border-slate-200 dark:border-violet-500/10 opacity-60"
                            )}
                          >
                            <div className={cn(
                              "w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 mt-0.5",
                              isEnabled 
                                ? "bg-[#7C3AED] border-[#7C3AED] text-white" 
                                : "border-slate-300 dark:border-violet-500/40 text-transparent"
                            )}>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                            <div>
                              <span className="text-[10px] font-black text-[#1E1B4B] dark:text-indigo-100 uppercase tracking-widest block">{feature.label}</span>
                              <span className="text-[9px] text-slate-400 dark:text-indigo-200/40 font-bold leading-tight block mt-0.5">{feature.desc}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'broadcast' && (
          <div className="max-w-2xl bg-white dark:bg-[#1A0F35]/20 border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-[24px] p-6 space-y-6">
            <div>
              <h3 className="text-sm font-black text-[#1E1B4B] dark:text-white uppercase tracking-widest flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#7C3AED]" /> Send Popup Notifications
              </h3>
              <p className="text-xs text-slate-400 dark:text-violet-300/60 mt-1 font-bold">Transmit high-priority popup alert dialogues to users in this college.</p>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Target Audience</label>
                <div className="flex bg-slate-100 dark:bg-[#1A0F35] p-1 rounded-xl border border-slate-200/50 dark:border-violet-500/20 w-max">
                  {([
                    { id: 'both', label: 'All Staff' },
                    { id: 'hod', label: 'HODs Only' },
                    { id: 'faculty', label: 'Faculty Only' }
                  ] as const).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setBroadcastData(prev => ({ ...prev, target: opt.id }))}
                      className={cn(
                        "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                        broadcastData.target === opt.id
                          ? "bg-[#7C3AED] dark:bg-violet-600 text-white shadow-md shadow-[#7C3AED]/25"
                          : "text-slate-400 hover:text-slate-600 dark:hover:text-violet-300"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Alert Title</label>
                <input
                  type="text"
                  placeholder="e.g. Critical System Maintenance Alert"
                  value={broadcastData.title}
                  onChange={(e) => setBroadcastData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-5 py-3 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Message Body</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Type the popup alert message details here..."
                  value={broadcastData.message}
                  onChange={(e) => setBroadcastData(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isBroadcasting || !broadcastData.message}
                className="w-full py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 mt-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBroadcasting ? 'Broadcasting Alert...' : 'Transmit Alert Dialogue'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white dark:bg-[#1A0F35]/20 backdrop-blur-md border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-[24px] p-6 flex flex-col md:flex-row gap-6 items-end relative z-30">
              <div className="flex-1 w-full">
                <CustomSelect
                  label="Filter Department"
                  value={selectedLeaderboardDept}
                  onChange={(val) => setSelectedLeaderboardDept(val.toString())}
                  options={[
                    { value: '', label: 'All Departments (Top 20)' },
                    ...leaderboardDepts.map(d => ({ value: d.id, label: d.name + (d.code ? ` (${d.code})` : '') }))
                  ]}
                  placeholder="Select Department"
                  icon={Users}
                />
              </div>
              <div className="flex-1 w-full">
                <CustomSelect
                  label="Academic Season"
                  value={selectedLeaderboardSeason}
                  onChange={(val) => setSelectedLeaderboardSeason(val.toString())}
                  options={leaderboardSeasons.map(s => ({
                    value: s.id,
                    label: s.name + (s.is_default === 1 ? ' (Default)' : '')
                  }))}
                  placeholder="Select Academic Season"
                  icon={Calendar}
                />
              </div>
            </div>

            {/* Table or Loading / Empty States */}
            {isLeaderboardLoading ? (
              <div className="flex flex-col justify-center items-center py-20 gap-4">
                <div className="w-10 h-10 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase text-slate-400 dark:text-violet-400 tracking-widest">Compiling standings...</p>
              </div>
            ) : leaderboardData.length === 0 ? (
              <div className="py-16 bg-white dark:bg-[#1A0F35]/20 rounded-[2.5rem] border border-dashed border-slate-100 dark:border-violet-500/15 text-center">
                <Trophy className="w-12 h-12 text-slate-300 dark:text-violet-500/30 mx-auto mb-3" />
                <p className="text-slate-400 dark:text-violet-400/50 font-bold uppercase text-[10px] tracking-widest">No scores recorded yet</p>
                <p className="text-xs text-slate-300 dark:text-violet-500/20 mt-1">Faculties must earn points by completing approved tasks in this season.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#1A0F35]/20 backdrop-blur-md border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-[24px] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#7C3AED]/10 dark:border-violet-500/10 bg-slate-50/50 dark:bg-[#110A24]/40">
                        <th className="px-6 py-4 text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest">Rank</th>
                        <th className="px-6 py-4 text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest">Faculty Member</th>
                        <th className="px-6 py-4 text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest">Department</th>
                        <th className="px-6 py-4 text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest text-center">Tasks Completed</th>
                        <th className="px-6 py-4 text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest text-center">Bonus Points</th>
                        <th className="px-6 py-4 text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest text-right">Total Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#7C3AED]/5 dark:divide-violet-500/5">
                      {leaderboardData.map((row, index) => {
                        const rank = index + 1;
                        let rankBadge = null;
                        let rowBg = "";

                        if (rank === 1) {
                          rankBadge = <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs shadow-md shadow-amber-500/20"><Trophy className="w-3.5 h-3.5" /></span>;
                          rowBg = "bg-amber-500/[0.03] dark:bg-amber-500/[0.01]";
                        } else if (rank === 2) {
                          rankBadge = <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-400 text-white font-black text-xs shadow-md shadow-slate-400/20"><Award className="w-3.5 h-3.5" /></span>;
                          rowBg = "bg-slate-400/[0.03] dark:bg-slate-400/[0.01]";
                        } else if (rank === 3) {
                          rankBadge = <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs shadow-md shadow-amber-700/20"><Award className="w-3.5 h-3.5" /></span>;
                          rowBg = "bg-amber-700/[0.03] dark:bg-amber-700/[0.01]";
                        } else {
                          rankBadge = <span className="text-slate-400 dark:text-violet-400/60 font-black text-sm pl-2">{rank}</span>;
                        }

                        return (
                          <tr key={row.id} className={cn("hover:bg-[#7C3AED]/5 dark:hover:bg-violet-950/20 transition-colors", rowBg)}>
                            <td className="px-6 py-4 whitespace-nowrap align-middle">
                              {rankBadge}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap align-middle">
                              <div className="flex items-center gap-3">
                                <Link to={`/admin/profile/${row.id}`} className="block shrink-0 hover:scale-105 transition-all">
                                  {row.profile_pic ? (
                                    <img
                                      src={getImageUrl(row.profile_pic)}
                                      alt={row.name}
                                      className="w-10 h-10 rounded-xl object-cover border border-[#7C3AED]/10 dark:border-violet-500/25"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(row.name)}`;
                                      }}
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/10 dark:bg-violet-950/40 flex items-center justify-center border border-[#7C3AED]/5 dark:border-violet-500/10">
                                      <User className="w-5 h-5 text-[#7C3AED] dark:text-violet-400" />
                                    </div>
                                  )}
                                </Link>
                                <div>
                                  <Link to={`/admin/profile/${row.id}`} className="text-sm font-bold text-gray-900 dark:text-indigo-100 block leading-tight hover:text-[#7C3AED] transition-colors">
                                    {row.name}
                                  </Link>
                                  <span className="text-[10px] text-slate-400 dark:text-violet-400/50 block mt-0.5">{row.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap align-middle">
                              <span className="text-xs font-black text-[#7C3AED] dark:text-violet-400 uppercase tracking-wider">
                                {row.department_name || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap align-middle text-center font-bold text-sm text-gray-900 dark:text-indigo-200">
                              {row.tasks_completed}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap align-middle text-center font-bold text-sm text-amber-500 dark:text-amber-400">
                              +{row.bonus_points}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap align-middle text-right">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#7C3AED]/5 dark:bg-violet-500/10 text-[#7C3AED] dark:text-violet-300 rounded-lg text-sm font-black border border-[#7C3AED]/10 dark:border-violet-500/20">
                                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                                {row.total_points}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dept Modal */}
      <AnimatePresence>
        {isDeptModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDeptModalOpen(false)} className="absolute inset-0 bg-[#1E1B4B]/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-[2.5rem] w-full max-w-xl p-6 sm:p-8 md:p-10 shadow-2xl z-10 max-h-[90vh] flex flex-col overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-[#7C3AED] rounded-t-[2.5rem]" />
              
              <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div className="text-left">
                  <h2 className="text-xl sm:text-2xl font-black text-[#1E1B4B] dark:text-indigo-100">{editingDept ? 'Edit Department details' : 'Create Department'}</h2>
                  <p className="text-xs font-bold text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest mt-1">Institutional Structuring Protocol</p>
                </div>
                <button onClick={() => setIsDeptModalOpen(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-violet-950/40 rounded-2xl transition-colors cursor-pointer"><X className="w-6 h-6 text-[#1E1B4B]/40 dark:text-violet-400" /></button>
              </div>
              <form onSubmit={handleDeptSubmit} className="flex flex-col flex-1 overflow-hidden space-y-6">
                <div className="space-y-6 overflow-y-auto flex-1 pr-1.5 py-1 -mr-2 scrollbar-thin pb-32">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Department Name</label>
                      <input 
                        type="text" 
                        required 
                        value={deptFormData.name} 
                        onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })} 
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100" 
                        placeholder="e.g. Computer Science Engineering" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Department Code</label>
                      <input 
                        type="text" 
                        value={deptFormData.code} 
                        onChange={(e) => setDeptFormData({ ...deptFormData, code: e.target.value })} 
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100" 
                        placeholder="e.g. CSE" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Description</label>
                    <textarea 
                      value={deptFormData.description} 
                      onChange={(e) => setDeptFormData({ ...deptFormData, description: e.target.value })} 
                      rows={3} 
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100 resize-none" 
                      placeholder="Provide brief details about the department..." 
                    />
                  </div>
                  <CustomSelect
                    label="Assign Head of Department"
                    value={deptFormData.hod_id}
                    onChange={(val) => setDeptFormData({ ...deptFormData, hod_id: val.toString() })}
                    options={[
                      { value: '', label: 'Unassigned (No HOD)' },
                      ...hods.map(h => ({ value: h.id, label: h.name }))
                    ]}
                    icon={User}
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-slate-100 dark:border-violet-500/10 flex-shrink-0 mt-auto">
                  <button type="submit" className="flex-1 py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl font-black shadow-xl shadow-purple-500/20 transition-all uppercase tracking-widest text-xs cursor-pointer">{editingDept ? 'Update Department' : 'Construct Department'}</button>
                  <button type="button" onClick={() => setIsDeptModalOpen(false)} className="px-8 py-4 bg-slate-100 dark:bg-violet-950/60 hover:bg-slate-200 dark:hover:bg-violet-900/60 text-[#1E1B4B] dark:text-indigo-200 rounded-2xl font-black transition-all uppercase tracking-widest text-xs cursor-pointer">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Season Modal */}
      <AnimatePresence>
        {isSeasonModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSeasonModalOpen(false)} className="absolute inset-0 bg-[#1E1B4B]/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-[2rem] sm:rounded-[2.5rem] w-[95%] max-w-xl p-5 sm:p-7 md:p-8 shadow-2xl z-10 max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 sm:h-2 bg-[#7C3AED] rounded-t-[2rem] sm:rounded-t-[2.5rem]" />
              
              <div className="flex justify-between items-center mb-4 sm:mb-6 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#7C3AED]/10 dark:bg-violet-500/20 text-[#7C3AED] dark:text-violet-400 rounded-xl">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-2xl font-black text-[#1E1B4B] dark:text-indigo-100">{editingSeason ? 'Edit Season Protocol' : 'Initialize Season'}</h2>
                    <p className="text-[10px] sm:text-xs font-bold text-[#4C1D95]/60 dark:text-violet-400/60 mt-0.5">Configure term cycles and session parameters.</p>
                  </div>
                </div>
                <button onClick={() => setIsSeasonModalOpen(false)} className="p-2 sm:p-3 hover:bg-slate-100 dark:hover:bg-violet-950/40 rounded-xl transition-colors cursor-pointer">
                  <X className="w-5 h-5 sm:w-6 sm:h-6 text-[#1E1B4B]/40 dark:text-violet-400" />
                </button>
              </div>

              <form onSubmit={handleSeasonSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="space-y-4 sm:space-y-5 overflow-y-auto flex-1 pr-3 py-1 -mr-2 max-h-[60vh] sm:max-h-[65vh]">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Season Name</label>
                    <input
                      type="text" required placeholder="e.g. Odd Semester 2026"
                      value={seasonFormData.name}
                      onChange={(e) => setSeasonFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-5 py-3 sm:py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 transition-all text-sm font-bold text-[#1E1B4B] dark:text-indigo-100"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Start Date</label>
                      <DateTimePicker
                        value={seasonFormData.start_date}
                        onChange={(val) => setSeasonFormData(prev => ({ ...prev, start_date: val }))}
                        required dateOnly onOpenChange={setIsDatePickerOpen}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">End Date</label>
                      <DateTimePicker
                        value={seasonFormData.end_date}
                        onChange={(val) => setSeasonFormData(prev => ({ ...prev, end_date: val }))}
                        required dateOnly align="right" onOpenChange={setIsDatePickerOpen}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Cycle Type</label>
                      <select
                        value={seasonFormData.type}
                        onChange={(e) => setSeasonFormData(prev => ({ ...prev, type: e.target.value as any }))}
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none text-sm font-bold text-[#1E1B4B] dark:text-indigo-100 cursor-pointer"
                      >
                        <option value="Semester">Semester</option>
                        <option value="Academic Year">Academic Year</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Status</label>
                      <select
                        value={seasonFormData.status}
                        onChange={(e) => setSeasonFormData(prev => ({ ...prev, status: e.target.value as any }))}
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none text-sm font-bold text-[#1E1B4B] dark:text-indigo-100 cursor-pointer"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest ml-1">Description (Optional)</label>
                    <textarea
                      rows={2} placeholder="Enter description..."
                      value={seasonFormData.description}
                      onChange={(e) => setSeasonFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-5 py-3 sm:py-3.5 bg-slate-50 dark:bg-[#1A0F35]/30 border border-slate-200 dark:border-violet-500/20 rounded-2xl outline-none text-sm font-bold text-[#1E1B4B] dark:text-indigo-100 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div 
                      onClick={() => setSeasonFormData(prev => ({ ...prev, is_default: !prev.is_default }))}
                      className="flex items-center gap-4 bg-slate-50 dark:bg-[#1A0F35]/30 px-5 py-3 rounded-2xl border border-slate-200 dark:border-violet-500/20 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-[#1A0F35]/50 transition-all select-none"
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0",
                        seasonFormData.is_default ? "bg-[#7C3AED] border-[#7C3AED] text-white" : "border-slate-300 dark:border-violet-500/40 text-transparent"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest block">Set as Default</span>
                      </div>
                    </div>

                    <div 
                      onClick={() => setSeasonFormData(prev => ({ ...prev, is_locked: !prev.is_locked }))}
                      className="flex items-center gap-4 bg-slate-50 dark:bg-[#1A0F35]/30 px-5 py-3 rounded-2xl border border-slate-200 dark:border-violet-500/20 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-[#1A0F35]/50 transition-all select-none"
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0",
                        seasonFormData.is_locked ? "bg-[#7C3AED] border-[#7C3AED] text-white" : "border-slate-300 dark:border-violet-500/40 text-transparent"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest block">Lock Season</span>
                      </div>
                    </div>
                  </div>

                  <div className={cn("transition-all duration-300", isDatePickerOpen ? "h-[320px]" : "h-0")} />
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 sm:pt-5 border-t border-slate-100 dark:border-violet-500/10 flex-shrink-0 mt-4 sm:mt-5">
                  <button type="submit" className="flex-1 py-3 sm:py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl font-black shadow-xl shadow-purple-500/20 transition-all uppercase tracking-widest text-xs cursor-pointer">
                    {editingSeason ? 'Update Season' : 'Initialize Season'}
                  </button>
                  <button type="button" onClick={() => setIsSeasonModalOpen(false)} className="px-8 py-3 sm:py-4 bg-slate-100 dark:bg-violet-950/60 hover:bg-slate-200 dark:hover:bg-violet-900/60 text-[#1E1B4B] dark:text-indigo-200 rounded-2xl font-black transition-all uppercase tracking-widest text-xs cursor-pointer">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CollegeDetails;
