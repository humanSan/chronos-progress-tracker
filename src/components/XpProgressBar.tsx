import React, { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { XpStats } from '../utils/xpUtils';

interface XpProgressBarProps {
  stats: XpStats;
}

const GOLD = '#ffc24b';
const VIOLET = '#a78bfa';

// Exponential ease-out: snappy start, soft landing.
const EXPO_OUT: [number, number, number, number] = [0.1, 0, 0, 1];

export const XpProgressBar: React.FC<XpProgressBarProps> = ({ stats }) => {
  const {
    earned,
    target,
    upForGrabs,
    yesterday,
    bestLast7Days,
    bestAllTime,
    totalAllTime,
    percent,
    remaining,
    reachedTarget,
    reachedWeekBest,
    reachedAllTimeBest
  } = stats;

  // Tiered, progressive goals: beat yesterday → beat the 7-day best → beat the
  // all-time best. The "lit" colour tracks how far you've climbed.
  const lit = reachedWeekBest ? VIOLET : reachedTarget ? GOLD : null;

  let status: string;
  if (!reachedTarget) {
    status = target === 0 ? 'Any XP beats yesterday' : `${remaining} XP to beat yesterday`;
  } else if (!reachedWeekBest) {
    // Yesterday cleared (gold). Point at the next goal: the 7-day best.
    status = `Ahead of yesterday ⬩ ${bestLast7Days - earned} XP to 7-day best`;
  } else if (!reachedAllTimeBest) {
    // 7-day best cleared (violet). Point at the all-time best.
    status = `${bestAllTime - earned} XP to beat all-time best`;
  } else {
    const over = earned - bestAllTime;
    status = over > 0 ? `New all-time best ⬩ +${over} XP` : 'All-time best matched';
  }

  const pctLabel = `${Math.round(percent)}%`;
  const barColor = reachedWeekBest ? VIOLET : "#ff723a"; //#ff774d coral maybe

  // Count-up: smoothly tick the displayed number toward the real earned total.
  const count = useMotionValue(earned);
  const display = useTransform(count, v => Math.round(v));
  useEffect(() => {
    const controls = animate(count, earned, { duration: 0.6, ease: EXPO_OUT });
    return () => controls.stop();
  }, [count, earned]);

  return (
    <>
      {/* ── Bottom-left: XP info ─────────────────────────────────────────── */}
      <div className="fixed left-24 bottom-7 z-30 select-none pointer-events-none font-mono">
        {/* The whole text block glows in the goal colour once a target is hit —
            a text-shadow on the text itself, no background and no box-shadow. */}
        <div
          className="relative flex items-end gap-3.5 transition-all duration-300"
          style={{
            textShadow: lit ? `0 0 18px ${lit}66, 0 0 6px ${lit}40` : 'none'
          }}
        >
          <div className="relative flex items-baseline gap-1.5 leading-none">
            <motion.span
              animate={{ color: lit ?? '#ffffff' }}
              transition={{ duration: 0.3, ease: EXPO_OUT }}
              className="text-7xl font-medium"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {display}
            </motion.span>
          </div>

          <div className="relative flex flex-col gap-1 pb-2">
            {/* Status — the header. Accent by default; lights up gold, then violet. */}
            <span
              className="text-sm font-medium leading-tight tracking-wide transition-colors duration-300"
              style={{ color: lit ?? 'var(--accent1)' }}
            >
              {status}
            </span>

            {/* Today: still available ⬩ yesterday */}
            <span className="text-[12px] font-medium leading-tight">
              <span className='text-white/85'>
              <span className="">{upForGrabs}</span> up for grabs ⬩ 
              <span className=""> {yesterday}</span> yesterday</span>
              {/* <span className="text-white/95">{upForGrabs}</span>
              <span className="text-white/60"> up for grabs</span>
              <span className="text-white/30"> ⬩ </span>
              <span className="text-white/95">{yesterday}</span>
              <span className="text-white/60"> yesterday</span> */}
            </span>

            {/* Records: best 7d ⬩ best all time ⬩ total all time */}
            <span className="text-[12px] leading-tight">
              <span className='text-white/70'>
              <span className=""> {bestLast7Days} </span> best 7d ⬩
              <span className=""> {bestAllTime} </span> best all-time ⬩
              <span className=""> {totalAllTime} </span> total
              </span>
              {/* <span className="text-white/85">{bestLast7Days}</span>
              <span className="text-white/55"> best 7d</span>
              <span className="text-white/30"> ⬩ </span>
              <span className="text-white/85">{bestAllTime}</span>
              <span className="text-white/55"> best all-time</span>
              <span className="text-white/30"> ⬩ </span>
              <span className="text-white/85">{totalAllTime}</span>
              <span className="text-white/55"> total</span> */}
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom: full-width progress bar ──────────────────────────────── */}
      <div className="fixed bottom-0 left-20 right-0 z-30 pointer-events-none">
        <div className="relative flex justify-center mb-1">
          <span
            className="text-[12px] tracking-wide text-white/60 font-mono"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {pctLabel}
          </span>
        </div>

        <div className="relative h-2 w-full bg-white/10">
          {/* Soft blurred glow that follows the fill */}
          <motion.div
            className="absolute inset-y-0 left-0 blur-lg opacity-90"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%`, backgroundColor: barColor }}
            transition={{ duration: 0.5, ease: EXPO_OUT }}
          />
          {/* Crisp solid fill on top */}
          <motion.div
            className="absolute inset-y-0 left-0"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%`, backgroundColor: barColor }}
            transition={{ duration: 0.5, ease: EXPO_OUT }}
          />
        </div>
      </div>
    </>
  );
};
