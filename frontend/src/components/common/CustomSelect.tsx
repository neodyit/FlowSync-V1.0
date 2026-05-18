import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";

interface Option {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  options: Option[];
  value: string | number;
  onChange: (value: any) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select option", 
  label,
  className,
  disabled,
  icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("space-y-1.5", className)} ref={containerRef}>
      {label && <label className="text-[10px] font-black text-[#1E1B4B]/40 uppercase tracking-widest ml-1">{label}</label>}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none transition-all text-sm font-medium",
            isOpen && "bg-white border-[#7C3AED] ring-4 ring-[#7C3AED]/5 shadow-lg",
            disabled && "opacity-50 cursor-not-allowed grayscale",
            !selectedOption && "text-slate-400"
          )}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            {icon && <span className={cn("text-slate-400 shrink-0", isOpen && "text-[#7C3AED]")}>{icon}</span>}
            <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-300", isOpen && "rotate-180 text-[#7C3AED]")} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute z-[100] w-full mt-2 py-2 bg-white border border-[#7C3AED]/10 rounded-[24px] shadow-2xl shadow-[#7C3AED]/10 overflow-hidden"
            >
              <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                {options.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-slate-400 italic">No options available</div>
                ) : (
                  options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[#7C3AED]/5",
                        value === option.value ? "text-[#7C3AED] bg-[#7C3AED]/5" : "text-slate-600"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {option.icon}
                        <span>{option.label}</span>
                      </div>
                      {value === option.value && <Check className="w-4 h-4" />}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CustomSelect;
