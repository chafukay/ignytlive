import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  avatar: text("avatar"),
  bio: text("bio"),
  level: integer("level").notNull().default(1),
  coins: integer("coins").notNull().default(0),
  diamonds: integer("diamonds").notNull().default(0),
  earnings: integer("earnings").notNull().default(0), // Host earnings from gifts + calls
  followersCount: integer("followers_count").notNull().default(0),
  followingCount: integer("following_count").notNull().default(0),
  totalLikes: integer("total_likes").notNull().default(0),
  isLive: boolean("is_live").notNull().default(false),
  vipTier: integer("vip_tier").notNull().default(0),
  dndEnabled: boolean("dnd_enabled").notNull().default(false),
  availableForPrivateCall: boolean("available_for_private_call").notNull().default(false),
  privateCallRate: integer("private_call_rate").notNull().default(50), // coins per minute
  privateCallBillingMode: text("private_call_billing_mode").notNull().default("per_minute"), // per_minute or per_session
  privateCallSessionPrice: integer("private_call_session_price").notNull().default(500), // flat fee for per_session
  role: text("role").notNull().default("user"), // user, admin, superadmin
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  usernameIdx: index("username_idx").on(table.username),
  emailIdx: index("email_idx").on(table.email),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Streams table
export const streams = pgTable("streams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  thumbnail: text("thumbnail"),
  streamKey: text("stream_key").notNull().unique(),
  isLive: boolean("is_live").notNull().default(false),
  viewersCount: integer("viewers_count").notNull().default(0),
  totalViewers: integer("total_viewers").notNull().default(0),
  tags: text("tags").array(),
  category: text("category"),
  isPKBattle: boolean("is_pk_battle").notNull().default(false),
  pkOpponentId: varchar("pk_opponent_id"),
  isPrivate: boolean("is_private").notNull().default(false),
  accessType: text("access_type").notNull().default("public"),
  minVipTier: integer("min_vip_tier").notNull().default(0),
  groupId: varchar("group_id"),
  slowModeSeconds: integer("slow_mode_seconds").notNull().default(0), // 0 = disabled, otherwise rate limit in seconds
  pinnedMessageId: varchar("pinned_message_id"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("stream_user_id_idx").on(table.userId),
  isLiveIdx: index("stream_is_live_idx").on(table.isLive),
}));

export const streamsRelations = relations(streams, ({ one }) => ({
  user: one(users, {
    fields: [streams.userId],
    references: [users.id],
  }),
}));

export const insertStreamSchema = createInsertSchema(streams).omit({
  id: true,
  createdAt: true,
});
export type InsertStream = z.infer<typeof insertStreamSchema>;
export type Stream = typeof streams.$inferSelect;

// Shorts table
export const shorts = pgTable("shorts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  videoUrl: text("video_url").notNull(),
  thumbnail: text("thumbnail"),
  description: text("description"),
  song: text("song"),
  duration: integer("duration").notNull().default(0), // Duration in seconds (max 60 configurable)
  likesCount: integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  sharesCount: integer("shares_count").notNull().default(0),
  viewsCount: integer("views_count").notNull().default(0),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("shorts_user_id_idx").on(table.userId),
  createdAtIdx: index("shorts_created_at_idx").on(table.createdAt),
}));

export const shortsRelations = relations(shorts, ({ one }) => ({
  user: one(users, {
    fields: [shorts.userId],
    references: [users.id],
  }),
}));

export const insertShortSchema = createInsertSchema(shorts).omit({
  id: true,
  createdAt: true,
});
export type InsertShort = z.infer<typeof insertShortSchema>;
export type Short = typeof shorts.$inferSelect;

// Short Likes table - tracks who liked which shorts
export const shortLikes = pgTable("short_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shortId: varchar("short_id").notNull().references(() => shorts.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  shortUserIdx: index("short_likes_short_user_idx").on(table.shortId, table.userId),
  userIdx: index("short_likes_user_idx").on(table.userId),
}));

export const shortLikesRelations = relations(shortLikes, ({ one }) => ({
  short: one(shorts, {
    fields: [shortLikes.shortId],
    references: [shorts.id],
  }),
  user: one(users, {
    fields: [shortLikes.userId],
    references: [users.id],
  }),
}));

export type ShortLike = typeof shortLikes.$inferSelect;

// Short Comments table - 2-level deep (comments + replies)
export const shortComments = pgTable("short_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shortId: varchar("short_id").notNull().references(() => shorts.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  parentId: varchar("parent_id"), // null = top-level comment, non-null = reply
  content: text("content").notNull(),
  likesCount: integer("likes_count").notNull().default(0),
  repliesCount: integer("replies_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  shortIdx: index("short_comments_short_idx").on(table.shortId),
  userIdx: index("short_comments_user_idx").on(table.userId),
  parentIdx: index("short_comments_parent_idx").on(table.parentId),
}));

export const shortCommentsRelations = relations(shortComments, ({ one, many }) => ({
  short: one(shorts, {
    fields: [shortComments.shortId],
    references: [shorts.id],
  }),
  user: one(users, {
    fields: [shortComments.userId],
    references: [users.id],
  }),
  parent: one(shortComments, {
    fields: [shortComments.parentId],
    references: [shortComments.id],
    relationName: "parentReply",
  }),
  replies: many(shortComments, {
    relationName: "parentReply",
  }),
}));

export const insertShortCommentSchema = createInsertSchema(shortComments).omit({
  id: true,
  createdAt: true,
});
export type InsertShortComment = z.infer<typeof insertShortCommentSchema>;
export type ShortComment = typeof shortComments.$inferSelect;

// Short Comment Reactions table - reactions on comments
export const shortCommentReactions = pgTable("short_comment_reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  commentId: varchar("comment_id").notNull().references(() => shortComments.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  reaction: text("reaction").notNull(), // emoji like ❤️, 😂, 😮, 😢, 😡
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  commentUserIdx: index("short_comment_reactions_comment_user_idx").on(table.commentId, table.userId),
}));

export const shortCommentReactionsRelations = relations(shortCommentReactions, ({ one }) => ({
  comment: one(shortComments, {
    fields: [shortCommentReactions.commentId],
    references: [shortComments.id],
  }),
  user: one(users, {
    fields: [shortCommentReactions.userId],
    references: [users.id],
  }),
}));

export type ShortCommentReaction = typeof shortCommentReactions.$inferSelect;

// Follows table
export const follows = pgTable("follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => users.id),
  followingId: varchar("following_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  followerIdx: index("follows_follower_idx").on(table.followerId),
  followingIdx: index("follows_following_idx").on(table.followingId),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
  }),
}));

export const insertFollowSchema = createInsertSchema(follows).omit({
  id: true,
  createdAt: true,
});
export type InsertFollow = z.infer<typeof insertFollowSchema>;
export type Follow = typeof follows.$inferSelect;

// Gifts table
export const gifts = pgTable("gifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  emoji: text("emoji").notNull(),
  coinCost: integer("coin_cost").notNull(),
  diamondValue: integer("diamond_value").notNull(),
  animationType: text("animation_type").notNull().default("2d"),
  isActive: boolean("is_active").notNull().default(true),
}, (table) => ({
  nameIdx: index("gift_name_idx").on(table.name),
}));

export const insertGiftSchema = createInsertSchema(gifts).omit({
  id: true,
});
export type InsertGift = z.infer<typeof insertGiftSchema>;
export type Gift = typeof gifts.$inferSelect;

// Gift transactions table
export const giftTransactions = pgTable("gift_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  giftId: varchar("gift_id").notNull().references(() => gifts.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").notNull().references(() => users.id),
  streamId: varchar("stream_id").references(() => streams.id),
  quantity: integer("quantity").notNull().default(1),
  totalCoins: integer("total_coins").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  senderIdx: index("gift_sender_idx").on(table.senderId),
  receiverIdx: index("gift_receiver_idx").on(table.receiverId),
  streamIdx: index("gift_stream_idx").on(table.streamId),
}));

export const giftTransactionsRelations = relations(giftTransactions, ({ one }) => ({
  gift: one(gifts, {
    fields: [giftTransactions.giftId],
    references: [gifts.id],
  }),
  sender: one(users, {
    fields: [giftTransactions.senderId],
    references: [users.id],
  }),
  receiver: one(users, {
    fields: [giftTransactions.receiverId],
    references: [users.id],
  }),
  stream: one(streams, {
    fields: [giftTransactions.streamId],
    references: [streams.id],
  }),
}));

export const insertGiftTransactionSchema = createInsertSchema(giftTransactions).omit({
  id: true,
  createdAt: true,
});
export type InsertGiftTransaction = z.infer<typeof insertGiftTransactionSchema>;
export type GiftTransaction = typeof giftTransactions.$inferSelect;

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  senderIdx: index("msg_sender_idx").on(table.senderId),
  receiverIdx: index("msg_receiver_idx").on(table.receiverId),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
  }),
}));

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Stream comments table
export const streamComments = pgTable("stream_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  streamId: varchar("stream_id").notNull().references(() => streams.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isGift: boolean("is_gift").notNull().default(false),
  giftId: varchar("gift_id").references(() => gifts.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  streamIdx: index("comment_stream_idx").on(table.streamId),
}));

export const streamCommentsRelations = relations(streamComments, ({ one }) => ({
  stream: one(streams, {
    fields: [streamComments.streamId],
    references: [streams.id],
  }),
  user: one(users, {
    fields: [streamComments.userId],
    references: [users.id],
  }),
  gift: one(gifts, {
    fields: [streamComments.giftId],
    references: [gifts.id],
  }),
}));

export const insertStreamCommentSchema = createInsertSchema(streamComments).omit({
  id: true,
  createdAt: true,
});
export type InsertStreamComment = z.infer<typeof insertStreamCommentSchema>;
export type StreamComment = typeof streamComments.$inferSelect;

// Badges table
export const badges = pgTable("badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  requirement: integer("requirement"),
  coinCost: integer("coin_cost").notNull().default(500),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertBadgeSchema = createInsertSchema(badges).omit({ id: true });
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type Badge = typeof badges.$inferSelect;

// User Badges junction table
export const userBadges = pgTable("user_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  badgeId: varchar("badge_id").notNull().references(() => badges.id),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
});

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, { fields: [userBadges.userId], references: [users.id] }),
  badge: one(badges, { fields: [userBadges.badgeId], references: [badges.id] }),
}));

export type UserBadge = typeof userBadges.$inferSelect;

// Wishlist items table
export const wishlistItems = pgTable("wishlist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  targetAmount: integer("target_amount").notNull(),
  currentAmount: integer("current_amount").notNull().default(0),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  user: one(users, { fields: [wishlistItems.userId], references: [users.id] }),
}));

export const insertWishlistItemSchema = createInsertSchema(wishlistItems).omit({
  id: true,
  createdAt: true,
});
export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>;
export type WishlistItem = typeof wishlistItems.$inferSelect;

// Wheel prizes table
export const wheelPrizes = pgTable("wheel_prizes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  emoji: text("emoji").notNull(),
  coinValue: integer("coin_value").notNull(),
  probability: integer("probability").notNull(),
  color: text("color").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertWheelPrizeSchema = createInsertSchema(wheelPrizes).omit({ id: true });
export type InsertWheelPrize = z.infer<typeof insertWheelPrizeSchema>;
export type WheelPrize = typeof wheelPrizes.$inferSelect;

// Wheel spins table
export const wheelSpins = pgTable("wheel_spins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  prizeId: varchar("prize_id").notNull().references(() => wheelPrizes.id),
  coinsWon: integer("coins_won").notNull(),
  streamId: varchar("stream_id").references(() => streams.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const wheelSpinsRelations = relations(wheelSpins, ({ one }) => ({
  user: one(users, { fields: [wheelSpins.userId], references: [users.id] }),
  prize: one(wheelPrizes, { fields: [wheelSpins.prizeId], references: [wheelPrizes.id] }),
  stream: one(streams, { fields: [wheelSpins.streamId], references: [streams.id] }),
}));

export type WheelSpin = typeof wheelSpins.$inferSelect;

// 1-on-1 Call Requests table
export const callRequests = pgTable("call_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callerId: varchar("caller_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"),
  coinCost: integer("coin_cost").notNull(),
  duration: integer("duration"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const callRequestsRelations = relations(callRequests, ({ one }) => ({
  caller: one(users, { fields: [callRequests.callerId], references: [users.id] }),
  receiver: one(users, { fields: [callRequests.receiverId], references: [users.id] }),
}));

export const insertCallRequestSchema = createInsertSchema(callRequests).omit({
  id: true,
  createdAt: true,
});
export type InsertCallRequest = z.infer<typeof insertCallRequestSchema>;
export type CallRequest = typeof callRequests.$inferSelect;

// Stream Goals table
export const streamGoals = pgTable("stream_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  streamId: varchar("stream_id").notNull().references(() => streams.id),
  title: text("title").notNull(),
  targetCoins: integer("target_coins").notNull(),
  currentCoins: integer("current_coins").notNull().default(0),
  rewardDescription: text("reward_description"),
  isCompleted: boolean("is_completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const streamGoalsRelations = relations(streamGoals, ({ one }) => ({
  stream: one(streams, { fields: [streamGoals.streamId], references: [streams.id] }),
}));

export const insertStreamGoalSchema = createInsertSchema(streamGoals).omit({
  id: true,
  createdAt: true,
});
export type InsertStreamGoal = z.infer<typeof insertStreamGoalSchema>;
export type StreamGoal = typeof streamGoals.$inferSelect;

// Join Video Requests table
export const joinRequests = pgTable("join_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  streamId: varchar("stream_id").notNull().references(() => streams.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const joinRequestsRelations = relations(joinRequests, ({ one }) => ({
  stream: one(streams, { fields: [joinRequests.streamId], references: [streams.id] }),
  user: one(users, { fields: [joinRequests.userId], references: [users.id] }),
}));

export const insertJoinRequestSchema = createInsertSchema(joinRequests).omit({
  id: true,
  createdAt: true,
});
export type InsertJoinRequest = z.infer<typeof insertJoinRequestSchema>;
export type JoinRequest = typeof joinRequests.$inferSelect;

// Groups table
export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  avatar: text("avatar"),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  isPrivate: boolean("is_private").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groupsRelations = relations(groups, ({ one, many }) => ({
  owner: one(users, { fields: [groups.ownerId], references: [users.id] }),
}));

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdAt: true,
});
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;

// Group Members table
export const groupMembers = pgTable("group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, { fields: [groupMembers.groupId], references: [groups.id] }),
  user: one(users, { fields: [groupMembers.userId], references: [users.id] }),
}));

export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({
  id: true,
  joinedAt: true,
});
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type GroupMember = typeof groupMembers.$inferSelect;

// Group Messages table with private media support
export const groupMessages = pgTable("group_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content"),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),
  isPrivateMedia: boolean("is_private_media").notNull().default(false),
  unlockCost: integer("unlock_cost").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groupMessagesRelations = relations(groupMessages, ({ one }) => ({
  group: one(groups, { fields: [groupMessages.groupId], references: [groups.id] }),
  sender: one(users, { fields: [groupMessages.senderId], references: [users.id] }),
}));

export const insertGroupMessageSchema = createInsertSchema(groupMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertGroupMessage = z.infer<typeof insertGroupMessageSchema>;
export type GroupMessage = typeof groupMessages.$inferSelect;

// Media Unlocks table - tracks who has paid to unlock private media
export const mediaUnlocks = pgTable("media_unlocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  messageId: varchar("message_id").notNull(),
  messageType: text("message_type").notNull(),
  coinsPaid: integer("coins_paid").notNull(),
  unlockedAt: timestamp("unlocked_at").notNull().defaultNow(),
});

export const mediaUnlocksRelations = relations(mediaUnlocks, ({ one }) => ({
  user: one(users, { fields: [mediaUnlocks.userId], references: [users.id] }),
}));

export const insertMediaUnlockSchema = createInsertSchema(mediaUnlocks).omit({
  id: true,
  unlockedAt: true,
});
export type InsertMediaUnlock = z.infer<typeof insertMediaUnlockSchema>;
export type MediaUnlock = typeof mediaUnlocks.$inferSelect;

// Room Moderators - users assigned as moderators for a stream
export const roomModerators = pgTable("room_moderators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  streamId: varchar("stream_id").notNull().references(() => streams.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  streamIdIdx: index("room_moderators_stream_id_idx").on(table.streamId),
  userIdIdx: index("room_moderators_user_id_idx").on(table.userId),
}));

export const roomModeratorsRelations = relations(roomModerators, ({ one }) => ({
  stream: one(streams, { fields: [roomModerators.streamId], references: [streams.id] }),
  user: one(users, { fields: [roomModerators.userId], references: [users.id] }),
  assigner: one(users, { fields: [roomModerators.assignedBy], references: [users.id] }),
}));

export const insertRoomModeratorSchema = createInsertSchema(roomModerators).omit({
  id: true,
  createdAt: true,
});
export type InsertRoomModerator = z.infer<typeof insertRoomModeratorSchema>;
export type RoomModerator = typeof roomModerators.$inferSelect;

// Room Bans - users banned from a stream
export const roomBans = pgTable("room_bans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  streamId: varchar("stream_id").notNull().references(() => streams.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  bannedBy: varchar("banned_by").notNull().references(() => users.id),
  reason: text("reason"),
  isPermanent: boolean("is_permanent").notNull().default(false),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  streamIdIdx: index("room_bans_stream_id_idx").on(table.streamId),
  userIdIdx: index("room_bans_user_id_idx").on(table.userId),
}));

export const roomBansRelations = relations(roomBans, ({ one }) => ({
  stream: one(streams, { fields: [roomBans.streamId], references: [streams.id] }),
  user: one(users, { fields: [roomBans.userId], references: [users.id] }),
  banner: one(users, { fields: [roomBans.bannedBy], references: [users.id] }),
}));

export const insertRoomBanSchema = createInsertSchema(roomBans).omit({
  id: true,
  createdAt: true,
});
export type InsertRoomBan = z.infer<typeof insertRoomBanSchema>;
export type RoomBan = typeof roomBans.$inferSelect;

// Room Mutes - temporary mutes with duration
export const roomMutes = pgTable("room_mutes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  streamId: varchar("stream_id").notNull().references(() => streams.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  mutedBy: varchar("muted_by").notNull().references(() => users.id),
  reason: text("reason"),
  durationSeconds: integer("duration_seconds").notNull().default(300), // default 5 mins
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  streamIdIdx: index("room_mutes_stream_id_idx").on(table.streamId),
  userIdIdx: index("room_mutes_user_id_idx").on(table.userId),
  expiresAtIdx: index("room_mutes_expires_at_idx").on(table.expiresAt),
}));

export const roomMutesRelations = relations(roomMutes, ({ one }) => ({
  stream: one(streams, { fields: [roomMutes.streamId], references: [streams.id] }),
  user: one(users, { fields: [roomMutes.userId], references: [users.id] }),
  muter: one(users, { fields: [roomMutes.mutedBy], references: [users.id] }),
}));

export const insertRoomMuteSchema = createInsertSchema(roomMutes).omit({
  id: true,
  createdAt: true,
});
export type InsertRoomMute = z.infer<typeof insertRoomMuteSchema>;
export type RoomMute = typeof roomMutes.$inferSelect;

// Private Calls table - paid 1:1 video calls between viewer and host
export const privateCalls = pgTable("private_calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  viewerId: varchar("viewer_id").notNull().references(() => users.id),
  hostId: varchar("host_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // pending, accepted, declined, active, ended, cancelled
  billingMode: text("billing_mode").notNull().default("per_minute"), // per_minute or per_session
  ratePerMinute: integer("rate_per_minute").notNull().default(0),
  sessionPrice: integer("session_price").notNull().default(0),
  totalCharged: integer("total_charged").notNull().default(0),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  agoraChannel: text("agora_channel"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  endReason: text("end_reason"), // viewer_ended, host_ended, insufficient_funds, timeout, network_error
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  viewerIdIdx: index("private_calls_viewer_id_idx").on(table.viewerId),
  hostIdIdx: index("private_calls_host_id_idx").on(table.hostId),
  statusIdx: index("private_calls_status_idx").on(table.status),
}));

export const privateCallsRelations = relations(privateCalls, ({ one }) => ({
  viewer: one(users, { fields: [privateCalls.viewerId], references: [users.id] }),
  host: one(users, { fields: [privateCalls.hostId], references: [users.id] }),
}));

export const insertPrivateCallSchema = createInsertSchema(privateCalls).omit({
  id: true,
  createdAt: true,
});
export type InsertPrivateCall = z.infer<typeof insertPrivateCallSchema>;
export type PrivateCall = typeof privateCalls.$inferSelect;
