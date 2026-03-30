import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  format,
  addDays,
  startOfWeek,
  isSameDay,
  parseISO,
  eachDayOfInterval,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  getDay,
  subDays
} from 'date-fns';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  CheckSquare,
  X,
  Flame
} from 'lucide-react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Todo, DayTodos } from '../types';
import { timeToPercentage, percentageToTime } from '../utils/timeUtils';

import { CompactDayTracker } from './CompactDayTracker';
import { CalendarView } from './CalendarView';

interface TodoViewProps {
  dayTodos: DayTodos[];
  onUpdateTodos: (date: string, todos: Todo[]) => void;
  onStartTracking: (id: string) => void;
  activeTodoId: string | null;
  onToggleTodo: (id: string) => void;
}

interface SortableItemProps {
  todo: Todo;
  date: string;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (todo: Todo) => void;
  isEditing: boolean;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, text: string, time: string, percent: string, newDate: string) => void;
  onStartTracking: (id: string) => void;
  isActive: boolean;
}

interface TodoItemProps {
  todo: Todo;
  date: string;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (todo: Todo) => void;
  isEditing: boolean;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, text: string, time: string, percent: string, newDate: string) => void;
  onStartTracking: (id: string) => void;
  isActive: boolean;
  isDragging?: boolean;
  style?: React.CSSProperties;
  attributes?: any;
  listeners?: any;
  setNodeRef?: (node: HTMLElement | null) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({
  todo,
  date,
  onToggle,
  onDelete,
  onEdit,
  isEditing,
  onCancelEdit,
  onSaveEdit,
  onStartTracking,
  isActive,
  isDragging,
  style,
  attributes,
  listeners,
  setNodeRef
}) => {
  const [editText, setEditText] = useState(todo.text);
  const [editTime, setEditTime] = useState(todo.endTime || '');
  const [editPercent, setEditPercent] = useState(todo.percentageGoal?.toString() || '');
  const [editDate, setEditDate] = useState(date);

  // Sync internal state when todo or date changes
  React.useEffect(() => {
    setEditText(todo.text);
    setEditTime(todo.endTime || '');
    setEditPercent(todo.percentageGoal?.toString() || '');
    setEditDate(date);
  }, [todo, date]);

  const handleTimeChange = (val: string) => {
    setEditTime(val);
    const p = timeToPercentage(val);
    if (p !== undefined) setEditPercent(p.toString());
  };

  const handlePercentChange = (val: string) => {
    setEditPercent(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const t = percentageToTime(num);
      if (t) setEditTime(t);
    }
  };

  if (isEditing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="p-4 bg-[#1A1A1A] border border-[var(--accent2)]/30 rounded-2xl shadow-xl space-y-3"
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSaveEdit(todo.id, editText, editTime, editPercent, editDate);
          if (e.key === 'Escape') onCancelEdit();
        }}
      >
        <input
          autoFocus
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[var(--accent2)] transition-colors text-sm"
        />
        <div className="flex gap-3">
          <input
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-xs font-mono focus:outline-none focus:border-[var(--accent2)]"
          />
          <input
            type="text"
            value={editTime}
            onChange={(e) => handleTimeChange(e.target.value)}
            placeholder="End Time (e.g. 12:00)"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-xs font-mono focus:outline-none focus:border-[var(--accent2)]"
          />
          <input
            type="number"
            step="any"
            value={editPercent}
            onChange={(e) => handlePercentChange(e.target.value)}
            placeholder="%"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-xs font-mono focus:outline-none focus:border-[var(--accent2)]"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onSaveEdit(todo.id, editText, editTime, editPercent, editDate)}
            className="flex-1 bg-[var(--accent2)] hover:opacity-90 text-black font-bold py-2 rounded-xl text-xs transition-all"
          >
            Save Changes
          </button>
          <button
            onClick={onCancelEdit}
            className="px-4 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl text-xs font-bold transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-4 py-1.5 border-b border-white/5 ${isDragging ? 'opacity-0' : ''
        }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-white/20 hover:text-white/40 transition-all"
      >
        <GripVertical size={18} />
      </button>

      <button
        onClick={() => onToggle(todo.id)}
        className="relative"
      >
        <motion.div
          animate={todo.completed ? { scale: [1, 1.2, 1], rotate: [0, 10, 0] } : {}}
          transition={{ duration: 0.3 }}
          className={`transition-colors ${todo.completed ? 'text-[var(--accent1)]' : 'text-white hover:text-[var(--accent1)]'}`}
        >
          {todo.completed ? <CheckCircle2 size={26} /> : <Circle size={26} strokeWidth={2.5} />}
        </motion.div>
        {todo.completed && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-[var(--accent1)] rounded-full"
          />
        )}
      </button>

      <div className="flex-1 min-w-0 cursor-pointer group/text" onClick={() => onEdit(todo)}>
        <p className={`text-lg transition duration-500 ${isActive ? 'font-bold' : 'font-medium'
          } ${todo.completed
            ? 'text-white/20 line-through translate-x-2'
            : 'text-white group-hover/text:text-[var(--accent2)]'
          }`}>
          {todo.text}
        </p>
      </div>

      {/* {todo.endTime && (
        <button
          onClick={() => onStartTracking(todo.id)}
          className={`opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${isActive
            ? 'bg-[var(--accent1)] text-black'
            : 'bg-white/5 hover:bg-white/10 text-white/40 hover:text-white'
            }`}
        >
          {isActive ? 'Tracking' : 'Track'}
        </button>
      )} */}

      {(todo.endTime || todo.percentageGoal !== undefined) && (
        <div
          onClick={() => onStartTracking(todo.id)}
          className={`flex items-center gap-2 px-3 cursor-pointer py-1 rounded-lg transition ${todo.completed
            ? 'bg-white/5 shadow-none'
            : isActive
              ? 'bg-[var(--accent1)] shadow-lg shadow-[var(--accent1)]/10'
              : 'bg-white/5 shadow-none hover:bg-white/10'
            }`}>
          {todo.endTime && (
            <div className={`flex items-center gap-1.5 text-[13px] font-mono font-bold transition-colors duration-500 ${todo.completed
              ? 'text-white/20'
              : isActive
                ? 'text-black'
                : 'text-[var(--accent1)]'
              }`}>
              <Clock size={14} />
              {todo.endTime}
            </div>
          )}
          {todo.endTime && todo.percentageGoal !== undefined && (
            <div className={`w-px h-3 transition-colors duration-500 ${todo.completed
              ? 'bg-white/10'
              : isActive
                ? 'bg-black/20'
                : 'bg-[var(--accent1)]/20'
              }`} />
          )}
          {todo.percentageGoal !== undefined && (
            <div className={`text-[13px] font-mono font-bold transition-colors duration-500 ${todo.completed
              ? 'text-white/20'
              : isActive
                ? 'text-black'
                : 'text-[var(--accent1)]'
              }`}>
              {Number.isInteger(todo.percentageGoal) ? todo.percentageGoal : Math.round(todo.percentageGoal)}%
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => onDelete(todo.id)}
        className="opacity-0 group-hover:opacity-100 p-2 text-white/10 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

const SortableTodoItem: React.FC<SortableItemProps> = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: props.todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <TodoItem
      {...props}
      setNodeRef={setNodeRef}
      style={style}
      attributes={attributes}
      listeners={listeners}
      isDragging={isDragging}
    />
  );
};

// ─── Streak Heatmap Modal ────────────────────────────────────────────────────
interface HeatmapModalProps {
  dayTodos: DayTodos[];
  onClose: () => void;
}

const HEAT_COLORS = [
  'rgba(255,255,255,0.06)',   // 0 – no tasks / empty
  '#3b0764',                  // 1 – partial
  '#7c3aed',                  // 2
  '#a855f7',                  // 3
  '#c084fc',                  // 4
  '#e879f9',                  // 5
  '#f0abfc',                  // 6
  '#fde68a',                  // 7 – max
];

function dayCompletionLevel(todos: DayTodos['todos']): number {
  if (!todos || todos.length === 0) return 0;
  const done = todos.filter(t => t?.completed).length;
  const ratio = done / todos.length;
  // Map 0-1 ratio to color levels 1-7
  return Math.max(1, Math.ceil(ratio * 7));
}

function isFullyComplete(todos: DayTodos['todos']): boolean {
  return todos.length > 0 && todos.every(t => t?.completed);
}

const StreakHeatmapModal: React.FC<HeatmapModalProps> = ({ dayTodos, onClose }) => {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  // days in month
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  // leading blank cells so Mon = col 0
  const startDow = (getDay(monthStart) + 6) % 7; // 0=Mon

  const getLevel = (day: Date): number => {
    const key = format(day, 'yyyy-MM-dd');
    const entry = dayTodos.find(d => d.date === key);
    if (!entry || !entry.todos || entry.todos.length === 0) return 0;
    return dayCompletionLevel(entry.todos);
  };

  const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <motion.div
      ref={overlayRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-[420px] rounded-3xl p-6 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #0f0f1a 0%, #12041f 50%, #0a0f1e 100%)',
          border: '1px solid rgba(168,85,247,0.25)',
          boxShadow: '0 0 60px rgba(168,85,247,0.15), 0 25px 50px rgba(0,0,0,0.6)'
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-xl" style={{ background: 'rgba(168,85,247,0.15)' }}>
            <Flame size={18} className="text-purple-400" />
          </div>
          <div>
            <p className="text-white font-bold text-base">Completion Heatmap</p>
            <p className="text-white/30 text-xs">Daily task completion intensity</p>
          </div>
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setViewMonth(m => subDays(startOfMonth(m), 1))}
            className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-white/80 text-sm font-semibold">
            {format(viewMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setViewMonth(m => addDays(endOfMonth(m), 1))}
            className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* DOW labels */}
        <div className="grid grid-cols-7 mb-1">
          {DOW_LABELS.map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-white/20 uppercase tracking-wider py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: startDow }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {monthDays.map(day => {
            const level = getLevel(day);
            const isToday = isSameDay(day, today);
            const hasTodos = (dayTodos.find(d => d.date === format(day, 'yyyy-MM-dd'))?.todos?.length ?? 0) > 0;
            return (
              <motion.div
                key={day.toISOString()}
                whileHover={{ scale: 1.15 }}
                title={`${format(day, 'MMM d')}: ${hasTodos ? `Level ${level}/7` : 'No tasks'}`}
                className="aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold cursor-default relative"
                style={{
                  background: level === 0 ? HEAT_COLORS[0] : HEAT_COLORS[Math.min(level, 7)],
                  color: level >= 4 ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.5)',
                  boxShadow: level >= 3 ? `0 0 8px ${HEAT_COLORS[Math.min(level, 7)]}88` : 'none',
                  outline: isToday ? '2px solid rgba(255,255,255,0.4)' : 'none',
                  outlineOffset: '1px',
                }}
              >
                {format(day, 'd')}
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/5">
          <span className="text-[10px] text-white/25 uppercase tracking-wider">Less</span>
          <div className="flex gap-1">
            {HEAT_COLORS.map((c, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-md"
                style={{ background: c }}
              />
            ))}
          </div>
          <span className="text-[10px] text-white/25 uppercase tracking-wider">More</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── TodoView ────────────────────────────────────────────────────────────────
export const TodoView: React.FC<TodoViewProps> = ({
  dayTodos,
  onUpdateTodos,
  onStartTracking,
  activeTodoId,
  onToggleTodo
}) => {
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoTime, setNewTodoTime] = useState('');
  const [newTodoPercent, setNewTodoPercent] = useState<string>('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const handleNewTimeChange = (val: string) => {
    setNewTodoTime(val);
    const p = timeToPercentage(val);
    if (p !== undefined) setNewTodoPercent(p.toString());
  };

  const handleNewPercentChange = (val: string) => {
    setNewTodoPercent(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const t = percentageToTime(num);
      if (t) setNewTodoTime(t);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const currentDayData = useMemo(() => {
    return dayTodos.find(d => d.date === selectedDate) || { date: selectedDate, todos: [] };
  }, [dayTodos, selectedDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });
    return eachDayOfInterval({
      start,
      end: endOfWeek(start, { weekStartsOn: 1 })
    });
  }, [selectedDate]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      const todos = currentDayData.todos || [];
      const oldIndex = todos.findIndex(t => t && t.id === active.id);
      const newIndex = todos.findIndex(t => t && t.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newTodos = arrayMove(todos, oldIndex, newIndex);
        onUpdateTodos(selectedDate, newTodos);
      }
    }
  };

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;

    const newTodo: Todo = {
      id: Math.random().toString(36).substr(2, 9),
      text: newTodoText,
      completed: false,
      endTime: newTodoTime || undefined,
      percentageGoal: newTodoPercent ? parseFloat(newTodoPercent) : undefined,
      createdAt: Date.now()
    };

    onUpdateTodos(selectedDate, [...currentDayData.todos, newTodo]);
    setNewTodoText('');
    setNewTodoTime('');
    setNewTodoPercent('');
    setIsAdding(false);
  };

  const deleteTodo = (id: string) => {
    const newTodos = (currentDayData.todos || []).filter(t => t && t.id !== id);
    onUpdateTodos(selectedDate, newTodos);
  };

  const saveEdit = (id: string, text: string, time: string, percent: string, newDate: string) => {
    const todoToEdit = currentDayData.todos.find(t => t && t.id === id);
    if (!todoToEdit) return;

    const updatedTodo = {
      ...todoToEdit,
      text,
      endTime: time || undefined,
      percentageGoal: percent ? parseFloat(percent) : undefined
    };

    if (newDate !== selectedDate) {
      // Remove from current date
      const newCurrentTodos = currentDayData.todos.filter(t => t && t.id !== id);
      onUpdateTodos(selectedDate, newCurrentTodos);

      // Add to new date
      const targetDayData = dayTodos.find(d => d.date === newDate) || { date: newDate, todos: [] };
      onUpdateTodos(newDate, [...targetDayData.todos, updatedTodo]);
    } else {
      // Just update in current date
      const newTodos = currentDayData.todos.map(t => t && t.id === id ? updatedTodo : t);
      onUpdateTodos(selectedDate, newTodos);
    }
    setEditingId(null);
  };

  const activeTodo = useMemo(() =>
    currentDayData.todos.find(t => t && t.id === activeId),
    [currentDayData.todos, activeId]
  );

  const navigateWeek = (direction: 'prev' | 'next') => {
    const current = parseISO(selectedDate);
    const next = addDays(current, direction === 'prev' ? -7 : 7);
    setSelectedDate(format(next, 'yyyy-MM-dd'));
  };

  // ── Daily progress ───────────────────────────────────────────────────────
  const { totalTodos, completedTodos, progressPct } = useMemo(() => {
    const todos = currentDayData.todos || [];
    const total = todos.length;
    const done = todos.filter(t => t?.completed).length;
    return {
      totalTodos: total,
      completedTodos: done,
      progressPct: total === 0 ? 0 : done / total,
    };
  }, [currentDayData.todos]);

  // ── Streak score ─────────────────────────────────────────────────────────
  const streakScore = useMemo(() => {
    const today = new Date();

    // Count fully-completed days in last 7 days
    let last7Count = 0;
    for (let i = 0; i < 7; i++) {
      const d = format(subDays(today, i), 'yyyy-MM-dd');
      const entry = dayTodos.find(x => x.date === d);
      if (entry && isFullyComplete(entry.todos)) last7Count++;
    }

    // Count consecutive days ending today (or the last day that had tasks)
    let consecutive = 0;
    let cursor = 0;
    while (true) {
      const d = format(subDays(today, cursor), 'yyyy-MM-dd');
      const entry = dayTodos.find(x => x.date === d);
      if (entry && isFullyComplete(entry.todos)) {
        consecutive++;
        cursor++;
      } else {
        break;
      }
    }

    return Math.max(last7Count, consecutive);
  }, [dayTodos]);

  return (
    <div className="max-w-[1200px] mx-auto px-6 pt-4 flex gap-8 h-screen overflow-hidden">
      {/* Left side: Todo List */}
      <div className="flex-1 min-w-0 overflow-y-auto overflow-x-visible pr-2 pb-20 no-scrollbar">
        {/* Date Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {format(parseISO(selectedDate), 'MMMM yyyy')}
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-2 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => navigateWeek('next')}
                className="p-2 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="flex justify-between items-end border-b border-white/5 pb-4 px-1">
            {weekDays.map((day) => {
              const isSelected = isSameDay(day, parseISO(selectedDate));
              const isToday = isSameDay(day, new Date());
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(format(day, 'yyyy-MM-dd'))}
                  className="flex flex-col items-center gap-2 group"
                >
                  <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isSelected ? 'text-[var(--accent2)]' : 'text-white/20 group-hover:text-white/40'
                    }`}>
                    {format(day, 'EEE')}
                  </span>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold transition-all ${isSelected
                    ? 'bg-[var(--accent2)] text-black shadow-lg shadow-[var(--accent2)]/20 scale-110'
                    : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                    } ${isToday && !isSelected ? 'ring-2 ring-[var(--accent2)]/20' : ''}`}>
                    {format(day, 'd')}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <CompactDayTracker />

        {/* Todo List */}
        <div className="space-y-0">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={(currentDayData.todos || []).map(t => t?.id).filter(Boolean) as string[]}
              strategy={verticalListSortingStrategy}
            >
              {(currentDayData.todos || []).map((todo, index) => {
                if (!todo || !todo.id) return null;
                return (
                  <SortableTodoItem
                    key={todo.id}
                    todo={todo}
                    date={selectedDate}
                    onToggle={onToggleTodo}
                    onDelete={deleteTodo}
                    onEdit={(t) => setEditingId(t.id)}
                    isEditing={editingId === todo.id}
                    onCancelEdit={() => setEditingId(null)}
                    onSaveEdit={saveEdit}
                    onStartTracking={onStartTracking}
                    isActive={activeTodoId === todo.id}
                  />
                );
              })}
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeId && activeTodo ? (
                <TodoItem
                  todo={activeTodo}
                  date={selectedDate}
                  onToggle={() => { }}
                  onDelete={() => { }}
                  onEdit={() => { }}
                  isEditing={false}
                  onCancelEdit={() => { }}
                  onSaveEdit={() => { }}
                  onStartTracking={() => { }}
                  isActive={activeTodoId === activeTodo.id}
                />
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Add Todo Inline */}
          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-4 py-2 px-2 text-white/30 hover:text-white/60 transition-all group"
            >
              <Plus size={20} strokeWidth={2.5} />
              <span className="text-lg font-medium">Add a todo</span>
            </button>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleAddTodo}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddTodo(e as any);
                }
                if (e.key === 'Escape') setIsAdding(false);
              }}
              className="p-6 bg-[#1A1A1A] border border-[var(--accent2)]/30 rounded-3xl shadow-2xl space-y-4"
            >
              <input
                autoFocus
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--accent2)] transition-colors"
              />

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">End Time</label>
                  <input
                    type="text"
                    value={newTodoTime}
                    onChange={(e) => handleNewTimeChange(e.target.value)}
                    placeholder="e.g. 12:00"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-mono focus:outline-none focus:border-[var(--accent2)]"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Percentage</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={newTodoPercent}
                    onChange={(e) => handleNewPercentChange(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-mono focus:outline-none focus:border-[var(--accent2)]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[var(--accent2)] hover:opacity-90 text-black font-bold py-3 rounded-xl transition-all"
                >
                  Add Objective
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-6 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          )}

          {currentDayData.todos.length === 0 && !isAdding && (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-20">
              <CheckSquare className="w-16 h-16" />
              <p className="text-sm font-medium">Clear schedule for this day</p>
            </div>
          )}
        </div>

        {/* ── Bottom: Streak + Progress Bar ─────────────────────────────── */}
        <div className="mt-8 mb-4 py-2">
          <div className="flex items-center gap-4 overflow-visible">

            {/* Streak Badge */}
            <button
              onClick={() => setShowHeatmap(true)}
              className="flex-shrink-0 w-16 h-16 flex flex-col items-center justify-center gap-1 rounded-2xl cursor-pointer transition-all duration-200 hover:brightness-125 active:brightness-90"
              style={{
                background: streakScore > 0
                  ? 'linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(236,72,153,0.12) 100%)'
                  : 'rgba(255,255,255,0.04)',
                border: streakScore > 0
                  ? '1px solid rgba(168,85,247,0.35)'
                  : '1px solid rgba(255,255,255,0.07)',
                boxShadow: streakScore > 0 ? '0 0 20px rgba(168,85,247,0.12)' : 'none',
              }}
              title="Click to see heatmap"
            >
              <span
                className="text-3xl font-black tabular-nums leading-none"
                style={{
                  color: streakScore > 0 ? '#e9d5ff' : 'rgba(255,255,255,0.2)',
                }}
              >
                {streakScore}
              </span>
            </button>

            {/* Prismatic Progress Bar */}
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Today's Progress</span>
                <span className="text-[11px] font-bold tabular-nums" style={{
                  color: totalTodos === 0 ? 'rgba(255,255,255,0.2)' : '#a78bfa',
                }}>
                  {completedTodos}/{totalTodos}
                </span>
              </div>
              <div
                className="relative h-3 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                {/* Animated mesh gradient fill */}
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progressPct * 100}%` }}
                  transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
                  style={{
                    background: totalTodos === 0
                      ? 'rgba(255,255,255,0.08)'
                      : 'linear-gradient(90deg, #7c3aed 0%, #a855f7 20%, #ec4899 45%, #f97316 65%, #eab308 80%, #22d3ee 100%)',
                    backgroundSize: '200% 100%',
                    boxShadow: progressPct > 0
                      ? '0 0 16px rgba(168,85,247,0.5), 0 0 32px rgba(236,72,153,0.25)'
                      : 'none',
                  }}
                />
                {/* Shimmer overlay
                {progressPct > 0 && (
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full pointer-events-none"
                    animate={{ x: ['-100%', '400%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
                    style={{
                      width: '30%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                    }}
                  />
                )} */}
              </div>
              {/* Completion message */}
              {progressPct === 1 && totalTodos > 0 && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: '#c084fc' }}
                >
                  ✦ All tasks complete!
                </motion.p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right side: 1-Day Calendar */}
      <div className="w-[360px] flex-shrink-0 hidden lg:block h-full">
        <div className="h-full overflow-hidden flex flex-col">
          <CalendarView
            dayTodos={dayTodos}
            onUpdateTodos={onUpdateTodos}
            initialDate={selectedDate}
            initialDays={1}
            hideHeader={true}
            hideMiniCalendar={true}
          />
        </div>
      </div>

      {/* Heatmap Modal */}
      <AnimatePresence>
        {showHeatmap && (
          <StreakHeatmapModal
            dayTodos={dayTodos}
            onClose={() => setShowHeatmap(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
