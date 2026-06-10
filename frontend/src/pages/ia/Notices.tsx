import React from 'react';
import { Bell, Plus } from 'lucide-react';

export default function IANotices() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#1E1B4B] dark:text-indigo-50 tracking-tight">Notices & Announcements</h1>
          <p className="text-sm text-[#4C1D95]/60 dark:text-indigo-200/60 mt-1">
            Broadcast important updates to your entire institution or specific roles.
          </p>
        </div>
        <button className="flex items-center gap-2 px-5 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-[#7C3AED]/20 transition-all cursor-pointer">
          <Plus className="w-4 h-4" />
          Publish Notice
        </button>
      </div>

      <div className="p-8 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-3xl shadow-sm">
        <div className="flex flex-col items-center justify-center py-16 text-[#4C1D95]/30 dark:text-indigo-200/30">
          <Bell className="w-16 h-16 stroke-[1.5]" />
          <p className="text-sm font-bold mt-4">No notices found. Publish announcements to reach your institution.</p>
        </div>
      </div>
    </div>
  );
}
