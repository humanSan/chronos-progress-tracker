import { 
  startOfDay, endOfDay, 
  startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, 
  startOfYear, endOfYear,
  differenceInSeconds,
  format,
  isAfter,
  isBefore
} from 'date-fns';
import { Tracker, ProgressData } from '../types';

export function calculateProgress(tracker: Tracker, now: Date = new Date()): ProgressData {
  let start: Date;
  let end: Date;
  let label = tracker.name;
  let subLabel = '';

  switch (tracker.type) {
    case 'day':
      start = startOfDay(now);
      end = endOfDay(now);
      subLabel = format(now, 'EEEE, MMM do');
      break;
    case 'week':
      start = startOfWeek(now);
      end = endOfWeek(now);
      subLabel = `${format(start, 'MMM d')} — ${format(end, 'MMM d')}`;
      break;
    case 'month':
      start = startOfMonth(now);
      end = endOfMonth(now);
      subLabel = format(now, 'MMMM yyyy');
      break;
    case 'year':
      start = startOfYear(now);
      end = endOfYear(now);
      subLabel = format(now, 'yyyy');
      break;
    case 'custom':
      start = tracker.startDate ? new Date(tracker.startDate) : startOfDay(now);
      end = tracker.endDate ? new Date(tracker.endDate) : endOfDay(now);
      subLabel = `${format(start, 'MMM d, yyyy')} — ${format(end, 'MMM d, yyyy')}`;
      break;
    default:
      start = startOfDay(now);
      end = endOfDay(now);
  }

  const totalSeconds = differenceInSeconds(end, start);
  const elapsedSeconds = differenceInSeconds(now, start);
  
  let percentage = (elapsedSeconds / totalSeconds) * 100;
  percentage = Math.max(0, Math.min(100, percentage));

  const remainingSeconds = differenceInSeconds(end, now);
  let timeLeft = '';

  if (remainingSeconds <= 0) {
    timeLeft = 'Completed';
  } else if (remainingSeconds < 60) {
    timeLeft = `${remainingSeconds}s left`;
  } else if (remainingSeconds < 3600) {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    timeLeft = `${mins}m ${secs}s left`;
  } else if (remainingSeconds < 86400) {
    const hours = Math.floor(remainingSeconds / 3600);
    const mins = Math.floor((remainingSeconds % 3600) / 60);
    const secs = remainingSeconds % 60;
    timeLeft = `${hours}h ${mins}m ${secs}s left`;
  } else {
    const days = Math.floor(remainingSeconds / 86400);
    timeLeft = `${days}d left`;
  }

  return {
    percentage,
    timeLeft,
    label,
    subLabel
  };
}

export function getOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
