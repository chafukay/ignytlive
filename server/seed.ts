import { db } from "./db";
import { users, gifts, badges, wheelPrizes, adminUsers, coinPackages, vipTiers } from "@shared/schema";
import { eq, and, lt, notInArray, inArray, sql } from "drizzle-orm";
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

export async function migrateRenamedUsers() {
  try {
    const oldUser = await db.select().from(users).where(eq(users.username, "sankalpchari")).limit(1);
    if (oldUser.length > 0) {
      const hashedPassword = await bcrypt.hash("sanketch", 10);
      await db.update(users)
        .set({ username: "sanketch", password: hashedPassword })
        .where(eq(users.username, "sankalpchari"));
      console.log("✓ Migrated user sankalpchari → sanketch");
    }
  } catch (error: any) {
    console.error("Failed to migrate renamed users:", error);
  }
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

export async function seedCoinPackages() {
  try {
    const existing = await db.select().from(coinPackages).limit(1);
    if (existing.length > 0) {
      console.log("✓ Coin packages already seeded");
      return;
    }

    const defaultPackages = [
      { coins: 380, priceUsd: 199, originalPriceUsd: 379, label: "Popular", sortOrder: 1 },
      { coins: 975, priceUsd: 499, originalPriceUsd: 974, label: "Hot", sortOrder: 2 },
      { coins: 2000, priceUsd: 999, originalPriceUsd: 1999, label: "Best Value", sortOrder: 3 },
      { coins: 3875, priceUsd: 2499, originalPriceUsd: 3899, sortOrder: 4 },
      { coins: 5100, priceUsd: 2999, originalPriceUsd: 5099, label: "Popular", sortOrder: 5 },
      { coins: 8750, priceUsd: 4999, originalPriceUsd: 8749, label: "Popular", sortOrder: 6 },
      { coins: 14400, priceUsd: 7999, originalPriceUsd: 14499, sortOrder: 7 },
      { coins: 18500, priceUsd: 9999, originalPriceUsd: 18499, label: "Hot", sortOrder: 8 },
      { coins: 57000, priceUsd: 29999, originalPriceUsd: 56999, sortOrder: 9 },
    ];

    await db.insert(coinPackages).values(defaultPackages);
    console.log("✓ Seeded default coin packages");
  } catch (error: any) {
    if (error?.code === '42P01') {
      console.log("Coin packages table not yet created, skipping seed");
    } else {
      console.error("Failed to seed coin packages:", error);
    }
  }
}

export async function seedVipTiers() {
  try {
    const existing = await db.select().from(vipTiers).limit(1);
    if (existing.length > 0) {
      console.log("✓ VIP tiers already seeded");
      return;
    }

    await db.insert(vipTiers).values([
      { tier: 1, name: "Bronze", price: 500, icon: "🥉", color: "from-amber-700 to-amber-900", borderColor: "border-amber-600", benefits: "Bronze profile badge|Exclusive chat color|5% bonus on coin purchases|Ad-free experience", sortOrder: 1 },
      { tier: 2, name: "Silver", price: 1500, icon: "🥈", color: "from-gray-400 to-gray-600", borderColor: "border-gray-400", benefits: "Silver profile badge|Custom entrance effect|10% bonus on coin purchases|Priority customer support|All Bronze benefits", sortOrder: 2 },
      { tier: 3, name: "Gold", price: 5000, icon: "🥇", color: "from-yellow-500 to-yellow-700", borderColor: "border-yellow-500", benefits: "Gold profile badge|Animated profile frame|15% bonus on coin purchases|Exclusive Gold gifts|Featured on leaderboard|All Silver benefits", sortOrder: 3 },
      { tier: 4, name: "Platinum", price: 15000, icon: "💎", color: "from-cyan-400 to-cyan-600", borderColor: "border-cyan-400", benefits: "Platinum profile badge|VIP entrance animation|20% bonus on coin purchases|Private messaging priority|Custom chat bubbles|Monthly diamond bonus|All Gold benefits", sortOrder: 4 },
      { tier: 5, name: "Millionaire", price: 50000, icon: "👑", color: "from-purple-500 via-pink-500 to-red-500", borderColor: "border-purple-500", benefits: "Millionaire crown badge|Legendary entrance effects|25% bonus on all purchases|Exclusive Millionaire gifts|Personal account manager|Weekly diamond bonus|VIP-only events access|Custom profile effects|All Platinum benefits", sortOrder: 5 },
    ]);
    console.log("✓ Seeded VIP tiers");
  } catch (error: any) {
    if (error?.code === '42P01') {
      console.log("VIP tiers table not yet created, skipping seed");
    } else {
      console.error("Failed to seed VIP tiers:", error);
    }
  }
}

async function getReferencingForeignKeys(tableName: string): Promise<Array<{ table: string; column: string }>> {
  const result = await db.execute(sql`
    SELECT tc.table_name AS table_name, kcu.column_name AS column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_schema = kcu.constraint_schema
     AND tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_schema = ccu.constraint_schema
     AND tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_name = ${tableName}
      AND ccu.column_name = 'id'
  `);
  return (result.rows as Array<{ table_name: string; column_name: string }>).map(r => ({
    table: r.table_name,
    column: r.column_name,
  }));
}

async function cascadeDeleteRows(table: string, column: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const idList = sql.join(ids.map(id => sql`${id}`), sql`, `);
  const tableIdent = sql.identifier(table);
  const columnIdent = sql.identifier(column);

  // Find which rows in this table will be deleted, so we can cascade to their dependents
  const affected = await db.execute(
    sql`SELECT id FROM ${tableIdent} WHERE ${columnIdent} IN (${idList})`
  );
  const affectedIds = (affected.rows as Array<{ id: string }>).map(r => r.id);

  if (affectedIds.length > 0) {
    const childFks = await getReferencingForeignKeys(table);
    for (const fk of childFks) {
      await cascadeDeleteRows(fk.table, fk.column, affectedIds);
    }
  }

  await db.execute(sql`DELETE FROM ${tableIdent} WHERE ${columnIdent} IN (${idList})`);
}

export async function cleanupGuestUsers() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const familyOwners = db.select({ id: sql`owner_id` }).from(sql`families`);
    const guestIds = await db.select({ id: users.id })
      .from(users)
      .where(and(
        eq(users.isGuest, true),
        lt(users.createdAt, sevenDaysAgo),
        sql`${users.id} NOT IN (${familyOwners})`
      ));

    if (guestIds.length === 0) return;

    const ids = guestIds.map(g => g.id);

    // Dynamically discover every table that has a FK to users.id and cascade-delete
    // related rows (and their dependents) before removing the guest users themselves.
    const userFks = await getReferencingForeignKeys('users');
    for (const fk of userFks) {
      await cascadeDeleteRows(fk.table, fk.column, ids);
    }

    const result = await db.delete(users).where(inArray(users.id, ids));
    const cleaned = result.rowCount ?? 0;
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} guest accounts older than 7 days`);
    }
  } catch (error) {
    console.error("Failed to clean up guest users:", error);
  }
}
