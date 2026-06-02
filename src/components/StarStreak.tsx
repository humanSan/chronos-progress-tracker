import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star } from 'lucide-react';
import { DayTodos } from '../types';
import { computeStarStreak } from '../utils/xpUtils';

interface StarStreakProps {
  dayTodos: DayTodos[];
  date: string;
}

const GOLD = '#ffc24b';
// A deliberately varied palette so an earned star feels colourful, not flat.
const PARTICLE_COLORS = ['#ffc24b', '#ff8a3d', '#ff5d8f', '#a78bfa', '#7dd3fc', '#ffffff'];

// Snappy-then-soft, used for the celebratory pops.
const POP: [number, number, number, number] = [0.2, 0.9, 0.2, 1];

// ── A short colourful particle burst + ring, centred on a freshly-lit star ──
const Burst: React.FC = () => {
  const parts = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const ang = (i / 10) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 14 + Math.random() * 16;
        return {
          x: Math.cos(ang) * dist,
          y: Math.sin(ang) * dist,
          c: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
          s: 3 + Math.random() * 2.5
        };
      }),
    []
  );
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.span
        className="absolute rounded-full border-2"
        style={{ borderColor: GOLD }}
        initial={{ width: 6, height: 6, opacity: 0.9 }}
        animate={{ width: 42, height: 42, opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      {parts.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{ width: p.s, height: p.s, backgroundColor: p.c, boxShadow: `0 0 6px ${p.c}` }}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={{ x: p.x, y: p.y, scale: 0, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
};

const StarIcon: React.FC<{ active: boolean; burst: boolean }> = ({ active, burst }) => (
  <div className="relative">
    <motion.div
      animate={burst ? { scale: [0.5, 1.4, 1], rotate: [-20, 12, 0] } : { scale: 1, rotate: 0 }}
      transition={burst ? { duration: 0.55, ease: POP } : { duration: 0.3, ease: 'easeOut' }}
      style={{
        color: active ? GOLD : 'rgba(255,255,255,0.18)',
        filter: active ? `drop-shadow(0 0 5px ${GOLD}cc)` : 'none'
      }}
    >
      <Star size={26} strokeWidth={2.25} fill={active ? GOLD : 'transparent'} />
    </motion.div>
    <AnimatePresence>{burst && <Burst />}</AnimatePresence>
  </div>
);

export const StarStreak: React.FC<StarStreakProps> = ({ dayTodos, date }) => {
  const { stars, streak } = useMemo(() => computeStarStreak(dayTodos, date), [dayTodos, date]);

  // Fire animations only on a genuine increase — never on first mount or when
  // the viewed date changes (navigating between days shouldn't celebrate).
  const prevStars = useRef(stars);
  const prevStreak = useRef(streak);
  const prevDate = useRef(date);
  const [bursting, setBursting] = useState<number[]>([]);
  const [streakPulse, setStreakPulse] = useState(0);

  useEffect(() => {
    if (prevDate.current !== date) {
      prevDate.current = date;
      prevStars.current = stars;
      prevStreak.current = streak;
      return;
    }
    if (stars > prevStars.current) {
      const newly: number[] = [];
      for (let i = prevStars.current; i < stars; i++) newly.push(i);
      setBursting(b => [...b, ...newly]);
      newly.forEach(i =>
        setTimeout(() => setBursting(b => b.filter(x => x !== i)), 750)
      );
    }
    if (streak > prevStreak.current) {
      setStreakPulse(p => p + 1);
    }
    prevStars.current = stars;
    prevStreak.current = streak;
  }, [stars, streak, date]);

  const pulsing = streakPulse > 0;
  useEffect(() => {
    if (!pulsing) return;
    const t = setTimeout(() => setStreakPulse(0), 900);
    return () => clearTimeout(t);
  }, [streakPulse, pulsing]);

  // At 3★ the streak badge inverts: solid gold fill with black digits.
  const maxed = stars >= 3;

  return (
    <div className="fixed right-6 bottom-7 z-30 pointer-events-none select-none font-mono">
      {/* pr matches py so the badge has equal gap to the right edge as top/bottom. */}
      <motion.div
        className="relative flex items-center gap-3 rounded-full border-2 pl-5 pr-2 py-2"
        style={{ borderColor: GOLD, backgroundColor: 'rgba(20,16,8,0.85)' }}
        animate={{
          boxShadow: pulsing
            ? `0 0 26px ${GOLD}aa, inset 0 0 14px ${GOLD}55`
            : `0 0 0px ${GOLD}00, inset 0 0 0px ${GOLD}00`
        }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="flex items-center gap-2">
          {[0, 1, 2].map(i => (
            <StarIcon key={i} active={i < stars} burst={bursting.includes(i)} />
          ))}
        </div>

        {/* Streak badge */}
        <div className="relative flex items-center justify-center">
          <AnimatePresence>
            {pulsing && (
              <motion.span
                key={streakPulse}
                className="absolute rounded-full border-2"
                style={{ borderColor: GOLD }}
                initial={{ width: 44, height: 44, opacity: 0.85 }}
                animate={{ width: 78, height: 78, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            )}
          </AnimatePresence>
          <motion.div
            className="relative flex items-center justify-center w-12 h-12 rounded-full"
            animate={{
              backgroundColor: maxed ? GOLD : 'rgba(255,194,75,0.14)',
              scale: pulsing ? [1, 1.28, 0.94, 1] : 1,
              boxShadow: pulsing ? `0 0 18px ${GOLD}` : `0 0 0px ${GOLD}00`
            }}
            transition={{
              backgroundColor: { duration: 0.3 },
              boxShadow: { duration: 0.6, ease: 'easeOut' },
              scale: { duration: 0.55, ease: POP }
            }}
          >
            <motion.span
              key={streak}
              className="text-xl font-bold leading-none"
              style={{ fontVariantNumeric: 'tabular-nums' }}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, color: maxed ? '#000000' : GOLD }}
              transition={{ scale: { duration: 0.4, ease: POP }, color: { duration: 0.25 } }}
            >
              {streak}
            </motion.span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
