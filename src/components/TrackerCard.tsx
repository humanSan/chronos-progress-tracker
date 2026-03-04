import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Tracker, Todo } from '../types';
import { calculateProgress, getOrdinal } from '../utils/timeUtils';
import { Trash2, Settings2, CheckSquare } from 'lucide-react';

interface TrackerCardProps {
  tracker: Tracker;
  todos?: Todo[];
  onDelete: (id: string) => void;
  onEdit: (tracker: Tracker) => void;
}

export const TrackerCard: React.FC<TrackerCardProps> = ({ tracker, todos = [], onDelete, onEdit }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const data = calculateProgress(tracker, now);
  const percentageStr = data.percentage.toFixed(tracker.precision);
  const [whole, decimal] = percentageStr.split('.');
  const dayOfMonth = now.getDate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="relative group bg-[#1A1A1A] p-6 rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden"
    >
      <div className="flex justify-between items-start mb-8">
        <div>
          <h3 className="text-[var(--accent1)] text-xs font-bold tracking-widest uppercase mb-1">
            {data.label}
          </h3>
          <p className="text-white/40 text-[11px] font-medium">
            {data.subLabel}
          </p>
          <p className="text-[var(--accent2)] text-[11px] font-medium mt-1">
            {data.timeLeft}
          </p>
        </div>
        
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onEdit(tracker)}
            className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors"
          >
            <Settings2 size={14} />
          </button>
          <button 
            onClick={() => onDelete(tracker.id)}
            className="p-2 hover:bg-red-500/10 rounded-full text-white/40 hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-baseline gap-0.5 mb-4">
        <span className="text-5xl font-bold tracking-tighter" style={{ color: tracker.color }}>
          {whole}
        </span>
        {decimal && (
          <span className="text-4xl font-bold tracking-tighter" style={{ color: tracker.color }}>
            .{decimal}%
          </span>
        )}
        {!decimal && <span className="text-4xl font-bold tracking-tighter" style={{ color: tracker.color }}>%</span>}
        
        <div className="ml-auto text-white/20 text-sm font-medium italic">
          {getOrdinal(dayOfMonth)}
        </div>
      </div>

      <div className="relative h-1.5 w-full bg-white/5 rounded-full">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${data.percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full relative z-10"
          style={{ 
            backgroundColor: tracker.color,
            boxShadow: `0 0 8px ${tracker.color}40`
          }}
        />
        
        {/* Todo Markers */}
        {(todos || []).map(todo => {
          if (!todo || !todo.id) return null;
          return (
            <div 
              key={todo.id}
              className="absolute top-1/2 -translate-y-1/2 w-1 h-3 bg-white/40 rounded-full z-20 group/marker"
              style={{ left: `${todo.percentageGoal || 0}%` }}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/marker:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-black/90 backdrop-blur-md border border-white/10 px-2 py-1 rounded text-[9px] font-bold text-white whitespace-nowrap">
                  {todo.text} ({todo.percentageGoal || 0}%)
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
