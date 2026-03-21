import { db } from "./db";
import { users, gifts, badges, wheelPrizes, adminUsers } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

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

  // Seed demo users with various levels and roles
  const demoUsers = [
    // Super Admin
    {
      username: 'SuperAdmin',
      email: 'superadmin@ignyt.live',
      password: 'admin123',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SuperAdmin',
      bio: 'Platform Super Administrator 🛡️',
      level: 99,
      coins: 999999,
      diamonds: 999999,
      followersCount: 0,
      followingCount: 0,
      totalLikes: 0,
      vipTier: 5,
      role: 'superadmin',
      country: 'US',
    },
    // Admin
    {
      username: 'AdminMike',
      email: 'admin@ignyt.live',
      password: 'admin123',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AdminMike',
      bio: 'Platform Administrator 🔧',
      level: 80,
      coins: 500000,
      diamonds: 100000,
      followersCount: 1000,
      followingCount: 50,
      totalLikes: 5000,
      vipTier: 4,
      role: 'admin',
      country: 'GB',
    },
    // VIP Users (High Level)
    {
      username: 'NeonQueen',
      email: 'neonqueen@example.com',
      password: 'demo123',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NeonQueen',
      bio: 'Dancing through life! 💃✨',
      level: 45,
      coins: 50000,
      diamonds: 12000,
      followersCount: 8500,
      followingCount: 1200,
      totalLikes: 125000,
      vipTier: 3,
      role: 'user',
      country: 'US',
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
      role: 'user',
      country: 'IT',
    },
    // Mid Level Users
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
      role: 'user',
      country: 'DE',
    },
    {
      username: 'GamerGirl99',
      email: 'gamer@example.com',
      password: 'demo123',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=GamerGirl',
      bio: 'Pro gamer & streamer 🎮',
      level: 28,
      coins: 25000,
      diamonds: 8000,
      followersCount: 5600,
      followingCount: 420,
      totalLikes: 67000,
      vipTier: 2,
      role: 'user',
      country: 'KR',
    },
    {
      username: 'MusicMaster',
      email: 'music@example.com',
      password: 'demo123',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MusicMaster',
      bio: 'DJ & Music Producer 🎵',
      level: 35,
      coins: 40000,
      diamonds: 15000,
      followersCount: 12000,
      followingCount: 300,
      totalLikes: 89000,
      vipTier: 3,
      role: 'user',
      country: 'BR',
    },
    // Low Level / New Users
    {
      username: 'NewUser123',
      email: 'newuser@example.com',
      password: 'demo123',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NewUser',
      bio: 'Just joined! 👋',
      level: 3,
      coins: 500,
      diamonds: 50,
      followersCount: 25,
      followingCount: 100,
      totalLikes: 150,
      vipTier: 0,
      role: 'user',
      country: 'JP',
    },
    {
      username: 'StarterSteve',
      email: 'steve@example.com',
      password: 'demo123',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Steve',
      bio: 'Learning the ropes 📚',
      level: 8,
      coins: 2000,
      diamonds: 200,
      followersCount: 150,
      followingCount: 250,
      totalLikes: 800,
      vipTier: 0,
      role: 'user',
      country: 'AU',
    },
    {
      username: 'RookieRita',
      email: 'rita@example.com',
      password: 'demo123',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rita',
      bio: 'Aspiring streamer ✨',
      level: 12,
      coins: 5000,
      diamonds: 800,
      followersCount: 450,
      followingCount: 180,
      totalLikes: 2500,
      vipTier: 1,
      role: 'user',
      country: 'FR',
    },
  ];

  await db.insert(users).values(demoUsers);
  console.log("✓ Seeded demo users (including admins)");

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

  // Seed default admin user
  const existingAdmin = await db.select().from(adminUsers).limit(1);
  if (existingAdmin.length === 0) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await db.insert(adminUsers).values({
      username: "admin",
      email: "admin@ignyt.live",
      password: hashedPassword,
      role: "superadmin",
    });
    console.log("✓ Seeded default admin user (username: admin, password: admin123)");
  }

  console.log("🎉 Database seeding complete!");
}

export async function migrateUserPasswords() {
  try {
    const allUsers = await db.select().from(users);
    let migratedCount = 0;
    for (const user of allUsers) {
      if (!user.password.startsWith("$2a$") && !user.password.startsWith("$2b$")) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await db.update(users).set({ password: hashedPassword }).where(eq(users.id, user.id));
        migratedCount++;
      }
    }
    if (migratedCount > 0) {
      console.log(`✓ Migrated ${migratedCount} user password(s) to bcrypt hash`);
    }
  } catch (error: any) {
    console.error("Failed to migrate user passwords:", error);
  }
}

export async function seedAdminUser() {
  try {
    const existingAdmin = await db.select().from(adminUsers).limit(1);
    if (existingAdmin.length === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await db.insert(adminUsers).values({
        username: "admin",
        email: "admin@ignyt.live",
        password: hashedPassword,
        role: "superadmin",
      });
      console.log("✓ Seeded default admin user (username: admin, password: admin123)");
    } else {
      const admin = existingAdmin[0];
      if (!admin.password.startsWith("$2a$") && !admin.password.startsWith("$2b$")) {
        const hashedPassword = await bcrypt.hash(admin.password, 10);
        await db.update(adminUsers).set({ password: hashedPassword }).where(eq(adminUsers.id, admin.id));
        console.log("✓ Migrated admin password to bcrypt hash");
      }
    }
  } catch (error: any) {
    if (error?.code === '42P01') {
      console.log("Admin users table not yet created, skipping seed");
    } else if (error?.message?.includes('duplicate')) {
      console.log("✓ Default admin user already exists");
    } else {
      console.error("Failed to seed admin user:", error);
    }
  }
}
