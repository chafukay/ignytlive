import { db } from "./db";
import { users, gifts, badges, wheelPrizes } from "@shared/schema";
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

  // Seed badges
  const defaultBadges = [
    { name: 'VIP', icon: '👑', description: 'VIP member', type: 'vip', requirement: 1 },
    { name: 'Super VIP', icon: '💎', description: 'Super VIP member', type: 'vip', requirement: 3 },
    { name: 'Top Gifter', icon: '🎁', description: 'Sent 1000+ gifts', type: 'gifting', requirement: 1000 },
    { name: 'Rising Star', icon: '⭐', description: '1000+ followers', type: 'followers', requirement: 1000 },
    { name: 'Superstar', icon: '🌟', description: '10000+ followers', type: 'followers', requirement: 10000 },
    { name: 'Streamer Pro', icon: '🎬', description: '100+ hours streamed', type: 'streaming', requirement: 100 },
    { name: 'Newcomer', icon: '🆕', description: 'New to the platform', type: 'welcome', requirement: 0 },
    { name: 'Verified', icon: '✅', description: 'Verified account', type: 'verified', requirement: 0 },
  ];
  await db.insert(badges).values(defaultBadges);
  console.log("✓ Seeded badges");

  // Seed wheel prizes
  const defaultWheelPrizes = [
    { name: '10 Coins', emoji: '🪙', coinValue: 10, probability: 30, color: '#FFD700' },
    { name: '50 Coins', emoji: '💰', coinValue: 50, probability: 25, color: '#FFA500' },
    { name: '100 Coins', emoji: '💎', coinValue: 100, probability: 20, color: '#00CED1' },
    { name: '250 Coins', emoji: '🏆', coinValue: 250, probability: 12, color: '#9400D3' },
    { name: '500 Coins', emoji: '🎉', coinValue: 500, probability: 8, color: '#FF1493' },
    { name: '1000 Coins', emoji: '🚀', coinValue: 1000, probability: 4, color: '#00FF00' },
    { name: 'Jackpot!', emoji: '👑', coinValue: 5000, probability: 1, color: '#FF0000' },
  ];
  await db.insert(wheelPrizes).values(defaultWheelPrizes);
  console.log("✓ Seeded wheel prizes");

  console.log("🎉 Database seeding complete!");
}
