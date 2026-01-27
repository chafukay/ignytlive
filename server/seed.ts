import { db } from "./db";
import { users, gifts } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedDatabase() {
  console.log("🌱 Seeding database...");

  // Check if already seeded
  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0) {
    console.log("✓ Database already seeded");
    return;
  }

  // Seed default gifts
  const defaultGifts = [
    { name: 'Rose', emoji: '🌹', coinCost: 10, diamondValue: 5, animationType: '2d', isActive: true },
    { name: 'Chocolate', emoji: '🍫', coinCost: 20, diamondValue: 10, animationType: '2d', isActive: true },
    { name: 'Diamond', emoji: '💎', coinCost: 50, diamondValue: 30, animationType: '2d', isActive: true },
    { name: 'Rocket', emoji: '🚀', coinCost: 100, diamondValue: 60, animationType: '2d', isActive: true },
    { name: 'Super Car', emoji: '🏎️', coinCost: 500, diamondValue: 300, animationType: '3d', isActive: true },
    { name: 'Castle', emoji: '🏰', coinCost: 1000, diamondValue: 600, animationType: '3d', isActive: true },
    { name: 'Unicorn', emoji: '🦄', coinCost: 2000, diamondValue: 1200, animationType: '3d', isActive: true },
    { name: 'Crown', emoji: '👑', coinCost: 5000, diamondValue: 3000, animationType: '3d', isActive: true },
  ];

  await db.insert(gifts).values(defaultGifts);
  console.log("✓ Seeded default gifts");

  // Seed demo users
  const demoUsers = [
    {
      username: 'NeonQueen',
      email: 'neonqueen@example.com',
      password: 'demo123', // In production, this would be hashed
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NeonQueen',
      bio: 'Dancing through life! 💃✨',
      level: 45,
      coins: 50000,
      diamonds: 12000,
      followersCount: 8500,
      followingCount: 1200,
      totalLikes: 125000,
      vipTier: 3,
    },
    {
      username: 'TechTalks_Dave',
      email: 'dave@example.com',
      password: 'demo123',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dave',
      bio: 'Building the future 🚀',
      level: 32,
      coins: 30000,
      diamonds: 5000,
      followersCount: 3400,
      followingCount: 850,
      totalLikes: 45000,
      vipTier: 2,
    },
    {
      username: 'BellaVita',
      email: 'bella@example.com',
      password: 'demo123',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bella',
      bio: 'Travel & Lifestyle 🌅',
      level: 50,
      coins: 75000,
      diamonds: 18000,
      followersCount: 8900,
      followingCount: 2100,
      totalLikes: 98000,
      vipTier: 4,
    },
  ];

  await db.insert(users).values(demoUsers);
  console.log("✓ Seeded demo users");

  console.log("🎉 Database seeding complete!");
}
