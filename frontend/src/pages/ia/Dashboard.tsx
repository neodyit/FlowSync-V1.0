import React from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, Building2, Users, CheckSquare, Bell, FileText } from 'lucide-react';

const stats = [
  { name: 'Total Departments', value: '0', icon: Building2, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20' },
  { name: 'Total HODs', value: '0', icon: Users, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' },
  { name: 'Total Faculty', value: '0', icon: Users, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/20' },
  { name: 'Active Tasks', value: '0', icon: CheckSquare, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' },
];

export default function IADashboard() {
  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-black text-[#1E1B4B] dark:text-indigo-50 tracking-tight">Institution Dashboard</h1>
        <p className="text-sm text-[#4C1D95]/60 dark:text-indigo-200/60 mt-1">
          Complete administration oversight of your institution.
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-6 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-2xl shadow-sm flex items-center gap-5"
            >
              <div className={`p-4 rounded-xl ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#4C1D95]/50 dark:text-indigo-200/50 uppercase tracking-wider">{stat.name}</p>
                <h3 className="text-2xl font-black text-[#1E1B4B] dark:text-indigo-50 mt-0.5">{stat.value}</h3>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Activity/Tasks */}
        <div className="lg:col-span-2 space-y-8">
          <div className="p-8 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-3xl shadow-sm">
            <h3 className="text-lg font-black text-[#1E1B4B] dark:text-indigo-50 mb-4">Task Overview</h3>
            <div className="flex flex-col items-center justify-center py-12 text-[#4C1D95]/30 dark:text-indigo-200/30">
              <CheckSquare className="w-12 h-12 stroke-[1.5]" />
              <p className="text-sm font-bold mt-4">No tasks found. Create tasks to assign to HODs or departments.</p>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Actions & Notices */}
        <div className="space-y-8">
          <div className="p-8 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-3xl shadow-sm">
            <h3 className="text-lg font-black text-[#1E1B4B] dark:text-indigo-50 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full py-3.5 px-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-[#7C3AED]/20 transition-all">
                Publish Notice
              </button>
              <button className="w-full py-3.5 px-4 bg-white dark:bg-[#181131] border border-[#7C3AED]/20 dark:border-violet-500/30 text-[#7C3AED] dark:text-violet-400 text-xs font-black uppercase tracking-wider rounded-2xl hover:bg-[#7C3AED]/5 dark:hover:bg-violet-950/20 transition-all">
                Create Department
              </button>
            </div>
          </div>

          <div className="p-8 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-3xl shadow-sm">
            <h3 className="text-lg font-black text-[#1E1B4B] dark:text-indigo-50 mb-4">Recent Announcements</h3>
            <div className="flex flex-col items-center justify-center py-8 text-[#4C1D95]/30 dark:text-indigo-200/30">
              <Bell className="w-8 h-8 stroke-[1.5]" />
              <p className="text-xs font-bold mt-3">No announcements published yet.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
