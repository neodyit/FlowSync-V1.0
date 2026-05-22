import React, { useEffect, useState } from 'react';
import { Activity, Clock, Users, MousePointerClick } from 'lucide-react';

interface StatsData {
    total_users_tracked: number;
    total_active_time_seconds: number;
    top_pages: { page_url: string; total_time: number; total_interactions: number }[];
    daily_activity: { date: string; total_time: number; active_users: number }[];
}

export default function EngagementTracker() {
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/engagement_stats.php`, {
                    credentials: 'include'
                });
                const data = await response.json();
                
                if (data.status === 'success') {
                    setStats(data.data);
                } else {
                    setError(data.message || 'Failed to load stats');
                }
            } catch (err) {
                setError('Failed to fetch engagement stats');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg bg-red-50 p-4 text-red-800">
                {error}
            </div>
        );
    }

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Engagement Tracker</h1>
                <p className="text-gray-500">Monitor background user activity and platform engagement</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-500">Users Tracked</h3>
                        <Users className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="mt-2 text-2xl font-bold">{stats?.total_users_tracked || 0}</div>
                </div>

                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-500">Total Active Time</h3>
                        <Clock className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="mt-2 text-2xl font-bold">{formatTime(stats?.total_active_time_seconds || 0)}</div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Top Engaging Pages</h2>
                        <Activity className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="space-y-4">
                        {stats?.top_pages.map((page, i) => (
                            <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                <div className="max-w-[200px] truncate sm:max-w-[300px]">
                                    <span className="font-medium text-gray-900">{page.page_url}</span>
                                </div>
                                <div className="text-right text-sm">
                                    <div className="font-semibold text-primary">{formatTime(page.total_time)}</div>
                                    <div className="text-gray-500">{page.total_interactions} interactions</div>
                                </div>
                            </div>
                        ))}
                        {(!stats?.top_pages || stats.top_pages.length === 0) && (
                            <div className="text-center text-gray-500">No page data yet</div>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Daily Activity Trend</h2>
                        <MousePointerClick className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="space-y-4">
                        {stats?.daily_activity.map((day, i) => (
                            <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                <div className="font-medium text-gray-900">{day.date}</div>
                                <div className="text-right text-sm">
                                    <div className="font-semibold text-primary">{day.active_users} active users</div>
                                    <div className="text-gray-500">{formatTime(day.total_time)} total</div>
                                </div>
                            </div>
                        ))}
                        {(!stats?.daily_activity || stats.daily_activity.length === 0) && (
                            <div className="text-center text-gray-500">No daily data yet</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
