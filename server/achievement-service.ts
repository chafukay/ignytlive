import { db } from "./db";
import { users, achievements, userAchievements, giftTransactions, streams } from "@shared/schema";
import { eq, and, count, sql } from "drizzle-orm";

interface AchievementUnlock {
  achievementId: string;
  name: string;
  emoji: string;
  description: string;
  rewardXp: number;
  rewardCoins: number;
}

async function getAllActiveAchievements() {
  return db.select().from(achievements).where(eq(achievements.isActive, true));
}

async function hasAchievement(userId: string, achievementId: string): Promise<boolean> {
  const [result] = await db
    .select({ count: count() })
    .from(userAchievements)
    .where(and(eq(userAchievements.userId, userId), eq(userAchievements.achievementId, achievementId)));
  return (result?.count ?? 0) > 0;
}

async function unlockAndReward(userId: string, achievement: { id: string; name: string; emoji: string; description: string; rewardXp: number; rewardCoins: number }): Promise<AchievementUnlock | null> {
  const [inserted] = await db
    .insert(userAchievements)
    .values({ userId, achievementId: achievement.id })
    .onConflictDoNothing({ target: [userAchievements.userId, userAchievements.achievementId] })
    .returning({ id: userAchievements.id });

  if (!inserted) return null;

  if (achievement.rewardXp > 0 || achievement.rewardCoins > 0) {
    await db
      .update(users)
      .set({
        xp: sql`${users.xp} + ${achievement.rewardXp}`,
        coins: sql`${users.coins} + ${achievement.rewardCoins}`,
      })
      .where(eq(users.id, userId));
  }

  return {
    achievementId: achievement.id,
    name: achievement.name,
    emoji: achievement.emoji,
    description: achievement.description,
    rewardXp: achievement.rewardXp,
    rewardCoins: achievement.rewardCoins,
  };
}

function parseRequirement(req: string): { type: string; value: number } | null {
  try {
    return JSON.parse(req);
  } catch {
    return null;
  }
}

export async function checkAchievements(
  userId: string,
  triggerType: "account_created" | "level" | "followers" | "gifts_sent" | "total_spent" | "streams"
): Promise<AchievementUnlock[]> {
  try {
    const allAchievements = await getAllActiveAchievements();
    const relevant = allAchievements.filter(a => {
      const req = parseRequirement(a.requirement);
      return req?.type === triggerType;
    });

    if (relevant.length === 0) return [];

    let currentValue = 0;

    switch (triggerType) {
      case "account_created": {
        currentValue = 1;
        break;
      }
      case "level": {
        const [user] = await db.select({ level: users.level }).from(users).where(eq(users.id, userId));
        currentValue = user?.level ?? 0;
        break;
      }
      case "followers": {
        const [user] = await db.select({ followersCount: users.followersCount }).from(users).where(eq(users.id, userId));
        currentValue = user?.followersCount ?? 0;
        break;
      }
      case "gifts_sent": {
        const [result] = await db
          .select({ total: count() })
          .from(giftTransactions)
          .where(eq(giftTransactions.senderId, userId));
        currentValue = result?.total ?? 0;
        break;
      }
      case "total_spent": {
        const [user] = await db.select({ totalSpent: users.totalSpent }).from(users).where(eq(users.id, userId));
        currentValue = user?.totalSpent ?? 0;
        break;
      }
      case "streams": {
        const [result] = await db
          .select({ total: count() })
          .from(streams)
          .where(eq(streams.userId, userId));
        currentValue = result?.total ?? 0;
        break;
      }
    }

    const unlocked: AchievementUnlock[] = [];

    for (const achievement of relevant) {
      const req = parseRequirement(achievement.requirement);
      if (!req) continue;

      if (currentValue >= req.value) {
        const result = await unlockAndReward(userId, achievement);
        if (result) {
          unlocked.push(result);
        }
      }
    }

    return unlocked;
  } catch (error) {
    console.error("[Achievements] Error checking achievements:", error);
    return [];
  }
}

export async function checkAllAchievementsForUser(userId: string): Promise<AchievementUnlock[]> {
  const triggers: Array<"account_created" | "level" | "followers" | "gifts_sent" | "total_spent" | "streams"> = [
    "account_created", "level", "followers", "gifts_sent", "total_spent", "streams"
  ];

  const allUnlocked: AchievementUnlock[] = [];
  for (const trigger of triggers) {
    const results = await checkAchievements(userId, trigger);
    allUnlocked.push(...results);
  }
  return allUnlocked;
}
