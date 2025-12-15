import { Rank, Quest } from './types';

export const RANK_THRESHOLDS = {
  [Rank.E]: 0,
  [Rank.D]: 500,
  [Rank.C]: 1500,
  [Rank.B]: 3500,
  [Rank.A]: 7500,
  [Rank.S]: 15000,
};

export const BASE_XP_REWARD = 50;

// Base configuration for daily quests. 
// Multipliers will be applied based on Rank.
export const BASE_QUESTS: Omit<Quest, 'current' | 'completed' | 'difficultyMultiplier' | 'xpReward'>[] = [
  {
    id: 'q_run',
    title: 'DUNGEON RUN',
    description: 'Maintain pace to escape the dungeon.',
    type: 'running',
    target: 10, // Minutes
    unit: 'minutes',
  },
  {
    id: 'q_push',
    title: 'STRENGTH: PUSH',
    description: 'Upper body power generation.',
    type: 'strength',
    target: 20,
    unit: 'reps',
  },
  {
    id: 'q_squat',
    title: 'STRENGTH: LEGS',
    description: 'Lower body foundation.',
    type: 'strength',
    target: 20,
    unit: 'reps',
  },
  {
    id: 'q_core',
    title: 'CORE STABILITY',
    description: 'Endurance check.',
    type: 'strength',
    target: 30,
    unit: 'seconds',
  },
  {
    id: 'q_shadow',
    title: 'SHADOW TRAINING',
    description: 'High intensity burst. Optional.',
    type: 'shadow',
    target: 15,
    unit: 'reps',
  }
];

export const RANK_MULTIPLIERS = {
  [Rank.E]: 1.0,
  [Rank.D]: 1.2,
  [Rank.C]: 1.5,
  [Rank.B]: 2.0,
  [Rank.A]: 3.0,
  [Rank.S]: 5.0,
};
