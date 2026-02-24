import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Tracker } from '../types';
import { calculateProgress, getOrdinal } from '../utils/timeUtils';
import { Trash2, Settings2 } from 'lucide-react';

interface TrackerCardProps {
  tracker: Tracker;
  onDelete: (id: string) => void;
  onEdit: (tracker: Tracker) => void;
}

export const TrackerCard: React.FC<TrackerCardProps> = ({ tracker, onDelete, onEdit }) => {
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

      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${data.percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: tracker.color }}
        />
      </div>
    </motion.div>
  );
};
