import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme, Theme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { theme, effectiveTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options: Array<{ value: Theme; label: string; icon: React.ElementType }> = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Laptop },
  ];

  const CurrentIcon = effectiveTheme === 'dark' ? Moon : Sun;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs flex items-center gap-1.5"
        aria-label="Toggle theme"
        title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}
      >
        <CurrentIcon className="w-4 h-4 text-slate-600 dark:text-slate-300 transition-transform" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-32 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setTheme(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-left transition-colors',
                  isSelected
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/40 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ThemeToggle;
