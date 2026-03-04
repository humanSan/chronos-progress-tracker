import React from 'react';
import { Clock, CheckSquare } from 'lucide-react';
import { motion } from 'motion/react';

interface SidebarProps {
  activeView: 'trackers' | 'todos';
  onViewChange: (view: 'trackers' | 'todos') => void;
  isVisible: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, isVisible }) => {
  if (!isVisible) return null;

  return (
    <motion.div 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed left-0 top-0 bottom-0 w-20 bg-[#111] border-r border-white/5 flex flex-col items-center py-8 z-50"
    >
      <div className="flex flex-col gap-6">
        <button
          onClick={() => onViewChange('trackers')}
          className={`group relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
            activeView === 'trackers' 
              ? 'bg-[var(--accent1)] text-black shadow-lg shadow-[var(--accent1)]/20' 
              : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
          }`}
          title="Trackers"
        >
          <Clock size={22} strokeWidth={2.5} />
          {activeView === 'trackers' && (
            <motion.div 
              layoutId="sidebar-active"
              className="absolute -left-4 w-1 h-6 bg-[var(--accent1)] rounded-r-full"
            />
          )}
        </button>

        <button
          onClick={() => onViewChange('todos')}
          className={`group relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
            activeView === 'todos' 
              ? 'bg-[var(--accent2)] text-black shadow-lg shadow-[var(--accent2)]/20' 
              : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
          }`}
          title="Daily Todos"
        >
          <CheckSquare size={22} strokeWidth={2.5} />
          {activeView === 'todos' && (
            <motion.div 
              layoutId="sidebar-active"
              className="absolute -left-4 w-1 h-6 bg-[var(--accent2)] rounded-r-full"
            />
          )}
        </button>
      </div>
    </motion.div>
  );
};
