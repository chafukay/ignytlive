import {
  users,
  streams,
  shorts,
  follows,
  gifts,
  giftTransactions,
  messages,
  streamComments,
  badges,
  userBadges,
  wishlistItems,
  wheelPrizes,
  wheelSpins,
  callRequests,
  streamGoals,
  joinRequests,
  groups,
  groupMembers,
  groupMessages,
  mediaUnlocks,
  type User,
  type InsertUser,
  type Stream,
  type InsertStream,
  type Short,
  type InsertShort,
  type Follow,
  type InsertFollow,
  type Gift,
  type InsertGift,
  type GiftTransaction,
  type InsertGiftTransaction,
  type Message,
  type InsertMessage,
  type StreamComment,
  type InsertStreamComment,
  type Badge,
  type InsertBadge,
  type UserBadge,
  type WishlistItem,
  type InsertWishlistItem,
  type WheelPrize,
  type InsertWheelPrize,
  type WheelSpin,
  type CallRequest,
  type InsertCallRequest,
  type StreamGoal,
  type InsertStreamGoal,
  type JoinRequest,
  type InsertJoinRequest,
  type Group,
  type InsertGroup,
  type GroupMember,
  type InsertGroupMember,
  type GroupMessage,
  type InsertGroupMessage,
  type MediaUnlock,
  type InsertMediaUnlock,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, or } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  // Stream operations
  getStream(id: string): Promise<Stream | undefined>;
  getLiveStreams(limit?: number): Promise<(Stream & { user: User })[]>;
  getUserStreams(userId: string): Promise<Stream[]>;
  createStream(stream: InsertStream): Promise<Stream>;
  updateStream(id: string, updates: Partial<Stream>): Promise<Stream | undefined>;
  
  // Short operations
  getShort(id: string): Promise<Short | undefined>;
  getShortsFeed(limit?: number): Promise<(Short & { user: User })[]>;
  getUserShorts(userId: string): Promise<Short[]>;
  createShort(short: InsertShort): Promise<Short>;
  updateShort(id: string, updates: Partial<Short>): Promise<Short | undefined>;
  
  // Follow operations
  createFollow(follow: InsertFollow): Promise<Follow>;
  deleteFollow(followerId: string, followingId: string): Promise<boolean>;
  getFollowers(userId: string): Promise<User[]>;
  getFollowing(userId: string): Promise<User[]>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  
  // Gift operations
  getGifts(): Promise<Gift[]>;
  createGift(gift: InsertGift): Promise<Gift>;
  sendGift(transaction: InsertGiftTransaction): Promise<GiftTransaction>;
  getGiftTransactions(userId: string): Promise<GiftTransaction[]>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getConversation(userId1: string, userId2: string): Promise<Message[]>;
  getRecentChats(userId: string): Promise<Array<{ user: User; lastMessage: Message }>>;
  
  // Stream comment operations
  createStreamComment(comment: InsertStreamComment): Promise<StreamComment>;
  getStreamComments(streamId: string, limit?: number): Promise<(StreamComment & { user: User })[]>;
  
  // Leaderboard operations
  getTopStreamers(period: 'daily' | 'weekly' | 'alltime'): Promise<User[]>;
  
  // Badge operations
  getBadges(): Promise<Badge[]>;
  getUserBadges(userId: string): Promise<(UserBadge & { badge: Badge })[]>;
  awardBadge(userId: string, badgeId: string): Promise<UserBadge>;
  createBadge(badge: InsertBadge): Promise<Badge>;
  
  // Wishlist operations
  getWishlistItems(userId: string): Promise<WishlistItem[]>;
  createWishlistItem(item: InsertWishlistItem): Promise<WishlistItem>;
  contributeToWishlist(itemId: string, amount: number): Promise<WishlistItem | undefined>;
  
  // Wheel operations
  getWheelPrizes(): Promise<WheelPrize[]>;
  spinWheel(userId: string, streamId?: string): Promise<WheelSpin & { prize: WheelPrize }>;
  createWheelPrize(prize: InsertWheelPrize): Promise<WheelPrize>;
  
  // Call operations
  createCallRequest(call: InsertCallRequest): Promise<CallRequest>;
  updateCallRequest(id: string, updates: Partial<CallRequest>): Promise<CallRequest | undefined>;
  getUserCallRequests(userId: string): Promise<CallRequest[]>;
  
  // Stream Goal operations
  getStreamGoals(streamId: string): Promise<StreamGoal[]>;
  createStreamGoal(goal: InsertStreamGoal): Promise<StreamGoal>;
  updateStreamGoal(id: string, updates: Partial<StreamGoal>): Promise<StreamGoal | undefined>;
  contributeToGoal(goalId: string, amount: number): Promise<StreamGoal | undefined>;
  
  // Join Request operations
  getJoinRequests(streamId: string): Promise<(JoinRequest & { user: User })[]>;
  createJoinRequest(request: InsertJoinRequest): Promise<JoinRequest>;
  updateJoinRequest(id: string, status: string): Promise<JoinRequest | undefined>;
  
  // Group operations
  createGroup(group: InsertGroup): Promise<Group>;
  getGroup(id: string): Promise<Group | undefined>;
  getUserGroups(userId: string): Promise<(Group & { memberCount: number })[]>;
  updateGroup(id: string, updates: Partial<Group>): Promise<Group | undefined>;
  deleteGroup(id: string): Promise<boolean>;
  
  // Group Member operations
  addGroupMember(member: InsertGroupMember): Promise<GroupMember>;
  removeGroupMember(groupId: string, userId: string): Promise<boolean>;
  getGroupMembers(groupId: string): Promise<(GroupMember & { user: User })[]>;
  isGroupMember(groupId: string, userId: string): Promise<boolean>;
  
  // Group Message operations
  createGroupMessage(message: InsertGroupMessage): Promise<GroupMessage>;
  getGroupMessages(groupId: string, limit?: number): Promise<(GroupMessage & { sender: User })[]>;
  
  // Media Unlock operations
  unlockMedia(unlock: InsertMediaUnlock): Promise<MediaUnlock>;
  hasUnlockedMedia(userId: string, messageId: string, messageType: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // Stream operations
  async getStream(id: string): Promise<Stream | undefined> {
    const [stream] = await db.select().from(streams).where(eq(streams.id, id));
    return stream || undefined;
  }

  async getLiveStreams(limit: number = 50): Promise<(Stream & { user: User })[]> {
    const results = await db
      .select()
      .from(streams)
      .innerJoin(users, eq(streams.userId, users.id))
      .where(eq(streams.isLive, true))
      .orderBy(desc(streams.viewersCount))
      .limit(limit);
    
    return results.map(r => ({ ...r.streams, user: r.users }));
  }

  async getUserStreams(userId: string): Promise<Stream[]> {
    return await db
      .select()
      .from(streams)
      .where(eq(streams.userId, userId))
      .orderBy(desc(streams.createdAt));
  }

  async createStream(stream: InsertStream): Promise<Stream> {
    const [newStream] = await db
      .insert(streams)
      .values(stream)
      .returning();
    return newStream;
  }

  async updateStream(id: string, updates: Partial<Stream>): Promise<Stream | undefined> {
    const [stream] = await db
      .update(streams)
      .set(updates)
      .where(eq(streams.id, id))
      .returning();
    return stream || undefined;
  }

  // Short operations
  async getShort(id: string): Promise<Short | undefined> {
    const [short] = await db.select().from(shorts).where(eq(shorts.id, id));
    return short || undefined;
  }

  async getShortsFeed(limit: number = 20): Promise<(Short & { user: User })[]> {
    const results = await db
      .select()
      .from(shorts)
      .innerJoin(users, eq(shorts.userId, users.id))
      .orderBy(desc(shorts.createdAt))
      .limit(limit);
    
    return results.map(r => ({ ...r.shorts, user: r.users }));
  }

  async getUserShorts(userId: string): Promise<Short[]> {
    return await db
      .select()
      .from(shorts)
      .where(eq(shorts.userId, userId))
      .orderBy(desc(shorts.createdAt));
  }

  async createShort(short: InsertShort): Promise<Short> {
    const [newShort] = await db
      .insert(shorts)
      .values(short)
      .returning();
    return newShort;
  }

  async updateShort(id: string, updates: Partial<Short>): Promise<Short | undefined> {
    const [short] = await db
      .update(shorts)
      .set(updates)
      .where(eq(shorts.id, id))
      .returning();
    return short || undefined;
  }

  // Follow operations
  async createFollow(follow: InsertFollow): Promise<Follow> {
    const [newFollow] = await db
      .insert(follows)
      .values(follow)
      .returning();
    
    // Update follower/following counts
    await db
      .update(users)
      .set({ followingCount: sql`${users.followingCount} + 1` })
      .where(eq(users.id, follow.followerId));
    
    await db
      .update(users)
      .set({ followersCount: sql`${users.followersCount} + 1` })
      .where(eq(users.id, follow.followingId));
    
    return newFollow;
  }

  async deleteFollow(followerId: string, followingId: string): Promise<boolean> {
    const result = await db
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId)
        )
      );
    
    // Update follower/following counts
    await db
      .update(users)
      .set({ followingCount: sql`${users.followingCount} - 1` })
      .where(eq(users.id, followerId));
    
    await db
      .update(users)
      .set({ followersCount: sql`${users.followersCount} - 1` })
      .where(eq(users.id, followingId));
    
    return true;
  }

  async getFollowers(userId: string): Promise<User[]> {
    const results = await db
      .select()
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId));
    
    return results.map(r => r.users);
  }

  async getFollowing(userId: string): Promise<User[]> {
    const results = await db
      .select()
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId));
    
    return results.map(r => r.users);
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId)
        )
      );
    return !!result;
  }

  // Gift operations
  async getGifts(): Promise<Gift[]> {
    return await db.select().from(gifts).where(eq(gifts.isActive, true));
  }

  async createGift(gift: InsertGift): Promise<Gift> {
    const [newGift] = await db
      .insert(gifts)
      .values(gift)
      .returning();
    return newGift;
  }

  async sendGift(transaction: InsertGiftTransaction): Promise<GiftTransaction> {
    const [newTransaction] = await db
      .insert(giftTransactions)
      .values(transaction)
      .returning();
    
    // Deduct coins from sender
    await db
      .update(users)
      .set({ coins: sql`${users.coins} - ${transaction.totalCoins}` })
      .where(eq(users.id, transaction.senderId));
    
    // Add diamonds to receiver
    const [gift] = await db.select().from(gifts).where(eq(gifts.id, transaction.giftId));
    if (gift) {
      const quantity = transaction.quantity || 1;
      await db
        .update(users)
        .set({ diamonds: sql`${users.diamonds} + ${gift.diamondValue * quantity}` })
        .where(eq(users.id, transaction.receiverId));
    }
    
    return newTransaction;
  }

  async getGiftTransactions(userId: string): Promise<GiftTransaction[]> {
    return await db
      .select()
      .from(giftTransactions)
      .where(
        or(
          eq(giftTransactions.senderId, userId),
          eq(giftTransactions.receiverId, userId)
        )
      )
      .orderBy(desc(giftTransactions.createdAt));
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getConversation(userId1: string, userId2: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        or(
          and(
            eq(messages.senderId, userId1),
            eq(messages.receiverId, userId2)
          ),
          and(
            eq(messages.senderId, userId2),
            eq(messages.receiverId, userId1)
          )
        )
      )
      .orderBy(messages.createdAt);
  }

  async getRecentChats(userId: string): Promise<Array<{ user: User; lastMessage: Message }>> {
    const recentMessages = await db
      .select()
      .from(messages)
      .where(
        or(
          eq(messages.senderId, userId),
          eq(messages.receiverId, userId)
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(50);
    
    const chatMap = new Map<string, Message>();
    for (const msg of recentMessages) {
      const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!chatMap.has(otherUserId)) {
        chatMap.set(otherUserId, msg);
      }
    }
    
    const result: Array<{ user: User; lastMessage: Message }> = [];
    for (const entry of Array.from(chatMap.entries())) {
      const [otherUserId, lastMessage] = entry;
      const user = await this.getUser(otherUserId);
      if (user) {
        result.push({ user, lastMessage });
      }
    }
    
    return result;
  }

  // Stream comment operations
  async createStreamComment(comment: InsertStreamComment): Promise<StreamComment> {
    const [newComment] = await db
      .insert(streamComments)
      .values(comment)
      .returning();
    return newComment;
  }

  async getStreamComments(streamId: string, limit: number = 100): Promise<(StreamComment & { user: User })[]> {
    const results = await db
      .select()
      .from(streamComments)
      .innerJoin(users, eq(streamComments.userId, users.id))
      .where(eq(streamComments.streamId, streamId))
      .orderBy(desc(streamComments.createdAt))
      .limit(limit);
    
    return results.map(r => ({ ...r.stream_comments, user: r.users }));
  }

  // Leaderboard operations
  async getTopStreamers(period: 'daily' | 'weekly' | 'alltime'): Promise<User[]> {
    // For alltime, we return more users and order by diamonds
    if (period === 'alltime') {
      return await db
        .select()
        .from(users)
        .orderBy(desc(users.diamonds))
        .limit(20);
    }
    // Daily/weekly returns by total likes
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.totalLikes))
      .limit(10);
  }
  
  // Badge operations
  async getBadges(): Promise<Badge[]> {
    return await db.select().from(badges).where(eq(badges.isActive, true));
  }
  
  async getUserBadges(userId: string): Promise<(UserBadge & { badge: Badge })[]> {
    const results = await db
      .select()
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, userId));
    return results.map(r => ({ ...r.user_badges, badge: r.badges }));
  }
  
  async awardBadge(userId: string, badgeId: string): Promise<UserBadge> {
    const [badge] = await db
      .insert(userBadges)
      .values({ userId, badgeId })
      .returning();
    return badge;
  }
  
  async createBadge(badge: InsertBadge): Promise<Badge> {
    const [newBadge] = await db.insert(badges).values(badge).returning();
    return newBadge;
  }
  
  // Wishlist operations
  async getWishlistItems(userId: string): Promise<WishlistItem[]> {
    return await db
      .select()
      .from(wishlistItems)
      .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.isActive, true)));
  }
  
  async createWishlistItem(item: InsertWishlistItem): Promise<WishlistItem> {
    const [newItem] = await db.insert(wishlistItems).values(item).returning();
    return newItem;
  }
  
  async contributeToWishlist(itemId: string, amount: number): Promise<WishlistItem | undefined> {
    const [item] = await db
      .update(wishlistItems)
      .set({ currentAmount: sql`${wishlistItems.currentAmount} + ${amount}` })
      .where(eq(wishlistItems.id, itemId))
      .returning();
    return item;
  }
  
  // Wheel operations
  async getWheelPrizes(): Promise<WheelPrize[]> {
    return await db.select().from(wheelPrizes).where(eq(wheelPrizes.isActive, true));
  }
  
  async spinWheel(userId: string, streamId?: string): Promise<WheelSpin & { prize: WheelPrize }> {
    const prizes = await this.getWheelPrizes();
    if (prizes.length === 0) throw new Error("No prizes available");
    
    // Weighted random selection
    const totalWeight = prizes.reduce((sum, p) => sum + p.probability, 0);
    let random = Math.random() * totalWeight;
    let selectedPrize = prizes[0];
    
    for (const prize of prizes) {
      random -= prize.probability;
      if (random <= 0) {
        selectedPrize = prize;
        break;
      }
    }
    
    const [spin] = await db
      .insert(wheelSpins)
      .values({
        userId,
        prizeId: selectedPrize.id,
        coinsWon: selectedPrize.coinValue,
        streamId: streamId || null,
      })
      .returning();
    
    // Add coins to user
    await db
      .update(users)
      .set({ coins: sql`${users.coins} + ${selectedPrize.coinValue}` })
      .where(eq(users.id, userId));
    
    return { ...spin, prize: selectedPrize };
  }
  
  async createWheelPrize(prize: InsertWheelPrize): Promise<WheelPrize> {
    const [newPrize] = await db.insert(wheelPrizes).values(prize).returning();
    return newPrize;
  }
  
  // Call operations
  async createCallRequest(call: InsertCallRequest): Promise<CallRequest> {
    const [newCall] = await db.insert(callRequests).values(call).returning();
    return newCall;
  }
  
  async updateCallRequest(id: string, updates: Partial<CallRequest>): Promise<CallRequest | undefined> {
    const [call] = await db
      .update(callRequests)
      .set(updates)
      .where(eq(callRequests.id, id))
      .returning();
    return call;
  }
  
  async getUserCallRequests(userId: string): Promise<CallRequest[]> {
    return await db
      .select()
      .from(callRequests)
      .where(or(eq(callRequests.callerId, userId), eq(callRequests.receiverId, userId)))
      .orderBy(desc(callRequests.createdAt));
  }
  
  // Stream Goal operations
  async getStreamGoals(streamId: string): Promise<StreamGoal[]> {
    return await db
      .select()
      .from(streamGoals)
      .where(eq(streamGoals.streamId, streamId))
      .orderBy(streamGoals.createdAt);
  }
  
  async createStreamGoal(goal: InsertStreamGoal): Promise<StreamGoal> {
    const [newGoal] = await db.insert(streamGoals).values(goal).returning();
    return newGoal;
  }
  
  async updateStreamGoal(id: string, updates: Partial<StreamGoal>): Promise<StreamGoal | undefined> {
    const [goal] = await db
      .update(streamGoals)
      .set(updates)
      .where(eq(streamGoals.id, id))
      .returning();
    return goal;
  }
  
  async contributeToGoal(goalId: string, amount: number): Promise<StreamGoal | undefined> {
    const [goal] = await db
      .update(streamGoals)
      .set({
        currentCoins: sql`${streamGoals.currentCoins} + ${amount}`,
      })
      .where(eq(streamGoals.id, goalId))
      .returning();
    
    if (goal && goal.currentCoins >= goal.targetCoins) {
      await db
        .update(streamGoals)
        .set({ isCompleted: true })
        .where(eq(streamGoals.id, goalId));
      return { ...goal, isCompleted: true };
    }
    
    return goal;
  }
  
  // Join Request operations
  async getJoinRequests(streamId: string): Promise<(JoinRequest & { user: User })[]> {
    const results = await db
      .select()
      .from(joinRequests)
      .innerJoin(users, eq(joinRequests.userId, users.id))
      .where(eq(joinRequests.streamId, streamId))
      .orderBy(desc(joinRequests.createdAt));
    
    return results.map(r => ({ ...r.join_requests, user: r.users }));
  }
  
  async createJoinRequest(request: InsertJoinRequest): Promise<JoinRequest> {
    const [newRequest] = await db.insert(joinRequests).values(request).returning();
    return newRequest;
  }
  
  async updateJoinRequest(id: string, status: string): Promise<JoinRequest | undefined> {
    const [request] = await db
      .update(joinRequests)
      .set({ status })
      .where(eq(joinRequests.id, id))
      .returning();
    return request;
  }
  
  // Group operations
  async createGroup(group: InsertGroup): Promise<Group> {
    const [newGroup] = await db.insert(groups).values(group).returning();
    await db.insert(groupMembers).values({
      groupId: newGroup.id,
      userId: group.ownerId,
      role: "owner",
    });
    return newGroup;
  }
  
  async getGroup(id: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group || undefined;
  }
  
  async getUserGroups(userId: string): Promise<(Group & { memberCount: number })[]> {
    const memberGroups = await db
      .select()
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(eq(groupMembers.userId, userId))
      .orderBy(desc(groups.createdAt));
    
    const groupsWithCounts = await Promise.all(
      memberGroups.map(async (r) => {
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(groupMembers)
          .where(eq(groupMembers.groupId, r.groups.id));
        return {
          ...r.groups,
          memberCount: Number(countResult[0]?.count) || 0,
        };
      })
    );
    
    return groupsWithCounts;
  }
  
  async updateGroup(id: string, updates: Partial<Group>): Promise<Group | undefined> {
    const [group] = await db
      .update(groups)
      .set(updates)
      .where(eq(groups.id, id))
      .returning();
    return group || undefined;
  }
  
  async deleteGroup(id: string): Promise<boolean> {
    await db.delete(groupMessages).where(eq(groupMessages.groupId, id));
    await db.delete(groupMembers).where(eq(groupMembers.groupId, id));
    const result = await db.delete(groups).where(eq(groups.id, id));
    return true;
  }
  
  // Group Member operations
  async addGroupMember(member: InsertGroupMember): Promise<GroupMember> {
    const [newMember] = await db.insert(groupMembers).values(member).returning();
    return newMember;
  }
  
  async removeGroupMember(groupId: string, userId: string): Promise<boolean> {
    await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
    return true;
  }
  
  async getGroupMembers(groupId: string): Promise<(GroupMember & { user: User })[]> {
    const results = await db
      .select()
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, groupId))
      .orderBy(groupMembers.joinedAt);
    
    return results.map(r => ({ ...r.group_members, user: r.users }));
  }
  
  async isGroupMember(groupId: string, userId: string): Promise<boolean> {
    const [member] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
    return !!member;
  }
  
  // Group Message operations
  async createGroupMessage(message: InsertGroupMessage): Promise<GroupMessage> {
    const [newMessage] = await db.insert(groupMessages).values(message).returning();
    return newMessage;
  }
  
  async getGroupMessages(groupId: string, limit: number = 100): Promise<(GroupMessage & { sender: User })[]> {
    const results = await db
      .select()
      .from(groupMessages)
      .innerJoin(users, eq(groupMessages.senderId, users.id))
      .where(eq(groupMessages.groupId, groupId))
      .orderBy(desc(groupMessages.createdAt))
      .limit(limit);
    
    return results.map(r => ({ ...r.group_messages, sender: r.users })).reverse();
  }
  
  // Media Unlock operations
  async unlockMedia(unlock: InsertMediaUnlock): Promise<MediaUnlock> {
    const [newUnlock] = await db.insert(mediaUnlocks).values(unlock).returning();
    return newUnlock;
  }
  
  async hasUnlockedMedia(userId: string, messageId: string, messageType: string): Promise<boolean> {
    const [unlock] = await db
      .select()
      .from(mediaUnlocks)
      .where(
        and(
          eq(mediaUnlocks.userId, userId),
          eq(mediaUnlocks.messageId, messageId),
          eq(mediaUnlocks.messageType, messageType)
        )
      );
    return !!unlock;
  }
}

export const storage = new DatabaseStorage();
