import { db } from "./db";
import { users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { XP_REWARDS, XPAction, getLevelFromXP } from "@shared/level-utils";

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
  
  return {
    xpAwarded: xpAmount,
    newTotalXP,
    previousLevel,
    newLevel,
    leveledUp,
  };
}

export async function checkDailyLoginBonus(userId: string): Promise<{ eligible: boolean; xpAwarded?: number; newTotalXP?: number }> {
  const [user] = await db
    .select({ lastDailyLoginBonus: users.lastDailyLoginBonus, xp: users.xp })
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
      return { eligible: false };
    }
  }
  
  const result = await awardXP(userId, "DAILY_LOGIN");
  
  await db
    .update(users)
    .set({ lastDailyLoginBonus: now })
    .where(eq(users.id, userId));
  
  return {
    eligible: true,
    xpAwarded: result.xpAwarded,
    newTotalXP: result.newTotalXP,
  };
}

export async function getUserXPInfo(userId: string) {
  const [user] = await db
    .select({ xp: users.xp, level: users.level, lastDailyLoginBonus: users.lastDailyLoginBonus })
    .from(users)
    .where(eq(users.id, userId));
  
  return user || null;
}
