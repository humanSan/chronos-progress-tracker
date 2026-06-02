import React from 'react';
import { motion } from 'motion/react';
import { XpStats } from '../utils/xpUtils';

interface XpProgressBarProps {
  stats: XpStats;
}

// Gold → magenta → violet, inspired by the reference gradient.
const GRADIENT =
  "linear-gradient(90deg, #ff723a 0%, #ffba44 100%)";
  // 'linear-gradient(90deg, #ffba44 0%, #F2541B 22%, #C91853 60%, #6A0487 100%)';
const GOLD = '#ffc24b';

// Exponential ease-out: snappy start, soft landing.
const EXPO_OUT: [number, number, number, number] = [0.1, 0, 0, 1];

export const XpProgressBar: React.FC<XpProgressBarProps> = ({ stats }) => {
  const { earned, target, potential, yesterday, bestThisWeek, percent, remaining, reachedTarget } = stats;

  let status: string;
  if (target === 0) {
    status = earned > 0 ? 'Ahead of yesterday' : 'Any XP beats yesterday';
  } else if (reachedTarget) {
    const over = earned - target;
    status = over > 0 ? `+${over} XP over yesterday` : 'Matched yesterday';
  } else {
    status = `${remaining} XP to beat yesterday`;
  }

  const pctLabel = `${Math.round(percent)}%`;

  return (
    <>
      {/* ── Bottom-left: XP info ─────────────────────────────────────────── */}
      <div className="fixed left-24 bottom-7 z-30 select-none pointer-events-none">
        <div className="relative flex items-end gap-3.5">
          {/* Gold glow that switches on when the target is beaten */}
          {/* <motion.div
            aria-hidden
            className="absolute -inset-x-6 -inset-y-4 rounded-full blur-2xl"
            style={{ background: `radial-gradient(60% 80% at 20% 60%, ${GOLD}, transparent 70%)` }}
            initial={false}
            animate={{ opacity: reachedTarget ? 0.22 : 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          /> */}

          <div className="relative flex items-baseline gap-1.5 leading-none">
            <motion.span
              key={earned}
              initial={{ opacity: 0.4, y: 4 }}
              animate={{
                opacity: 1,
                y: 0,
                color: reachedTarget ? GOLD : '#ffffff',
                // textShadow: reachedTarget ? `0 0 22px ${GOLD}66` : '0 0 0 transparent'
              }}
              transition={{ duration: 0.3, ease: EXPO_OUT }}
              className="text-6xl font-medium font-mono"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {earned}
            </motion.span>
            <span
              className="text-4xl font-medium font-mono text-white/40"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              
            </span>
          </div>

          <div className="relative flex flex-col gap-0.5 pb-1">
            <span
              className="text-[11px] font-bold uppercase tracking-[0.18em] transition-colors duration-300"
              style={{ color: reachedTarget ? GOLD : 'var(--accent1)' }}
            >
              {reachedTarget ? 'Target hit' : 'XP Today'}
            </span>
            <span className="text-xs font-semibold text-white/80 leading-tight">
              {status}
            </span>
            <span className="text-xs text-white/60 leading-tight">
              {potential} XP up for grabs · yesterday {yesterday} · best {bestThisWeek}
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom: full-width progress bar ──────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
        <div className="relative flex justify-center mb-1">
          <span
            className="text-[11px] font-bold tracking-wide text-white/45"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {pctLabel}
          </span>
        </div>

        <div className="relative h-2 w-full bg-white/6">
          {/* Soft blurred glow that follows the fill */}
          <motion.div
            className="absolute inset-y-0 left-0 blur-[6px] opacity-50"
            style={{ backgroundImage: GRADIENT }}
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.5, ease: EXPO_OUT }}
          />
          {/* Crisp fill on top */}
          <motion.div
            className="absolute inset-y-0 left-0"
            style={{
              backgroundImage: GRADIENT
            }}
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.5, ease: EXPO_OUT }}
          >
            {/* Bright leading edge */}
            {/* <div className="absolute right-0 inset-y-0 w-6" /> */}
          </motion.div>
        </div>
      </div>
    </>
  );
};
