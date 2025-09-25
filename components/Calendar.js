import React, { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext.js';

interface CalendarProps {
  initialDate?: string; // YYYY/MM/DD
  taskStartDate?: string;
  taskEndDate?: string;
  onSelectDate: (date: string) => void;
  onClose: () => void;
  minDate?: string;
  maxDate?: string;
  showToday?: boolean;
  // FIX: Added optional `position` prop to allow dynamic placement.
  position?: 'top' | 'bottom';
}

const parseUTCDateString = (dateStr: string): Date | null => {
    if (!/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) return null;
    const parts = dateStr.split('/').map(p => parseInt(p, 10));
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    if (date.getUTCFullYear() !== parts[0] || date.getUTCMonth() !== parts[1] - 1 || date.getUTCDate() !== parts[2]) {
        return null;
    }
    return date;
};

const formatDateUTC = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}/${month}/${day}`;
};

const DAYS_OF_WEEK = {
    en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    ja: ['日', '月', '火', '水', '木', '金', '土'],
}

// FIX: Added `position` to props destructuring and provided a default value.
const Calendar: React.FC<CalendarProps> = ({ initialDate, taskStartDate, taskEndDate, onSelectDate, minDate, maxDate, showToday = false, position = 'bottom' }) => {
  const { language } = useLanguage();
  
  const getInitialDisplayDate = () => {
    if (initialDate) {
        const parsedDate = parseUTCDateString(initialDate);
        if (parsedDate) return parsedDate;
    }
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  };

  const [displayDate, setDisplayDate] = useState(getInitialDisplayDate);

  const selectedDate = useMemo(() => {
    return initialDate ? parseUTCDateString(initialDate) : null;
  }, [initialDate]);
  
  const taskStart = useMemo(() => taskStartDate ? parseUTCDateString(taskStartDate) : null, [taskStartDate]);
  const taskEnd = useMemo(() => taskEndDate ? parseUTCDateString(taskEndDate) : null, [taskEndDate]);

  const minDateTime = useMemo(() => minDate ? parseUTCDateString(minDate)?.getTime() : -Infinity, [minDate]);
  const maxDateTime = useMemo(() => maxDate ? parseUTCDateString(maxDate)?.getTime() : Infinity, [maxDate]);

  const today = useMemo(() => {
    if (!showToday) return null;
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }, [showToday]);


  const changeMonth = (amount: number) => {
    setDisplayDate(prev => {
        const newDate = new Date(prev.getTime());
        newDate.setUTCMonth(newDate.getUTCMonth() + amount);
        return newDate;
    });
  };

  const calendarGrid = useMemo(() => {
    const year = displayDate.getUTCFullYear();
    const month = displayDate.getUTCMonth();
    
    const firstDayOfMonth = new Date(Date.UTC(year, month, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    const days: (Date|null)[] = [];
    // Pad start with empty cells
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
    }
    // Fill in days of the month
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(Date.UTC(year, month, i)));
    }
    return days;
  }, [displayDate]);

  const handleDateClick = (date: Date) => {
      onSelectDate(formatDateUTC(date));
  };
  
  // FIX: Determined positioning classes based on the `position` prop.
  const positionClasses = position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';
  
  return (
    <div data-calendar-popover className={`absolute ${positionClasses} w-72 bg-white border border-gray-300 rounded-lg shadow-xl z-40 p-2 font-sans`}>
      <div className="flex justify-between items-center mb-2 px-2">
        <button onClick={() => changeMonth(-1)} className="p-1 rounded-full hover:bg-gray-100" aria-label="Previous month">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        <div className="font-semibold text-sm text-gray-700">
            {displayDate.toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' })}
        </div>
        <button onClick={() => changeMonth(1)} className="p-1 rounded-full hover:bg-gray-100" aria-label="Next month">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
        {DAYS_OF_WEEK[language].map(day => <div key={day}>{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarGrid.map((date, index) => {
            if (!date) {
                return <div key={index}></div>;
            }

            const dayTime = date.getTime();
            const isSelected = selectedDate && dayTime === selectedDate.getTime();
            const isToday = today && dayTime === today.getTime();
            const isDisabled = dayTime < minDateTime || dayTime > maxDateTime;

            const classNames = ['w-full', 'h-9', 'text-sm', 'transition-colors', 'relative', 'flex', 'items-center', 'justify-center'];

            let inRange = false;
            if (taskStart && taskEnd) {
                const startTime = taskStart.getTime();
                const endTime = taskEnd.getTime();
                inRange = dayTime >= startTime && dayTime <= endTime;
            }

            if (isDisabled) {
                classNames.push('text-gray-300', 'cursor-not-allowed');
            } else {
                if (isSelected) {
                    classNames.push('bg-indigo-600', 'text-white', 'rounded-full');
                } else if (inRange) {
                    classNames.push('bg-indigo-100');
                    const startTime = taskStart.getTime();
                    const endTime = taskEnd.getTime();
                    if (startTime === endTime) {
                        classNames.push('rounded-full');
                    } else if (dayTime === startTime) {
                        classNames.push('rounded-l-full');
                    } else if (dayTime === endTime) {
                        classNames.push('rounded-r-full');
                    }
                } else {
                     classNames.push('hover:bg-gray-200', 'rounded-full');
                }

                if (isToday && !isSelected) {
                    classNames.push('ring-2', 'ring-blue-500');
                }
            }
            
            return (
                <div key={index} className="flex justify-center items-center">
                    <button 
                        onClick={() => !isDisabled && handleDateClick(date)}
                        disabled={isDisabled}
                        className={classNames.join(' ')}
                    >
                        <span className="relative">{date.getUTCDate()}</span>
                    </button>
                </div>
            )
        })}
      </div>
    </div>
  );
};

export default Calendar;