export enum Rank {
  E = 'E',
  D = 'D',
  C = 'C',
  B = 'B',
  A = 'A',
  S = 'S'
}

export type QuestType = 'strength' | 'running' | 'shadow';

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  target: number;
  unit: 'reps' | 'seconds' | 'minutes';
  current: number;
  completed: boolean;
  xpReward: number;
  difficultyMultiplier: number; // Increases with Rank
}

export interface PlayerStats {
  rank: Rank;
  xp: number;
  level: number;
  streak: number; // Survival Days
  lastLogin: string; // ISO Date
  totalWorkouts: number;
  history: WorkoutRecord[];
}

export interface WorkoutRecord {
  date: string;
  xpGained: number;
  mood: 'great' | 'good' | 'neutral' | 'exhausted';
  questsCompleted: number;
}

export interface SystemState {
  view: 'BOOT' | 'HOME' | 'TRAINING' | 'SUMMARY' | 'PENALTY';
  activeQuestId: string | null;
  dailyQuests: Quest[];
  dailyMessage: string;
}
