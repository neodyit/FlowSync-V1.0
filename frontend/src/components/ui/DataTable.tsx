import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  header: string;
  key: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  selectedIds: number[];
  onSelectedIdsChange: (ids: number[]) => void;
  getId: (item: T) => number;
  isLoading?: boolean;
  mobileCardRender?: (item: T, isSelected: boolean, onToggleSelect: () => void) => React.ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  selectedIds,
  onSelectedIdsChange,
  getId,
  isLoading = false,
  mobileCardRender,
}: DataTableProps<T>) {
  // Sort state
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting logic
  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    const column = columns.find(col => col.key === sortKey);
    if (!column) return data;

    return [...data].sort((a, b) => {
      let valA = (a as any)[sortKey];
      let valB = (b as any)[sortKey];

      // Handle nested or string comparison
      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = typeof valB === 'string' ? valB.toLowerCase() : '';
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDirection, columns]);

  // Pagination logic
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  
  // Safe page index adjust
  const currentPageSafe = Math.min(currentPage, totalPages);
  
  const paginatedData = useMemo(() => {
    const start = (currentPageSafe - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPageSafe, pageSize]);

  // Selection states
  const filteredIds = useMemo(() => data.map(getId), [data, getId]);
  const isAllSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.includes(id));
  const isSomeSelected = filteredIds.length > 0 && filteredIds.some(id => selectedIds.includes(id)) && !isAllSelected;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const union = new Set([...selectedIds, ...filteredIds]);
      onSelectedIdsChange(Array.from(union));
    } else {
      const filteredSet = new Set(filteredIds);
      onSelectedIdsChange(selectedIds.filter(id => !filteredSet.has(id)));
    }
  };

  const handleToggleSelect = (id: number) => {
    onSelectedIdsChange(
      selectedIds.includes(id)
        ? selectedIds.filter(x => x !== id)
        : [...selectedIds, id]
    );
  };

  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Table & Pagination Wrapper */}
      <div className="bg-white dark:bg-[#1A0F35]/20 backdrop-blur-md rounded-[2rem] border border-[#7C3AED]/10 dark:border-violet-500/20 shadow-xl overflow-hidden">
        
        {/* Desktop view */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-violet-950/20 border-b border-slate-100 dark:border-violet-500/20">
                <th className="px-6 py-5 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={el => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4.5 h-4.5 rounded border-[#7C3AED]/20 text-[#7C3AED] focus:ring-[#7C3AED]/20 cursor-pointer accent-[#7C3AED]"
                  />
                </th>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    onClick={() => handleSort(column.key, column.sortable)}
                    className={cn(
                      "px-6 py-5 text-[10px] font-black text-[#4C1D95]/40 dark:text-violet-400/80 uppercase tracking-[0.2em]",
                      column.sortable && "cursor-pointer select-none hover:text-[#7C3AED] dark:hover:text-violet-300 transition-colors",
                      column.headerClassName
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      {column.header}
                      {column.sortable && sortKey === column.key && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-violet-500/10">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length + 1} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] rounded-full animate-spin" />
                      <p className="text-[#4C1D95]/60 dark:text-violet-400/60 font-black text-xs uppercase tracking-widest">
                        Loading Records...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="py-20 text-center text-slate-400 dark:text-violet-400/60 font-medium">
                    No records found
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => {
                  const itemId = getId(item);
                  const isSelected = selectedIds.includes(itemId);
                  return (
                    <tr
                      key={itemId}
                      className={cn(
                        "group hover:bg-slate-50/80 dark:hover:bg-violet-950/30 transition-colors border-b border-slate-50 dark:border-violet-500/10 cursor-pointer",
                        isSelected && "bg-[#7C3AED]/5 dark:bg-violet-950/20"
                      )}
                    >
                      <td className="px-6 py-6 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(itemId)}
                          className="w-4.5 h-4.5 rounded border-[#7C3AED]/20 text-[#7C3AED] focus:ring-[#7C3AED]/20 cursor-pointer accent-[#7C3AED]"
                        />
                      </td>
                      {columns.map((column) => (
                        <td key={column.key} className={cn("px-6 py-6", column.cellClassName)}>
                          {column.render ? column.render(item) : (item as any)[column.key]}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="block md:hidden p-4 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-10 h-10 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] rounded-full animate-spin" />
              <p className="text-xs font-black uppercase text-slate-400 dark:text-violet-400 tracking-widest">
                Loading Records...
              </p>
            </div>
          ) : paginatedData.length === 0 ? (
            <div className="py-12 text-center text-xs font-bold text-slate-400 dark:text-violet-400/50">
              No records found
            </div>
          ) : (
            paginatedData.map((item) => {
              const itemId = getId(item);
              const isSelected = selectedIds.includes(itemId);
              if (mobileCardRender) {
                return mobileCardRender(item, isSelected, () => handleToggleSelect(itemId));
              }
              return (
                <div
                  key={itemId}
                  className={cn(
                    "p-4 rounded-3xl border border-[#7C3AED]/10 dark:border-violet-500/10 bg-white dark:bg-[#110A24]/60 space-y-3",
                    isSelected && "border-[#7C3AED]/40 dark:border-violet-500/40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(itemId)}
                      className="w-4.5 h-4.5 rounded border-[#7C3AED]/20 text-[#7C3AED] focus:ring-[#7C3AED]/20 cursor-pointer accent-[#7C3AED]"
                    />
                    <span className="text-xs font-bold">Record ID: {itemId}</span>
                  </div>
                  {columns.map((col) => (
                    <div key={col.key} className="flex justify-between text-xs">
                      <span className="font-bold text-slate-400 dark:text-violet-400/60 uppercase">{col.header}:</span>
                      <span>{col.render ? col.render(item) : (item as any)[col.key]}</span>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>

        {/* Premium Pagination Footer */}
        {totalItems > 0 && (
          <div className="px-6 py-4 bg-slate-50/50 dark:bg-violet-950/20 border-t border-slate-100 dark:border-violet-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs sm:text-sm font-bold text-slate-500 dark:text-violet-400/80">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1.5 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-xl outline-none focus:border-[#7C3AED] dark:focus:border-violet-400 transition-colors text-xs font-bold text-[#1E1B4B] dark:text-indigo-100 cursor-pointer"
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span>records</span>
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-violet-400/40 ml-2">
                (Showing {(currentPageSafe - 1) * pageSize + 1} to {Math.min(currentPageSafe * pageSize, totalItems)} of {totalItems})
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPageSafe === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-2 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-xl text-[#7C3AED] dark:text-violet-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-violet-950/40 transition-all active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                // Simple slice of visible page numbers to keep it clean
                if (totalPages > 5 && Math.abs(pageNum - currentPageSafe) > 1 && pageNum !== 1 && pageNum !== totalPages) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} className="px-1 text-slate-400 dark:text-violet-400/40 text-xs">...</span>;
                  }
                  return null;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      "w-9 h-9 flex items-center justify-center rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer",
                      currentPageSafe === pageNum
                        ? "bg-[#7C3AED] text-white shadow-md shadow-purple-500/10"
                        : "bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 text-[#1E1B4B] dark:text-indigo-200 hover:bg-slate-50 dark:hover:bg-violet-950/40"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                disabled={currentPageSafe === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-2 bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-xl text-[#7C3AED] dark:text-violet-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-violet-950/40 transition-all active:scale-95 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
