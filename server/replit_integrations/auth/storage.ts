import { users, type User } from "@shared/schema";
import { db } from "../../db";
import { eq, or } from "drizzle-orm";

// Auth user type for upsert from social login
export interface UpsertSocialUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}

// Interface for auth storage operations
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertSocialUser): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertSocialUser): Promise<User> {
    // Check if user exists by ID or email (to handle collision)
    const [existingUser] = await db.select().from(users).where(
      or(
        eq(users.id, userData.id),
        userData.email ? eq(users.email, userData.email) : undefined
      )
    );
    
    if (existingUser) {
      // Update existing user with social data
      const [updated] = await db
        .update(users)
        .set({
          avatar: userData.profileImageUrl || existingUser.avatar,
          socialProvider: "replit",
          socialProviderId: userData.id,
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      return updated;
    }
    
    // Create new user from social login - flag as needing age verification
    const username = userData.email?.split("@")[0] || `user_${userData.id.slice(0, 8)}`;
    const [newUser] = await db
      .insert(users)
      .values({
        id: userData.id,
        username: `${username}_${Date.now().toString(36)}`,
        email: userData.email || `${userData.id}@social.ignytlive.com`,
        password: "SOCIAL_AUTH_NO_PASSWORD", // Marker for social auth users (cannot login with password)
        avatar: userData.profileImageUrl,
        bio: userData.firstName && userData.lastName 
          ? `${userData.firstName} ${userData.lastName}` 
          : null,
        socialProvider: "replit",
        socialProviderId: userData.id,
        // Note: birthdate null = needs age verification on first action
      })
      .returning();
    return newUser;
  }
}

export const authStorage = new AuthStorage();
