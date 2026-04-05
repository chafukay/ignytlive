import { db } from "./db";
import { users, notifications } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { XP_REWARDS, XPAction, getLevelFromXP } from "@shared/level-utils";
import { checkAchievements } from "./achievement-service";

export interface XPResult {
  xpAwarded: number;
  newTotalXP: number;
  previousLevel: number;
  newLevel: number;
  leveledUp: boolean;
}

export async function awardXP(userId: string, action: XPAction, multiplier: number = 1): Promise<XPResult> {
  const xpAmount = XP_REWARDS[action] * multiplier;
  
  const [user] = await db
    .select({ xp: users.xp, level: users.level })
    .from(users)
    .where(eq(users.id, userId));
  
  if (!user) {
    throw new Error("User not found");
  }
  
  const previousLevel = user.level;
  const newTotalXP = user.xp + xpAmount;
  const newLevel = getLevelFromXP(newTotalXP);
  const leveledUp = newLevel > previousLevel;
  
  await db
    .update(users)
    .set({
      xp: newTotalXP,
      level: newLevel,
    })
    .where(eq(users.id, userId));
  
  if (leveledUp) {
    db.insert(notifications).values({
      userId,
      type: "system",
      title: "Level Up! 🎉",
      message: `Congratulations! You've reached Level ${newLevel}!`,
      isRead: false,
    }).catch(() => {});
    checkAchievements(userId, "level").catch(() => {});
  }

  return {
    xpAwarded: xpAmount,
    newTotalXP,
    previousLevel,
    newLevel,
    leveledUp,
  };
}

const DAILY_REWARDS = [
  { day: 1, coins: 50, xpMultiplier: 1, emoji: "🎁" },
  { day: 2, coins: 75, xpMultiplier: 1, emoji: "💰" },
  { day: 3, coins: 100, xpMultiplier: 1.5, emoji: "🔥" },
  { day: 4, coins: 150, xpMultiplier: 1.5, emoji: "⭐" },
  { day: 5, coins: 200, xpMultiplier: 2, emoji: "💎" },
  { day: 6, coins: 300, xpMultiplier: 2, emoji: "👑" },
  { day: 7, coins: 500, xpMultiplier: 3, emoji: "🏆" },
];

export { DAILY_REWARDS };

export interface DailyLoginResult {
  eligible: boolean;
  streak?: number;
  day?: number;
  coinsAwarded?: number;
  xpAwarded?: number;
  newTotalXP?: number;
  newCoinBalance?: number;
  rewards?: typeof DAILY_REWARDS;
}

export async function checkDailyLoginBonus(userId: string): Promise<DailyLoginResult> {
  const [user] = await db
    .select({ 
      lastDailyLoginBonus: users.lastDailyLoginBonus, 
      xp: users.xp,
      coins: users.coins,
      dailyLoginStreak: users.dailyLoginStreak,
    })
    .from(users)
    .where(eq(users.id, userId));
  
  if (!user) {
    return { eligible: false };
  }
  
  const now = new Date();
  const lastBonus = user.lastDailyLoginBonus;
  
  if (lastBonus) {
    const lastBonusDate = new Date(lastBonus);
    const isSameDay = 
      lastBonusDate.getUTCFullYear() === now.getUTCFullYear() &&
      lastBonusDate.getUTCMonth() === now.getUTCMonth() &&
      lastBonusDate.getUTCDate() === now.getUTCDate();
    
    if (isSameDay) {
      return { 
        eligible: false, 
        streak: user.dailyLoginStreak, 
        day: user.dailyLoginStreak,
        rewards: DAILY_REWARDS,
      };
    }
  }
  
  let newStreak = 1;
  if (lastBonus) {
    const lastBonusDate = new Date(lastBonus);
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const wasYesterday = 
      lastBonusDate.getUTCFullYear() === yesterday.getUTCFullYear() &&
      lastBonusDate.getUTCMonth() === yesterday.getUTCMonth() &&
      lastBonusDate.getUTCDate() === yesterday.getUTCDate();
    
    if (wasYesterday) {
      newStreak = (user.dailyLoginStreak % 7) + 1;
    }
  }

  const dayReward = DAILY_REWARDS[newStreak - 1];
  const result = await awardXP(userId, "DAILY_LOGIN", dayReward.xpMultiplier);
  
  const [updatedUser] = await db
    .update(users)
    .set({ 
      lastDailyLoginBonus: now,
      dailyLoginStreak: newStreak,
      coins: sql`${users.coins} + ${dayReward.coins}`,
    })
    .where(eq(users.id, userId))
    .returning({ coins: users.coins });
  
  return {
    eligible: true,
    streak: newStreak,
    day: newStreak,
    coinsAwarded: dayReward.coins,
    xpAwarded: result.xpAwarded,
    newTotalXP: result.newTotalXP,
    newCoinBalance: updatedUser?.coins ?? user.coins + dayReward.coins,
    rewards: DAILY_REWARDS,
  };
}

export async function getUserXPInfo(userId: string) {
  const [user] = await db
    .select({ xp: users.xp, level: users.level, lastDailyLoginBonus: users.lastDailyLoginBonus })
    .from(users)
    .where(eq(users.id, userId));
  
  return user || null;
}
