import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import Swal from 'sweetalert2';

interface DateTimePickerProps {
  value: string; // Expected: "YYYY-MM-DDTHH:mm" or "YYYY-MM-DD" format
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  minDate?: string;
  popoverDirection?: 'up' | 'down';
  onOpenChange?: (open: boolean) => void;
  dateOnly?: boolean;
  align?: 'left' | 'right';
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  label,
  className,
  disabled,
  required,
  minDate,
  popoverDirection = 'down',
  onOpenChange,
  dateOnly = false,
  align = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const pad = (num: number) => num.toString().padStart(2, '0');

  const parseDateTime = (dtStr: string): {
    year: number; month: number; day: number;
    hour12: number; minute: number; ampm: 'AM' | 'PM';
  } => {
    const now = new Date();
    if (!dtStr) {
      return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate(), hour12: 12, minute: 0, ampm: 'PM' };
    }
    try {
      const parts = dtStr.split(/[ T]/);
      const dateParts = parts[0] ? parts[0].split('-') : [];
      const timeParts = parts[1] ? parts[1].split(':') : ['12', '00'];
      const year = parseInt(dateParts[0]) || now.getFullYear();
      const month = (parseInt(dateParts[1]) || now.getMonth() + 1) - 1;
      const day = parseInt(dateParts[2]) || now.getDate();
      const hour24 = parseInt(timeParts[0]) || 12;
      const minute = parseInt(timeParts[1]) || 0;
      const ampm = hour24 >= 12 ? 'PM' : 'AM';
      let hour12 = hour24 % 12;
      if (hour12 === 0) hour12 = 12;
      return { year, month, day, hour12, minute, ampm: ampm as 'AM' | 'PM' };
    } catch {
      return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate(), hour12: 12, minute: 0, ampm: 'PM' };
    }
  };

  const { year, month, day, hour12, minute, ampm } = parseDateTime(value);
  const [viewMonth, setViewMonth] = useState(month);
  const [viewYear, setViewYear] = useState(year);

  useEffect(() => {
    const parsed = parseDateTime(value);
    setViewMonth(parsed.month);
    setViewYear(parsed.year);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  const updateValue = (newYear: number, newMonth: number, newDay: number, newH12: number, newMin: number, newAmPm: 'AM' | 'PM') => {
    let formatted = "";
    if (dateOnly) {
      formatted = `${newYear}-${pad(newMonth + 1)}-${pad(newDay)}`;
    } else {
      let h24 = newH12;
      if (newAmPm === 'PM' && newH12 < 12) h24 += 12;
      if (newAmPm === 'AM' && newH12 === 12) h24 = 0;
      formatted = `${newYear}-${pad(newMonth + 1)}-${pad(newDay)}T${pad(h24)}:${pad(newMin)}`;
    }
    if (minDate) {
      const selectedDateTime = new Date(formatted).getTime();
      const minDateTime = new Date(minDate.replace(' ', 'T')).getTime();
      if (selectedDateTime < minDateTime) {
        Swal.fire({ icon: 'warning', title: 'Invalid Date/Time', text: 'The selected date/time cannot be before the minimum deadline.', toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        onChange(minDate.replace(' ', 'T').substring(0, 16));
        return;
      }
    }
    onChange(formatted);
    if (dateOnly) {
      setIsOpen(false);
    }
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(p => p - 1); }
    else setViewMonth(p => p - 1);
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(p => p + 1); }
    else setViewMonth(p => p + 1);
  };

  const handleToday = () => {
    const now = new Date();
    setViewMonth(now.getMonth());
    setViewYear(now.getFullYear());
    updateValue(now.getFullYear(), now.getMonth(), now.getDate(), hour12, minute, ampm);
  };

  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonthTotalDays = new Date(viewYear, viewMonth, 0).getDate();

  const daysGrid = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    daysGrid.push({ dayNum: prevMonthTotalDays - i, isCurrentMonth: false, month: viewMonth === 0 ? 11 : viewMonth - 1, year: viewMonth === 0 ? viewYear - 1 : viewYear });
  }
  for (let i = 1; i <= totalDays; i++) {
    daysGrid.push({ dayNum: i, isCurrentMonth: true, month: viewMonth, year: viewYear });
  }
  const remainingCells = 42 - daysGrid.length;
  for (let i = 1; i <= remainingCells; i++) {
    daysGrid.push({ dayNum: i, isCurrentMonth: false, month: viewMonth === 11 ? 0 : viewMonth + 1, year: viewMonth === 11 ? viewYear + 1 : viewYear });
  }

  const getDisplayValue = () => {
    if (!value) return dateOnly ? "Select Date..." : "Select Deadline Protocol...";
    const parsed = parseDateTime(value);
    if (dateOnly) {
      return `${pad(parsed.day)}/${pad(parsed.month + 1)}/${parsed.year}`;
    }
    return `${pad(parsed.day)}/${pad(parsed.month + 1)}/${parsed.year} ${pad(parsed.hour12)}:${pad(parsed.minute)} ${parsed.ampm}`;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className={cn("space-y-1.5 w-full relative", className)} ref={containerRef}>
      {label && (
        <label className="text-[10px] font-black text-[#1E184B] dark:text-indigo-300 uppercase tracking-widest ml-2 flex items-center gap-2">
          {label}
        </label>
      )}
      <div className="relative">
        {/* Trigger Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full px-5 py-4 bg-slate-50 dark:bg-[#130C24] border-2 border-slate-100 dark:border-[rgba(139,92,246,0.15)] rounded-[1.5rem] text-xs font-bold text-[#1E184B] dark:text-indigo-100 flex items-center justify-between hover:border-[#7C3AED]/40 dark:hover:border-violet-500/40 hover:bg-white dark:hover:bg-[#1A0F35] transition-all outline-none",
            isOpen && "bg-white dark:bg-[#1A0F35] border-[#7C3AED] dark:border-violet-500 ring-4 ring-[#7C3AED]/10 dark:ring-violet-500/10 shadow-lg",
            disabled && "opacity-50 cursor-not-allowed grayscale",
            !value && "text-slate-400 dark:text-indigo-400/50"
          )}
        >
          <div className="flex items-center gap-3">
            <CalendarIcon className={cn("w-4 h-4 shrink-0 transition-colors", isOpen ? "text-[#7C3AED] dark:text-violet-400" : "text-slate-400 dark:text-indigo-400/50")} />
            <span className="truncate">{getDisplayValue()}</span>
          </div>
          {!dateOnly && <Clock className={cn("w-4 h-4 transition-colors", isOpen ? "text-[#7C3AED] dark:text-violet-400" : "text-slate-400 dark:text-indigo-400/50")} />}
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: popoverDirection === 'up' ? -10 : 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: popoverDirection === 'up' ? -10 : 10, scale: 0.96 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className={cn(
                "absolute z-[350] p-4 sm:p-5 rounded-[24px] shadow-2xl w-[295px] sm:w-[325px] max-w-[95vw] overflow-hidden",
                align === 'right' ? "right-0" : "left-0",
                "bg-white dark:bg-[#110A24]",
                "border border-[#7C3AED]/10 dark:border-violet-500/20",
                "shadow-[#7C3AED]/10 dark:shadow-violet-900/60",
                popoverDirection === 'up' ? "bottom-[100%] mb-2" : "mt-2"
              )}
            >
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 hover:bg-slate-50 dark:hover:bg-violet-900/30 rounded-xl text-slate-500 dark:text-indigo-300 hover:text-[#7C3AED] dark:hover:text-violet-300 border border-slate-100 dark:border-violet-500/15 hover:border-[#7C3AED]/20 dark:hover:border-violet-500/40 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  <select
                    value={viewMonth}
                    onChange={(e) => setViewMonth(parseInt(e.target.value))}
                    className="px-2 py-1 bg-slate-50 dark:bg-[#1A0F35] border border-slate-100 dark:border-violet-500/20 rounded-xl text-[10px] font-black text-[#1E184B] dark:text-indigo-100 focus:border-[#7C3AED] dark:focus:border-violet-500 outline-none cursor-pointer transition-colors uppercase tracking-wider"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={idx} value={idx} className="bg-white dark:bg-[#110A24] text-[#1E184B] dark:text-indigo-100">
                        {name.substring(0, 3)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={viewYear}
                    onChange={(e) => setViewYear(parseInt(e.target.value))}
                    className="px-2 py-1 bg-slate-50 dark:bg-[#1A0F35] border border-slate-100 dark:border-violet-500/20 rounded-xl text-[10px] font-black text-[#1E184B] dark:text-indigo-100 focus:border-[#7C3AED] dark:focus:border-violet-500 outline-none cursor-pointer transition-colors tracking-wider"
                  >
                    {Array.from({ length: 51 }, (_, i) => today.getFullYear() - 30 + i).map((yr) => (
                      <option key={yr} value={yr} className="bg-white dark:bg-[#110A24] text-[#1E184B] dark:text-indigo-100">
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-slate-50 dark:hover:bg-violet-900/30 rounded-xl text-slate-500 dark:text-indigo-300 hover:text-[#7C3AED] dark:hover:text-violet-300 border border-slate-100 dark:border-violet-500/15 hover:border-[#7C3AED]/20 dark:hover:border-violet-500/40 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Weekdays */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {WEEKDAYS.map((wd) => (
                  <span key={wd} className="text-[9px] font-black text-slate-400 dark:text-violet-400/50 tracking-widest uppercase py-1">
                    {wd}
                  </span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center mb-0">
                {daysGrid.map((cell, idx) => {
                  const isSelected = cell.dayNum === day && cell.month === month && cell.year === year;
                  const cellDate = new Date(cell.year, cell.month, cell.dayNum).setHours(0, 0, 0, 0);
                  const minDateTime = minDate ? new Date(minDate) : null;
                  const minDateMidnight = minDateTime ? new Date(minDateTime.setHours(0, 0, 0, 0)).getTime() : null;
                  const isBeforeMin = minDateMidnight !== null && cellDate < minDateMidnight;
                  const isBtnDisabled = disabled || isBeforeMin;
                  const isToday = cellDate === today.getTime();

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isBtnDisabled}
                      onClick={() => updateValue(cell.year, cell.month, cell.dayNum, hour12, minute, ampm)}
                      className={cn(
                        "aspect-square text-[11px] font-bold rounded-xl transition-all flex items-center justify-center border",
                        // Base
                        cell.isCurrentMonth
                          ? "text-[#1E184B] dark:text-indigo-100 border-transparent hover:bg-[#7C3AED]/8 dark:hover:bg-violet-500/15 hover:border-[#7C3AED]/15 dark:hover:border-violet-500/30"
                          : "text-slate-300 dark:text-violet-900/60 border-transparent",
                        // Today highlight (non-selected)
                        isToday && !isSelected && "border-[#7C3AED]/30 dark:border-violet-500/40 text-[#7C3AED] dark:text-violet-400 font-black",
                        // Selected
                        isSelected && "bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] text-white shadow-lg shadow-[#7C3AED]/30 dark:shadow-violet-900/50 font-black border-transparent hover:bg-none hover:border-transparent",
                        // Disabled
                        isBtnDisabled && "opacity-25 cursor-not-allowed hover:bg-transparent hover:border-transparent"
                      )}
                    >
                      {cell.dayNum}
                    </button>
                  );
                })}
              </div>

              {/* Today and Action Footer */}
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-violet-500/15 pt-3">
                <button
                  type="button"
                  onClick={handleToday}
                  className="flex-1 py-2 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/40 text-[#7C3AED] dark:text-violet-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-[#7C3AED]/15 dark:border-violet-500/20"
                >
                  Today
                </button>
                {dateOnly && (
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 py-2 bg-[#7C3AED] dark:bg-violet-600 hover:bg-[#6D28D9] dark:hover:bg-violet-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-[#7C3AED]/20 dark:shadow-violet-900/40"
                  >
                    Done
                  </button>
                )}
              </div>

              {/* Time Selection */}
              {!dateOnly && (
                <div className="border-t border-slate-100 dark:border-violet-500/15 pt-4 mt-4 flex flex-col gap-3">
                  <div className="flex items-center gap-1.5 ml-1">
                    <Clock className="w-3.5 h-3.5 text-[#7C3AED] dark:text-violet-400" />
                    <span className="text-[9px] font-black text-slate-400 dark:text-violet-400/60 uppercase tracking-widest">
                      Set Time Protocol
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 px-1">
                    {/* Hours */}
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-[8px] font-black text-slate-400 dark:text-violet-400/60 uppercase tracking-widest ml-1">Hour</span>
                      <select
                        value={hour12}
                        onChange={(e) => updateValue(year, month, day, parseInt(e.target.value), minute, ampm)}
                        className="w-16 px-2 py-2 bg-slate-50 dark:bg-[#1A0F35] border border-slate-100 dark:border-violet-500/20 rounded-xl text-xs font-bold text-[#1E184B] dark:text-indigo-100 focus:border-[#7C3AED] dark:focus:border-violet-500 outline-none cursor-pointer transition-colors"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                          <option key={h} value={h}>{pad(h)}</option>
                        ))}
                      </select>
                    </div>

                    <span className="text-slate-400 dark:text-violet-400/50 font-bold self-end mb-2 text-lg">:</span>

                    {/* Minutes */}
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-[8px] font-black text-slate-400 dark:text-violet-400/60 uppercase tracking-widest ml-1">Minute</span>
                      <select
                        value={minute}
                        onChange={(e) => updateValue(year, month, day, hour12, parseInt(e.target.value), ampm)}
                        className="w-16 px-2 py-2 bg-slate-50 dark:bg-[#1A0F35] border border-slate-100 dark:border-violet-500/20 rounded-xl text-xs font-bold text-[#1E184B] dark:text-indigo-100 focus:border-[#7C3AED] dark:focus:border-violet-500 outline-none cursor-pointer transition-colors"
                      >
                        {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                          <option key={m} value={m}>{pad(m)}</option>
                        ))}
                      </select>
                    </div>

                    {/* AM/PM Toggle */}
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-[8px] font-black text-slate-400 dark:text-violet-400/60 uppercase tracking-widest ml-1">Period</span>
                      <div className="flex bg-slate-100 dark:bg-[#1A0F35] p-0.5 rounded-xl border border-slate-200/50 dark:border-violet-500/20">
                        {(['AM', 'PM'] as const).map((period) => (
                          <button
                            key={period}
                            type="button"
                            onClick={() => updateValue(year, month, day, hour12, minute, period)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all",
                              ampm === period
                                ? "bg-[#7C3AED] dark:bg-violet-600 text-white shadow-md shadow-[#7C3AED]/30 dark:shadow-violet-900/60"
                                : "text-slate-400 dark:text-violet-400/50 hover:text-slate-600 dark:hover:text-violet-300"
                            )}
                          >
                            {period}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Confirm */}
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="self-end p-2.5 bg-[#7C3AED] dark:bg-violet-600 text-white rounded-xl hover:bg-[#6D28D9] dark:hover:bg-violet-700 shadow-lg shadow-[#7C3AED]/25 dark:shadow-violet-900/50 transition-all flex items-center justify-center shrink-0 active:scale-95"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {required && !value && (
        <input type="text" aria-hidden="true" tabIndex={-1} className="absolute opacity-0 pointer-events-none w-0 h-0" required value="" readOnly />
      )}
    </div>
  );
};

export default DateTimePicker;
