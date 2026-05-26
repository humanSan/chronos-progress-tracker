import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

type AuthMode = 'login' | 'signup';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthenticated }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode('login');
      setEmail('');
      setUsername('');
      setPassword('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO(neon-auth): replace with real Neon Auth call.
    //   login:  signInWithCredentials({ username, password })
    //   signup: signUp({ email, username, password })
    console.log('[auth stub]', mode, { email, username, password });
    onAuthenticated();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-2xl bg-[#1A1A1A] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex"
          >
            {/* Splash pane */}
            <div
              className="hidden md:flex flex-1 flex-col items-center justify-center p-10 text-black relative"
              style={{
                background: 'linear-gradient(135deg, var(--accent1) 0%, var(--accent2) 100%)',
              }}
            >
              <div className="w-20 h-20 rounded-3xl bg-black/10 flex items-center justify-center mb-6">
                <Clock size={56} strokeWidth={2.5} />
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-2">Dunzo</h2>
              <p className="text-[11px] font-bold opacity-60 text-center">
                Where stuff gets done.
              </p>
            </div>

            {/* Form pane */}
            <div className="flex-1 p-8 relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all"
                title="Close"
              >
                <X size={16} />
              </button>

              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-1">
                  {mode === 'login' ? 'Welcome back' : 'Create account'}
                </h3>
                <p className="text-xs text-white/40">
                  {mode === 'login' ? 'Log in to sync your progress.' : 'Sign up to start tracking.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-neutral-900/50 p-1 rounded-2xl border border-white/5 mb-6">
                {(['login', 'signup'] as const).map((m) => {
                  const label = m === 'login' ? 'Log In' : 'Sign Up';
                  const isActive = mode === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all relative ${isActive
                        ? 'bg-[var(--accent2)] text-black shadow-lg shadow-[var(--accent2)]/10'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[var(--accent1)] transition-colors"
                      placeholder="you@example.com"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[var(--accent1)] transition-colors"
                    placeholder="your_handle"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[var(--accent1)] transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[var(--accent1)] hover:opacity-90 text-black font-bold py-3.5 rounded-2xl transition-all transform active:scale-[0.98] mt-2"
                >
                  {mode === 'login' ? 'Log In' : 'Create Account'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
