import React, { useEffect, useState } from 'react';
import { 
    Activity, 
    Clock, 
    Users, 
    MousePointerClick, 
    Building2, 
    Briefcase, 
    UserCheck, 
    Shield, 
    TrendingUp, 
    RefreshCcw, 
    Search,
    Globe,
    Layers,
    SlidersHorizontal,
    Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import SEO from '@/components/SEO';

interface TopPageData {
    page_url: string;
    total_time: number;
    total_interactions: number;
}

interface DailyActivityData {
    date: string;
    total_time: number;
    active_users: number;
}

interface StatsData {
    total_users_tracked: number;
    total_active_time_seconds: number;
    total_interactions: number;
    top_pages: TopPageData[];
    daily_activity: DailyActivityData[];
}

export default function EngagementTracker() {
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Auxiliary datasets for dropdown filters
    const [colleges, setColleges] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);

    // Dropdown filters states
    const [filterCollege, setFilterCollege] = useState('all');
    const [filterDept, setFilterDept] = useState('all');
    const [filterRole, setFilterRole] = useState('all');
    const [filterUser, setFilterUser] = useState('all');

    // Fetch filters datasets on mount
    useEffect(() => {
        const fetchFiltersData = async () => {
            try {
                const [collegesRes, deptsRes, usersRes] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_URL}/admin/colleges.php`, { credentials: 'include' }),
                    fetch(`${import.meta.env.VITE_API_URL}/admin/departments.php`, { credentials: 'include' }),
                    fetch(`${import.meta.env.VITE_API_URL}/admin/users.php`, { credentials: 'include' })
                ]);
                
                const collegesData = await collegesRes.json();
                const deptsData = await deptsRes.json();
                const usersData = await usersRes.json();
                
                if (collegesData.status === 'success') setColleges(collegesData.data);
                if (deptsData.status === 'success') setDepartments(deptsData.data);
                if (usersData.status === 'success') setUsers(usersData.data);
            } catch (err) {
                console.error('Failed to load telemetry filter dimensions', err);
            }
        };

        fetchFiltersData();
    }, []);

    // Cascade: Dynamically filter selectable Departments based on College
    const filteredDepartments = filterCollege === 'all'
        ? departments
        : departments.filter(d => String(d.college_id) === filterCollege);

    // Cascade: Dynamically filter selectable Users based on College, Dept, and Role
    const filteredUsers = users.filter(u => {
        const matchesCollege = filterCollege === 'all' || String(u.college_id) === filterCollege;
        const matchesDept = filterDept === 'all' || String(u.department_id) === filterDept;
        const matchesRole = filterRole === 'all' || String(u.role_id) === filterRole;
        return matchesCollege && matchesDept && matchesRole;
    });

    // Reset downstream selectors if their values are no longer present in cascades
    useEffect(() => {
        if (filterCollege !== 'all') {
            const isDeptValid = filteredDepartments.some(d => String(d.id) === filterDept);
            if (!isDeptValid && filterDept !== 'all') {
                setFilterDept('all');
            }
        }
    }, [filterCollege, filteredDepartments, filterDept]);

    useEffect(() => {
        const isUserValid = filteredUsers.some(u => String(u.id) === filterUser);
        if (!isUserValid && filterUser !== 'all') {
            setFilterUser('all');
        }
    }, [filterCollege, filterDept, filterRole, filteredUsers, filterUser]);

    // Fetch stats telemetry when filters change
    const fetchStats = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterCollege !== 'all') params.append('college_id', filterCollege);
            if (filterDept !== 'all') params.append('department_id', filterDept);
            if (filterRole !== 'all') params.append('role_id', filterRole);
            if (filterUser !== 'all') params.append('filter_user_id', filterUser);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/engagement_stats.php?${params.toString()}`, {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.status === 'success') {
                setStats(data.data);
                setError('');
            } else {
                setError(data.message || 'Failed to load telemetry stats');
            }
        } catch (err) {
            setError('Failed to fetch engagement stats from backend');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [filterCollege, filterDept, filterRole, filterUser]);

    const handleResetFilters = () => {
        setFilterCollege('all');
        setFilterDept('all');
        setFilterRole('all');
        setFilterUser('all');
    };

    const formatTime = (seconds: number) => {
        if (!seconds || seconds <= 0) return '0m';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const formatTimeDetailed = (seconds: number) => {
        if (!seconds || seconds <= 0) return '0s';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };

    const formatTrendDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const avgDuration = stats && stats.total_users_tracked > 0
        ? Math.round(stats.total_active_time_seconds / stats.total_users_tracked)
        : 0;

    const maxPageTime = stats?.top_pages ? Math.max(...stats.top_pages.map(p => p.total_time), 1) : 1;
    const maxDailyTime = stats?.daily_activity ? Math.max(...stats.daily_activity.map(d => d.total_time), 1) : 1;

    const hasFiltersActive = filterCollege !== 'all' || filterDept !== 'all' || filterRole !== 'all' || filterUser !== 'all';

    if (stats === null && loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-xs font-black text-[#1E1B4B] uppercase tracking-widest animate-pulse">Initializing Telemetry Engine...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <SEO title="System Telemetry" description="Glassmorphic real-time telemetry console monitoring administrative engagement levels." />
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-[#1E1B4B] tracking-tight flex items-center gap-3">
                        <Activity className="w-10 h-10 text-[#7C3AED] animate-pulse" />
                        Engagement Telemetry
                    </h1>
                    <p className="text-[#4C1D95]/60 mt-1 font-medium">Real-time background console monitoring administrative session active metrics.</p>
                </div>
                <button 
                    onClick={fetchStats}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-white border border-[#7C3AED]/10 rounded-2xl text-sm font-bold text-[#7C3AED] hover:bg-[#7C3AED]/5 transition-all active:scale-95 shadow-sm disabled:opacity-50"
                >
                    <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
                    Sync Feed
                </button>
            </div>

            {/* Filter control panel (Glassmorphic dashboard style) */}
            <div className="bg-white/80 backdrop-blur-xl border border-slate-100 p-6 rounded-[2.5rem] shadow-sm space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                        <h2 className="text-xs font-black text-[#1E1B4B] uppercase tracking-widest">Advanced Telemetry Filters</h2>
                    </div>
                    {hasFiltersActive && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={handleResetFilters}
                            className="text-[10px] font-black text-[#7C3AED] hover:text-[#4C1D95] uppercase tracking-widest bg-[#7C3AED]/5 px-3 py-1.5 rounded-xl hover:bg-[#7C3AED]/10 transition-all"
                        >
                            Reset Filters
                        </motion.button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* College Filter */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                            Affiliated College
                        </label>
                        <select
                            value={filterCollege}
                            onChange={(e) => setFilterCollege(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer appearance-none shadow-sm"
                        >
                            <option value="all">All Colleges</option>
                            {colleges.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.short_name ? `[${c.short_name}] ${c.name}` : c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Department Filter */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                            Department
                        </label>
                        <select
                            value={filterDept}
                            onChange={(e) => setFilterDept(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer appearance-none shadow-sm disabled:opacity-50"
                        >
                            <option value="all">All Departments</option>
                            {filteredDepartments.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* User Type (Role) Filter */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-indigo-500" />
                            User Type
                        </label>
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer appearance-none shadow-sm"
                        >
                            <option value="all">All Operator Roles</option>
                            <option value="1">Administrator</option>
                            <option value="2">Head of Dept (HOD)</option>
                            <option value="3">Faculty</option>
                        </select>
                    </div>

                    {/* Particular User Filter */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                            Particular User
                        </label>
                        <select
                            value={filterUser}
                            onChange={(e) => setFilterUser(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer appearance-none shadow-sm"
                        >
                            <option value="all">All Individual Operators ({filteredUsers.length})</option>
                            {filteredUsers.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.name} ({u.role_name})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-800 flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                    {error}
                </div>
            )}

            {/* Stat Cards Grid */}
            <div className="relative">
                {/* Secondary subtle pulsing overlay when data fetches in background */}
                {loading && stats !== null && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] rounded-[2.5rem] z-10 pointer-events-none transition-all flex items-center justify-center animate-pulse" />
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Tracked Users KPI Card */}
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:-translate-y-0.5 transition-all duration-300"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-[5rem] transition-all duration-500 group-hover:scale-110 opacity-50 bg-indigo-50/50" />
                        <Users className="w-8 h-8 mb-6 relative z-10 text-indigo-500" />
                        <div className="relative z-10">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Users Tracked</h4>
                            <p className="text-4xl font-black text-[#1E1B4B]">{stats?.total_users_tracked || 0}</p>
                            <p className="text-[11px] font-bold text-slate-400 mt-2">Active telemetry streams</p>
                        </div>
                    </motion.div>

                    {/* Total Operational Time KPI Card */}
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: 0.05 }}
                        className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:-translate-y-0.5 transition-all duration-300"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-[5rem] transition-all duration-500 group-hover:scale-110 opacity-50 bg-purple-50/50" />
                        <Clock className="w-8 h-8 mb-6 relative z-10 text-purple-500" />
                        <div className="relative z-10">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Active Time</h4>
                            <p className="text-4xl font-black text-[#1E1B4B]">{formatTime(stats?.total_active_time_seconds || 0)}</p>
                            <p className="text-[11px] font-bold text-slate-400 mt-2">Aggregated platform use</p>
                        </div>
                    </motion.div>

                    {/* Avg Active Time KPI Card */}
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: 0.1 }}
                        className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:-translate-y-0.5 transition-all duration-300"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-[5rem] transition-all duration-500 group-hover:scale-110 opacity-50 bg-fuchsia-50/50" />
                        <TrendingUp className="w-8 h-8 mb-6 relative z-10 text-fuchsia-500" />
                        <div className="relative z-10">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Session Duration</h4>
                            <p className="text-4xl font-black text-[#1E1B4B]">{formatTimeDetailed(avgDuration)}</p>
                            <p className="text-[11px] font-bold text-slate-400 mt-2">Telemetry rate per active user</p>
                        </div>
                    </motion.div>

                    {/* Total Interactions KPI Card */}
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: 0.15 }}
                        className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:-translate-y-0.5 transition-all duration-300"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-[5rem] transition-all duration-500 group-hover:scale-110 opacity-50 bg-emerald-50/50" />
                        <MousePointerClick className="w-8 h-8 mb-6 relative z-10 text-emerald-500" />
                        <div className="relative z-10">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Interactions</h4>
                            <p className="text-4xl font-black text-[#1E1B4B]">{stats?.total_interactions || 0}</p>
                            <p className="text-[11px] font-bold text-slate-400 mt-2">Hits, scrolls & background telemetry</p>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Visual Telemetry Breakdown (Graphs and Lists) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Left Panel: Top Pages Telemetry list */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-[#1E1B4B] flex items-center gap-3">
                            <Compass className="w-6 h-6 text-[#7C3AED]" />
                            Top Page Telemetry
                        </h2>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Sorted by Duration
                        </div>
                    </div>

                    <div className="flex-1 space-y-6 min-h-[300px]">
                        {stats?.top_pages && stats.top_pages.length > 0 ? (
                            stats.top_pages.map((page, i) => {
                                const percentage = Math.round((page.total_time / maxPageTime) * 100);
                                return (
                                    <div key={i} className="group relative space-y-2">
                                        <div className="flex items-center justify-between text-xs font-bold">
                                            <div className="flex items-center gap-2 max-w-[70%]">
                                                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500/80 flex-shrink-0" />
                                                <span className="text-[#1E1B4B] font-semibold truncate hover:text-indigo-600 transition-colors">
                                                    {page.page_url}
                                                </span>
                                            </div>
                                            <div className="text-right flex items-center gap-2">
                                                <span className="text-indigo-600 font-extrabold">{formatTimeDetailed(page.total_time)}</span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">({page.total_interactions} hits)</span>
                                            </div>
                                        </div>
                                        
                                        {/* Premium Glowing Progress Bar */}
                                        <div className="h-2 w-full bg-slate-50 border border-slate-100 rounded-full overflow-hidden relative">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percentage}%` }}
                                                transition={{ duration: 0.8, ease: "easeOut" }}
                                                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 rounded-full"
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center gap-3">
                                <Globe className="w-12 h-12 opacity-30 text-[#7C3AED]" />
                                <div>
                                    <p className="text-sm font-bold text-[#1E1B4B]">No URL Telemetry Found</p>
                                    <p className="text-xs text-slate-400 mt-1">Adjust your cascading filter parameters.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Daily Activity Trend spring vertical bar graph */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-[#1E1B4B] flex items-center gap-3">
                            <Activity className="w-6 h-6 text-[#7C3AED]" />
                            Daily Engagement Trend
                        </h2>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Last 7 Days
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-end min-h-[300px]">
                        {stats?.daily_activity && stats.daily_activity.length > 0 ? (
                            <div className="space-y-4">
                                <div className="flex items-end justify-between h-56 pt-6 px-4">
                                    {stats.daily_activity.map((day, i) => {
                                        const barHeightPct = (day.total_time / maxDailyTime) * 100;
                                        return (
                                            <div key={i} className="group relative flex-1 flex flex-col justify-end items-center h-full mx-1">
                                                {/* Sophisticated Hover Tooltip Card */}
                                                <div className="opacity-0 group-hover:opacity-100 group-hover:-translate-y-2.5 transition-all duration-300 pointer-events-none absolute -top-14 z-20 w-36 bg-slate-900/95 backdrop-blur-md text-white text-[10px] p-2.5 rounded-2xl shadow-xl text-center flex flex-col gap-0.5 border border-white/10">
                                                    <span className="font-extrabold text-[10px] text-slate-200">{formatTrendDate(day.date)}</span>
                                                    <span className="font-black text-[#a78bfa] text-xs mt-0.5">{formatTime(day.total_time)} total</span>
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{day.active_users} active users</span>
                                                </div>

                                                {/* Physics Spring animating vertical graph bar */}
                                                <div className="w-8 relative flex flex-col justify-end h-full">
                                                    <motion.div 
                                                        initial={{ height: 0 }}
                                                        animate={{ height: `${barHeightPct}%` }}
                                                        transition={{ type: "spring", stiffness: 60, damping: 15, delay: i * 0.05 }}
                                                        className="w-full bg-gradient-to-t from-indigo-600 via-purple-500 to-fuchsia-400 group-hover:brightness-110 shadow-indigo-500/10 shadow-lg rounded-t-xl transition-all relative overflow-hidden"
                                                    >
                                                        {/* Subtle glass reflection overlay on bars */}
                                                        <div className="absolute inset-y-0 left-0 w-1 bg-white/20" />
                                                    </motion.div>
                                                </div>

                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-3">
                                                    {formatTrendDate(day.date)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center gap-3">
                                <Layers className="w-12 h-12 opacity-30 text-[#7C3AED]" />
                                <div>
                                    <p className="text-sm font-bold text-[#1E1B4B]">No Active Trend Telemetry</p>
                                    <p className="text-xs text-slate-400 mt-1">Data will accumulate as systems operate.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
