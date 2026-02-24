import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Clock, LayoutGrid, List, Maximize2, Minimize2, Palette } from 'lucide-react';
import { Tracker, Theme } from './types';
import { TrackerCard } from './components/TrackerCard';
import { AddTrackerModal } from './components/AddTrackerModal';
import { ThemeSettingsModal } from './components/ThemeSettingsModal';

const DEFAULT_TRACKERS: Tracker[] = [
  {
    id: 'day-default',
    name: 'Day',
    type: 'day',
    color: '#A3E635',
    precision: 2,
    createdAt: Date.now(),
  },
  {
    id: 'year-default',
    name: 'Year',
    type: 'year',
    color: '#67E8F9',
    precision: 3,
    createdAt: Date.now() + 1,
  }
];

export default function App() {
  const [trackers, setTrackers] = useState<Tracker[]>(() => {
    const saved = localStorage.getItem('chronos-trackers');
    return saved ? JSON.parse(saved) : DEFAULT_TRACKERS;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTracker, setEditingTracker] = useState<Tracker | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('chronos-theme');
    return saved ? JSON.parse(saved) : { accent1: '#A3E635', accent2: '#67E8F9' };
  });

  useEffect(() => {
    localStorage.setItem('chronos-theme', JSON.stringify(theme));
    document.documentElement.style.setProperty('--accent1', theme.accent1);
    document.documentElement.style.setProperty('--accent2', theme.accent2);
  }, [theme]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    localStorage.setItem('chronos-trackers', JSON.stringify(trackers));
  }, [trackers]);

  const handleAddTracker = (newTracker: Tracker) => {
    if (editingTracker) {
      setTrackers(trackers.map(t => t.id === newTracker.id ? newTracker : t));
    } else {
      setTrackers([...trackers, newTracker]);
    }
    setEditingTracker(null);
  };

  const handleDeleteTracker = (id: string) => {
    setTrackers(trackers.filter(t => t.id !== id));
  };

  const handleEditTracker = (tracker: Tracker) => {
    setEditingTracker(tracker);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-[var(--accent1)] selection:text-black">
      {/* Header */}
      <AnimatePresence>
        {!isFullscreen && (
          <motion.header 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="sticky top-0 z-40 bg-[#0A0A0A]/80 backdrop-blur-md border-bottom border-white/5"
          >
            <div className="max-w-5xl mx-auto px-6 py-8 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--accent1)] rounded-xl flex items-center justify-center text-black">
                  <Clock size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Chronos</h1>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Progress Dashboard</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden sm:flex bg-white/5 rounded-lg p-1">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-[var(--accent1)]' : 'text-white/40 hover:text-white'}`}
                  >
                    <LayoutGrid size={18} />
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white/10 text-[var(--accent1)]' : 'text-white/40 hover:text-white'}`}
                  >
                    <List size={18} />
                  </button>
                </div>
                
                <button
                  onClick={() => setIsThemeModalOpen(true)}
                  className="p-2.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl transition-all"
                  title="Theme Settings"
                >
                  <Palette size={18} />
                </button>

                <button
                  onClick={() => setIsFullscreen(true)}
                  className="p-2.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl transition-all"
                  title="Fullscreen Mode"
                >
                  <Maximize2 size={18} />
                </button>

                <button
                  onClick={() => {
                    setEditingTracker(null);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center gap-2 bg-[var(--accent1)] hover:opacity-90 text-black px-5 py-2.5 rounded-xl font-bold text-sm transition-all transform active:scale-95 shadow-lg shadow-[var(--accent1)]/10"
                >
                  <Plus size={18} strokeWidth={3} />
                  <span>Add Widget</span>
                </button>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Exit Fullscreen Button */}
      <AnimatePresence>
        {isFullscreen && (
          <div className="fixed bottom-0 right-0 z-50 w-40 h-40 flex items-end justify-end p-8 group">
            <button
              className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-xl text-white/40 hover:text-white rounded-full shadow-2xl border border-white/10 transition-all opacity-0 group-hover:opacity-100"
              onClick={() => setIsFullscreen(false)}
              title="Exit Fullscreen"
            >
              <Minimize2 size={18} />
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={`max-w-5xl mx-auto px-6 ${isFullscreen ? 'pt-4 pb-12' : 'py-12'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode + (isFullscreen ? 'fs' : 'normal')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'flex flex-col gap-6'}
          >
            <AnimatePresence>
              {trackers.map((tracker) => (
                <TrackerCard
                  key={tracker.id}
                  tracker={tracker}
                  onDelete={handleDeleteTracker}
                  onEdit={handleEditTracker}
                />
              ))}
            </AnimatePresence>

            {trackers.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="col-span-full py-32 flex flex-col items-center justify-center text-center space-y-4"
              >
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-white/20">
                  <Clock size={40} />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-white/60">No trackers yet</h2>
                  <p className="text-white/30 text-sm">Create your first progress widget to get started.</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <AddTrackerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTracker(null);
        }}
        onAdd={handleAddTracker}
        editingTracker={editingTracker}
      />

      <ThemeSettingsModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        theme={theme}
        onUpdate={setTheme}
      />

      {/* Footer Decoration */}
      <AnimatePresence>
        {!isFullscreen && (
          <motion.footer 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-12 text-center"
          >
            <p className="text-[10px] font-bold text-white/10 uppercase tracking-[0.5em]">Time is a flat circle</p>
          </motion.footer>
        )}
      </AnimatePresence>
    </div>
  );
}
