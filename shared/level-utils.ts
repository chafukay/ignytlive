export const XP_REWARDS = {
  SEND_GIFT: 10,
  RECEIVE_GIFT: 5,
  STREAM_PER_MINUTE: 20,
  WATCH_STREAM_PER_MINUTE: 5,
  WIN_PK_BATTLE: 100,
  DAILY_LOGIN: 50,
  FOLLOW_USER: 5,
  GET_FOLLOWED: 10,
  SEND_MESSAGE: 2,
  FIRST_STREAM: 200,
  COMPLETE_PROFILE: 100,
  PURCHASE_ITEM: 15,
} as const;

export type XPAction = keyof typeof XP_REWARDS;

const BASE_XP = 100;
const GROWTH_RATE = 1.5;

export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(BASE_XP * Math.pow(GROWTH_RATE, level - 1));
}

export function getTotalXPForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += getXPForLevel(i + 1);
  }
  return total;
}

export function getLevelFromXP(xp: number): number {
  let level = 1;
  let totalXP = 0;
  
  while (true) {
    const xpForNextLevel = getXPForLevel(level + 1);
    if (totalXP + xpForNextLevel > xp) {
      break;
    }
    totalXP += xpForNextLevel;
    level++;
  }
  
  return level;
}

export function getXPProgress(xp: number): { 
  currentLevel: number; 
  currentXP: number; 
  xpForNextLevel: number; 
  xpInCurrentLevel: number;
  progressPercent: number;
} {
  const currentLevel = getLevelFromXP(xp);
  const totalXPForCurrentLevel = getTotalXPForLevel(currentLevel);
  const xpForNextLevel = getXPForLevel(currentLevel + 1);
  const xpInCurrentLevel = xp - totalXPForCurrentLevel;
  const progressPercent = Math.min(100, Math.floor((xpInCurrentLevel / xpForNextLevel) * 100));
  
  return {
    currentLevel,
    currentXP: xp,
    xpForNextLevel,
    xpInCurrentLevel,
    progressPercent,
  };
}

export function getXPToNextLevel(xp: number): number {
  const progress = getXPProgress(xp);
  return progress.xpForNextLevel - progress.xpInCurrentLevel;
}
