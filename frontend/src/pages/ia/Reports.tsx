import React from 'react';
import { FileText, Download } from 'lucide-react';

export default function IAReports() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#1E1B4B] dark:text-indigo-50 tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-[#4C1D95]/60 dark:text-indigo-200/60 mt-1">
            Generate and export performance reports for departments, HODs, and faculty.
          </p>
        </div>
      </div>

      <div className="p-8 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-3xl shadow-sm">
        <div className="flex flex-col items-center justify-center py-16 text-[#4C1D95]/30 dark:text-indigo-200/30">
          <FileText className="w-16 h-16 stroke-[1.5]" />
          <p className="text-sm font-bold mt-4">No report data generated yet. Reports will appear once tasks are completed.</p>
        </div>
      </div>
    </div>
  );
}
