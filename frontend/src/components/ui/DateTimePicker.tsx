import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import Swal from 'sweetalert2';

interface DateTimePickerProps {
  value: string; // Expected: "YYYY-MM-DDTHH:mm" format
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  minDate?: string;
  popoverDirection?: 'up' | 'down';
  onOpenChange?: (open: boolean) => void;
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
  onOpenChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to format leading zero
  const pad = (num: number) => num.toString().padStart(2, '0');

  // Helper to parse "YYYY-MM-DDTHH:mm" into components
  const parseDateTime = (dtStr: string): {
    year: number;
    month: number;
    day: number;
    hour12: number;
    minute: number;
    ampm: 'AM' | 'PM';
  } => {
    const now = new Date();
    if (!dtStr) {
      return {
        year: now.getFullYear(),
        month: now.getMonth(), // 0-indexed
        day: now.getDate(),
        hour12: 12,
        minute: 0,
        ampm: 'PM'
      };
    }

    try {
      const parts = dtStr.split(/[ T]/);
      const dateParts = parts[0] ? parts[0].split('-') : [];
      const timeParts = parts[1] ? parts[1].split(':') : ['12', '00'];

      const parsedYear = parseInt(dateParts[0]);
      const year = isNaN(parsedYear) ? now.getFullYear() : parsedYear;
      
      const parsedMonth = parseInt(dateParts[1]);
      const month = isNaN(parsedMonth) ? now.getMonth() : parsedMonth - 1;
      
      const parsedDay = parseInt(dateParts[2]);
      const day = isNaN(parsedDay) ? now.getDate() : parsedDay;
      
      const parsedHour = parseInt(timeParts[0]);
      const hour24 = isNaN(parsedHour) ? 12 : parsedHour;
      
      const parsedMin = parseInt(timeParts[1]);
      const minute = isNaN(parsedMin) ? 0 : parsedMin;
      
      const ampm = hour24 >= 12 ? 'PM' : 'AM';
      let hour12 = hour24 % 12;
      if (hour12 === 0) hour12 = 12;

      return { year, month, day, hour12, minute, ampm: ampm as 'AM' | 'PM' };
    } catch (e) {
      return {
        year: now.getFullYear(),
        month: now.getMonth(),
        day: now.getDate(),
        hour12: 12,
        minute: 0,
        ampm: 'PM'
      };
    }
  };

  // Get current parsed state
  const { year, month, day, hour12, minute, ampm } = parseDateTime(value);

  // Month and Year state for the calendar view navigation
  const [viewMonth, setViewMonth] = useState(month);
  const [viewYear, setViewYear] = useState(year);

  // Sync calendar navigation month/year when the value prop changes
  useEffect(() => {
    const parsed = parseDateTime(value);
    setViewMonth(parsed.month);
    setViewYear(parsed.year);
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Notify parent of open state changes
  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(isOpen);
    }
  }, [isOpen, onOpenChange]);

  // Merge components and trigger onChange
  const updateValue = (newYear: number, newMonth: number, newDay: number, newH12: number, newMin: number, newAmPm: 'AM' | 'PM') => {
    let h24 = newH12;
    if (newAmPm === 'PM' && newH12 < 12) h24 += 12;
    if (newAmPm === 'AM' && newH12 === 12) h24 = 0;

    const formatted = `${newYear}-${pad(newMonth + 1)}-${pad(newDay)}T${pad(h24)}:${pad(newMin)}`;
    
    if (minDate) {
      const selectedDateTime = new Date(formatted).getTime();
      const minDateTime = new Date(minDate.replace(' ', 'T')).getTime();
      if (selectedDateTime < minDateTime) {
        Swal.fire({
          icon: 'warning',
          title: 'Invalid Date/Time',
          text: 'The selected date and time cannot be prior to the allotted deadline or in the past.',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 4000
        });
        onChange(minDate.replace(' ', 'T').substring(0, 16));
        return;
      }
    }

    onChange(formatted);
  };

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  // Calendar Day Generation
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonthTotalDays = new Date(viewYear, viewMonth, 0).getDate();

  const daysGrid = [];
  // Add previous month filler days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    daysGrid.push({
      dayNum: prevMonthTotalDays - i,
      isCurrentMonth: false,
      month: viewMonth === 0 ? 11 : viewMonth - 1,
      year: viewMonth === 0 ? viewYear - 1 : viewYear
    });
  }

  // Add current month days
  for (let i = 1; i <= totalDays; i++) {
    daysGrid.push({
      dayNum: i,
      isCurrentMonth: true,
      month: viewMonth,
      year: viewYear
    });
  }

  // Pad to 42 cells (6 rows of 7 days)
  const remainingCells = 42 - daysGrid.length;
  for (let i = 1; i <= remainingCells; i++) {
    daysGrid.push({
      dayNum: i,
      isCurrentMonth: false,
      month: viewMonth === 11 ? 0 : viewMonth + 1,
      year: viewMonth === 11 ? viewYear + 1 : viewYear
    });
  }

  // Human readable format for trigger button
  const getDisplayValue = () => {
    if (!value) return "Select Deadline Protocol...";
    const parsed = parseDateTime(value);
    return `${pad(parsed.day)}/${pad(parsed.month + 1)}/${parsed.year} ${pad(parsed.hour12)}:${pad(parsed.minute)} ${parsed.ampm}`;
  };

  return (
    <div className={cn("space-y-1.5 w-full relative", className)} ref={containerRef}>
      {label && (
        <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest ml-2 flex items-center gap-2">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] text-xs font-bold text-[#1E184B] flex items-center justify-between hover:border-[#7C3AED]/30 hover:bg-white transition-all outline-none",
            isOpen && "bg-white border-[#7C3AED] ring-4 ring-[#7C3AED]/5 shadow-lg",
            disabled && "opacity-50 cursor-not-allowed grayscale",
            !value && "text-slate-400"
          )}
        >
          <div className="flex items-center gap-3">
            <CalendarIcon className={cn("w-4 h-4 text-slate-400 shrink-0", isOpen && "text-[#7C3AED]")} />
            <span className="truncate">{getDisplayValue()}</span>
          </div>
          <Clock className={cn("w-4 h-4 text-slate-400 transition-colors", isOpen && "text-[#7C3AED]")} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: popoverDirection === 'up' ? -10 : 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: popoverDirection === 'up' ? -10 : 10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cn(
                "absolute z-[350] left-0 p-5 bg-white border border-[#7C3AED]/10 rounded-[24px] shadow-2xl shadow-[#7C3AED]/12 w-[340px] max-w-[95vw] overflow-hidden",
                popoverDirection === 'up' ? "bottom-[100%] mb-2" : "mt-2"
              )}
            >
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-[#7C3AED] border border-slate-100 hover:border-[#7C3AED]/20 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-black text-[#1E184B] uppercase tracking-widest">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-[#7C3AED] border border-slate-100 hover:border-[#7C3AED]/20 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Weekdays Labels */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {WEEKDAYS.map((wd) => (
                  <span key={wd} className="text-[9px] font-black text-[#1E1B4B]/30 tracking-widest uppercase py-1">
                    {wd}
                  </span>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 text-center mb-4">
                {daysGrid.map((cell, idx) => {
                  const isSelected = 
                    cell.dayNum === day && 
                    cell.month === month && 
                    cell.year === year;

                  const cellDate = new Date(cell.year, cell.month, cell.dayNum).setHours(0, 0, 0, 0);
                  const minDateTime = minDate ? new Date(minDate) : null;
                  const minDateMidnight = minDateTime ? new Date(minDateTime.setHours(0, 0, 0, 0)).getTime() : null;
                  const isBeforeMin = minDateMidnight !== null && cellDate < minDateMidnight;
                  const isBtnDisabled = disabled || isBeforeMin;

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isBtnDisabled}
                      onClick={() => {
                        updateValue(cell.year, cell.month, cell.dayNum, hour12, minute, ampm);
                      }}
                      className={cn(
                        "aspect-square text-[11px] font-bold rounded-xl transition-all flex items-center justify-center border border-transparent",
                        cell.isCurrentMonth 
                          ? "text-[#1E184B] hover:bg-[#7C3AED]/5" 
                          : "text-slate-300",
                        isSelected 
                          ? "bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white shadow-lg shadow-[#7C3AED]/20 font-black" 
                          : "",
                        isBtnDisabled ? "opacity-30 cursor-not-allowed hover:bg-transparent" : ""
                      )}
                    >
                      {cell.dayNum}
                    </button>
                  );
                })}
              </div>

              {/* Time Selection Row */}
              <div className="border-t border-slate-100 pt-4 flex flex-col gap-2.5">
                <div className="flex items-center gap-1.5 ml-1">
                  <Clock className="w-3.5 h-3.5 text-[#7C3AED]" />
                  <span className="text-[9px] font-black text-[#1E1B4B]/40 uppercase tracking-widest">
                    Set Time Protocol
                  </span>
                </div>
                
                <div className="flex items-center justify-between gap-2 px-1">
                  {/* Hours */}
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Hour</span>
                    <select
                      value={hour12}
                      onChange={(e) => {
                        updateValue(year, month, day, parseInt(e.target.value), minute, ampm);
                      }}
                      className="w-16 px-2 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-[#1E184B] focus:border-[#7C3AED] outline-none cursor-pointer"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                        <option key={h} value={h}>{pad(h)}</option>
                      ))}
                    </select>
                  </div>

                  <span className="text-slate-400 font-bold self-end mb-2">:</span>

                  {/* Minutes */}
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Minute</span>
                    <select
                      value={minute}
                      onChange={(e) => {
                        updateValue(year, month, day, hour12, parseInt(e.target.value), ampm);
                      }}
                      className="w-16 px-2 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-[#1E184B] focus:border-[#7C3AED] outline-none cursor-pointer"
                    >
                      {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                        <option key={m} value={m}>{pad(m)}</option>
                      ))}
                    </select>
                  </div>

                  {/* AM/PM Toggle */}
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Period</span>
                    <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/50">
                      <button
                        type="button"
                        onClick={() => updateValue(year, month, day, hour12, minute, 'AM')}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all",
                          ampm === 'AM' 
                            ? "bg-white text-[#7C3AED] shadow-sm font-black" 
                            : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => updateValue(year, month, day, hour12, minute, 'PM')}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all",
                          ampm === 'PM' 
                            ? "bg-white text-[#7C3AED] shadow-sm font-black" 
                            : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        PM
                      </button>
                    </div>
                  </div>

                  {/* Apply/Confirm Button */}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="self-end p-2 bg-[#7C3AED] text-white rounded-xl hover:bg-[#6D28D9] shadow-md shadow-[#7C3AED]/20 transition-all flex items-center justify-center shrink-0"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {required && !value && (
        <input 
          type="text" 
          aria-hidden="true"
          tabIndex={-1}
          className="absolute opacity-0 pointer-events-none w-0 h-0" 
          required 
          value="" 
          readOnly 
        />
      )}
    </div>
  );
};

export default DateTimePicker;
