export type TrackerType = 'day' | 'week' | 'month' | 'year' | 'custom';

export interface Tracker {
  id: string;
  name: string;
  type: TrackerType;
  startDate?: string; // ISO string for custom
  endDate?: string;   // ISO string for custom
  color: string;      // Hex color
  precision: number;  // Number of decimal places
  createdAt: number;
}

export interface Theme {
  accent1: string; // Primary accent (e.g. #A3E635)
  accent2: string; // Secondary accent (e.g. #67E8F9)
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  timeGoal?: string; // e.g. "12:00"
  percentageGoal?: number; // e.g. 50
  createdAt: number;
  trackingStartedAt?: number; // Timestamp when tracking started
}

export interface DayTodos {
  date: string; // ISO date string (YYYY-MM-DD)
  todos: Todo[];
}

export interface ProgressData {
  percentage: number;
  timeLeft: string;
  label: string;
  subLabel: string;
}
