import React from 'react';
import {
  format,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarProps {
  currentMonth: Date;
  onMonthChange: (d: Date) => void;
  onDateClick: (d: Date) => void;
  focusDate: Date;
  className?: string;
}

export const Calendar: React.FC<CalendarProps> = ({
  currentMonth,
  onMonthChange,
  onDateClick,
  focusDate,
  className,
}) => {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <div className={`select-none h-full w-full ${className ?? ''}`}>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => onMonthChange(subDays(monthStart, 1))}
          className="p-1 text-white/40 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-bold text-white/60">{format(currentMonth, 'MMMM yyyy')}</span>
        <button
          onClick={() => onMonthChange(addDays(monthEnd, 1))}
          className="p-1 text-white/40 hover:text-white transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-[11px] font-bold text-white/40 py-1">{d}</div>
        ))}
        {days.map((day) => {
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const selected = isSameDay(day, focusDate);
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateClick(day)}
              className={`text-xs aspect-square w-full rounded-md flex items-center justify-center transition-all
                ${today
                  ? 'bg-[#d93d42] text-white font-bold'
                  : selected
                    ? 'bg-white/20 text-white font-bold'
                    : inMonth
                      ? 'text-white/60 hover:text-white hover:bg-white/10'
                      : 'text-white/20 hover:bg-white/5'}
              `}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
};
