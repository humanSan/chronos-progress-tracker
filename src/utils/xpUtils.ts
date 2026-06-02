import {
  format,
  parseISO,
  subDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval
} from 'date-fns';
import { DayTodos } from '../types';

export interface XpStats {
  earned: number;        // XP from completed todos on the given date
  potential: number;     // XP from every todo on the given date (done + not)
  target: number;        // XP to beat — strictly yesterday's earned XP
  yesterday: number;     // XP earned the day before the given date (same as target)
  bestThisWeek: number;  // highest single-day earned XP across the date's week
  percent: number;       // earned / target, clamped to 0..100 for the bar fill
  remaining: number;     // max(0, target - earned)
  reachedTarget: boolean;
}

const dayKey = (d: Date) => format(d, 'yyyy-MM-dd');

/** Sum of XP across completed todos on a given date. */
export function getEarnedXp(dayTodos: DayTodos[], date: string): number {
  const day = dayTodos.find(d => d.date === date);
  if (!day) return 0;
  return (day.todos || []).reduce(
    (sum, t) => sum + (t && t.completed && t.xp ? t.xp : 0),
    0
  );
}

/** Sum of XP across all todos on a given date, regardless of completion. */
export function getPotentialXp(dayTodos: DayTodos[], date: string): number {
  const day = dayTodos.find(d => d.date === date);
  if (!day) return 0;
  return (day.todos || []).reduce((sum, t) => sum + (t && t.xp ? t.xp : 0), 0);
}

/**
 * Compute the day's XP picture for the gamification UI. The goal is singular:
 * beat yesterday's earned XP. The target is strictly yesterday's total — if
 * nothing was earned yesterday, the target is 0 and any XP today clears it.
 * Today's available XP and the week's best are exposed only as auxiliary
 * context, so the focus stays on improving over yesterday rather than on
 * completing a fixed checklist.
 */
export function computeXpStats(
  dayTodos: DayTodos[],
  date: string,
  weekStartsOn: number
): XpStats {
  const parsed = parseISO(date);
  const earned = getEarnedXp(dayTodos, date);
  const potential = getPotentialXp(dayTodos, date);
  const yesterday = getEarnedXp(dayTodos, dayKey(subDays(parsed, 1)));
  const target = yesterday;

  const wso = weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const weekDays = eachDayOfInterval({
    start: startOfWeek(parsed, { weekStartsOn: wso }),
    end: endOfWeek(parsed, { weekStartsOn: wso })
  });
  const bestThisWeek = weekDays.reduce(
    (max, d) => Math.max(max, getEarnedXp(dayTodos, dayKey(d))),
    0
  );

  const percent =
    target > 0 ? Math.min(100, (earned / target) * 100) : earned > 0 ? 100 : 0;
  const remaining = Math.max(0, target - earned);

  return {
    earned,
    potential,
    target,
    yesterday,
    bestThisWeek,
    percent,
    remaining,
    // Must actually earn something — a 0/0 day hasn't "hit" anything.
    reachedTarget: earned > 0 && earned >= target
  };
}
