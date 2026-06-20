import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { X, Clock, Upload, Download, LogOut } from 'lucide-react';
import { authClient } from '../auth';
import { buildBackup, parseBackup, mergeImportToDb } from '../data/import';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  onAuthenticated: () => void;
  onLogout: () => void;
}

type AuthMode = 'login' | 'signup';

const inputClass =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--accent1)] transition-colors';
const labelClass =
  'block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5';

// ─── Signed-out view ─────────────────────────────────────────────────────────

const SignedOutPane: React.FC<{
  onClose: () => void;
  onAuthenticated: () => void;
}> = ({ onClose, onAuthenticated }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { error } =
        mode === 'login'
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ email, password, name: username });
      if (error) throw new Error(error.message || 'Authentication failed');
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col max-h-[90vh]">
      {/* Header */}
      <div className="flex items-start justify-between px-8 pt-7 pb-4 shrink-0">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h3>
          <p className="text-xs text-white/40">
            {mode === 'login' ? 'Log in to sync your progress.' : 'Sign up to start tracking.'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto px-8 pb-7 space-y-4">
        {/* Toggle */}
        <div className="grid grid-cols-2 gap-2 bg-black/20 p-1 rounded-2xl border border-white/5">
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                mode === m
                  ? 'bg-[var(--accent2)] text-black shadow-lg shadow-[var(--accent2)]/10'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {m === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>
          {mode === 'signup' && (
            <div>
              <label className={labelClass}>Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass}
                placeholder="your_handle"
              />
            </div>
          )}
          <div>
            <label className={labelClass}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[var(--accent1)] hover:opacity-90 text-black font-bold py-2.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting
              ? 'Please wait…'
              : mode === 'login'
              ? 'Log In'
              : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Signed-in view ──────────────────────────────────────────────────────────

const SignedInPane: React.FC<{
  onClose: () => void;
  onLogout: () => void;
}> = ({ onClose, onLogout }) => {
  const [email, setEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const [busy, setBusy] = useState<null | 'export' | 'import'>(null);
  const [dataMsg, setDataMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const handleEmailSave = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO(neon-auth): update email via Neon Auth
    console.log('[auth stub] update email', { email });
  };

  const handlePasswordSave = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO(neon-auth): update password via Neon Auth
    console.log('[auth stub] update password', { oldPassword, newPassword, confirmPassword });
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // Export the account's current DB state (todos/trackers/workspaces/settings).
  const handleExport = async () => {
    setDataMsg(null);
    setBusy('export');
    try {
      const backup = await buildBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dunzo-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[export] failed', err);
      setDataMsg({ kind: 'err', text: 'Export failed. Please try again.' });
    } finally {
      setBusy(null);
    }
  };

  // Import = merge into the DB by id (add new, overwrite conflicts, leave the rest).
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file
    if (!file) return;
    setDataMsg(null);
    setBusy('import');
    try {
      const backup = parseBackup(await file.text());
      await mergeImportToDb(backup);
      await qc.invalidateQueries(); // refetch everything from the DB
      setDataMsg({ kind: 'ok', text: 'Import complete — your data has been merged.' });
    } catch (err) {
      console.error('[import] failed', err);
      setDataMsg({ kind: 'err', text: 'Import failed — check that the file is a valid backup.' });
    } finally {
      setBusy(null);
    }
  };

  const sectionLabel = (text: string) => (
    <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-3">{text}</p>
  );

  return (
    <div className="flex-1 flex flex-col max-h-[90vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-7 pb-4 shrink-0">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Your Account</h3>
          <p className="text-xs text-white/40">Manage your profile and data.</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto px-8 pb-7 space-y-6">

        {/* Change email */}
        <div>
          {sectionLabel('Email')}
          <form onSubmit={handleEmailSave} className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="new@email.com"
            />
            <button
              type="submit"
              className="w-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white font-bold py-2.5 rounded-xl text-sm transition-all"
            >
              Update Email
            </button>
          </form>
        </div>

        {/* Change password */}
        <div className="border-t border-white/5 pt-5">
          {sectionLabel('Change Password')}
          <form onSubmit={handlePasswordSave} className="space-y-2">
            <div>
              <label className={labelClass}>Current Password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className={labelClass}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className={labelClass}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white font-bold py-2.5 rounded-xl text-sm transition-all mt-1"
            >
              Update Password
            </button>
          </form>
        </div>

        {/* Import / Export */}
        <div className="border-t border-white/5 pt-5">
          {sectionLabel('Data')}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={busy !== null}
              className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={15} />
              {busy === 'export' ? 'Exporting…' : 'Export'}
            </button>
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              disabled={busy !== null}
              className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload size={15} />
              {busy === 'import' ? 'Importing…' : 'Import'}
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
          {dataMsg && (
            <p className={`text-[10px] mt-2 ${dataMsg.kind === 'ok' ? 'text-green-400/80' : 'text-red-400/80'}`}>
              {dataMsg.text}
            </p>
          )}
          <p className="text-[10px] text-white/25 mt-2">
            Export downloads your tasks, trackers, workspaces, and settings. Import
            merges them back in by id — new items are added, matching items are
            overwritten, and anything not in the file is left untouched.
          </p>
        </div>

        {/* Log out */}
        <div className="border-t border-white/5 pt-5">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-bold py-2.5 rounded-xl text-sm transition-all"
          >
            <LogOut size={15} />
            Log Out
          </button>
        </div>

      </div>
    </div>
  );
};

// ─── Modal shell ─────────────────────────────────────────────────────────────

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  isAuthenticated,
  onAuthenticated,
  onLogout,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-2xl bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex max-h-[90vh]"
          >
            {/* Splash pane */}
            <div
              className="hidden md:flex w-52 shrink-0 flex-col items-center justify-center p-8 text-black"
              style={{ background: 'linear-gradient(135deg, var(--accent1) 0%, var(--accent2) 100%)' }}
            >
              <div className="w-16 h-16 rounded-2xl bg-black/10 flex items-center justify-center mb-5">
                <Clock size={44} strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-1">Dunzo</h2>
              <p className="text-[10px] font-bold opacity-60 text-center">Where stuff gets done.</p>
            </div>

            {/* Dynamic right pane */}
            {isAuthenticated ? (
              <SignedInPane onClose={onClose} onLogout={onLogout} />
            ) : (
              <SignedOutPane onClose={onClose} onAuthenticated={onAuthenticated} />
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
