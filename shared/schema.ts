import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, boolean, timestamp, index, doublePrecision } from "drizzle-orm/pg-core";
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
  xp: integer("xp").notNull().default(0),
  lastDailyLoginBonus: timestamp("last_daily_login_bonus"),
  dailyLoginStreak: integer("daily_login_streak").notNull().default(0),
  coins: integer("coins").notNull().default(0),
  diamonds: integer("diamonds").notNull().default(0),
  earnings: integer("earnings").notNull().default(0), // Host earnings from gifts + calls
  followersCount: integer("followers_count").notNull().default(0),
  followingCount: integer("following_count").notNull().default(0),
  totalLikes: integer("total_likes").notNull().default(0),
  isLive: boolean("is_live").notNull().default(false),
  vipTier: integer("vip_tier").notNull().default(0),
  dndEnabled: boolean("dnd_enabled").notNull().default(false),
  availableForPrivateCall: boolean("available_for_private_call").notNull().default(true),
  privateCallRate: integer("private_call_rate").notNull().default(0), // coins per minute (0 = free)
  privateCallBillingMode: text("private_call_billing_mode").notNull().default("per_minute"), // per_minute or per_session
  privateCallSessionPrice: integer("private_call_session_price").notNull().default(0), // flat fee for per_session (0 = free)
  role: text("role").notNull().default("user"), // user, admin, superadmin
  phone: text("phone").unique(),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  gender: text("gender"), // male, female, other, prefer_not_to_say
  birthdate: timestamp("birthdate"),
  isGuest: boolean("is_guest").notNull().default(false),
  socialProvider: text("social_provider"), // google, apple, github, email, phone
  socialProviderId: text("social_provider_id"), // Provider's unique user ID
  privacySettings: text("privacy_settings"), // JSON string for privacy settings
  notificationSettings: text("notification_settings"), // JSON string for notification settings
  language: text("language").notNull().default("en"), // User's preferred language
  isVerified: boolean("is_verified").notNull().default(false),
  verificationBadge: text("verification_badge"), // official, creator, celebrity, talent
  totalSpent: integer("total_spent").notNull().default(0), // Total coins spent (for wealth level)
  profileViews: integer("profile_views").notNull().default(0),
  referralCode: text("referral_code").unique(),
  referredBy: varchar("referred_by"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  usernameIdx: index("username_idx").on(table.username),
  emailIdx: index("email_idx").on(table.email),
  phoneIdx: index("phone_idx").on(table.phone),
  referralCodeIdx: index("referral_code_idx").on(table.referralCode),
}));

// Phone verification codes table
export const phoneVerificationCodes = pgTable("phone_verification_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  phoneIdx: index("phone_code_idx").on(table.phone),
}));

export const insertPhoneVerificationCodeSchema = createInsertSchema(phoneVerificationCodes).omit({
  id: true,
  createdAt: true,
});
export type InsertPhoneVerificationCode = z.infer<typeof insertPhoneVerificationCodeSchema>;
export type PhoneVerificationCode = typeof phoneVerificationCodes.$inferSelect

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Admin Users table (separate from main users)
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;

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
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  showCountry: boolean("show_country").notNull().default(true),
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
  isEdited: boolean("is_edited").notNull().default(false),
  replyToId: varchar("reply_to_id"),
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

// Store Items table - catalog of items available for purchase
export const storeItems = pgTable("store_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  emoji: text("emoji").notNull(),
  imageUrl: text("image_url"),
  type: text("type").notNull(), // frame, entrance, badge, chat_bubble, effect, vehicle
  coinCost: integer("coin_cost").notNull(),
  diamondCost: integer("diamond_cost").notNull().default(0),
  durationDays: integer("duration_days"), // null = permanent
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  requiredVipTier: integer("required_vip_tier").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  typeIdx: index("store_items_type_idx").on(table.type),
  isActiveIdx: index("store_items_active_idx").on(table.isActive),
}));

export const insertStoreItemSchema = createInsertSchema(storeItems).omit({
  id: true,
  createdAt: true,
});
export type InsertStoreItem = z.infer<typeof insertStoreItemSchema>;
export type StoreItem = typeof storeItems.$inferSelect;

// User Items table - items owned by users (inventory)
export const userItems = pgTable("user_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  itemId: varchar("item_id").notNull().references(() => storeItems.id),
  isEquipped: boolean("is_equipped").notNull().default(false),
  expiresAt: timestamp("expires_at"), // null = permanent
  purchasedAt: timestamp("purchased_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("user_items_user_id_idx").on(table.userId),
  itemIdIdx: index("user_items_item_id_idx").on(table.itemId),
  equippedIdx: index("user_items_equipped_idx").on(table.isEquipped),
}));

export const userItemsRelations = relations(userItems, ({ one }) => ({
  user: one(users, { fields: [userItems.userId], references: [users.id] }),
  item: one(storeItems, { fields: [userItems.itemId], references: [storeItems.id] }),
}));

export const insertUserItemSchema = createInsertSchema(userItems).omit({
  id: true,
  purchasedAt: true,
});
export type InsertUserItem = z.infer<typeof insertUserItemSchema>;
export type UserItem = typeof userItems.$inferSelect;

// Families table - social groups/clans
export const families = pgTable("families", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  avatar: text("avatar"),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  memberCount: integer("member_count").notNull().default(1),
  maxMembers: integer("max_members").notNull().default(20),
  totalGifts: integer("total_gifts").notNull().default(0),
  weeklyGifts: integer("weekly_gifts").notNull().default(0),
  isPublic: boolean("is_public").notNull().default(true),
  minLevel: integer("min_level").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  nameIdx: index("families_name_idx").on(table.name),
  ownerIdIdx: index("families_owner_id_idx").on(table.ownerId),
}));

export const familiesRelations = relations(families, ({ one, many }) => ({
  owner: one(users, { fields: [families.ownerId], references: [users.id] }),
  members: many(familyMembers),
  messages: many(familyMessages),
}));

export const insertFamilySchema = createInsertSchema(families).omit({
  id: true,
  createdAt: true,
  memberCount: true,
  totalGifts: true,
  weeklyGifts: true,
});
export type InsertFamily = z.infer<typeof insertFamilySchema>;
export type Family = typeof families.$inferSelect;

// Family Members table
export const familyMembers = pgTable("family_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").notNull().references(() => families.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: text("role").notNull().default("member"), // owner, admin, member
  contributedGifts: integer("contributed_gifts").notNull().default(0),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (table) => ({
  familyIdIdx: index("family_members_family_id_idx").on(table.familyId),
  userIdIdx: index("family_members_user_id_idx").on(table.userId),
}));

export const familyMembersRelations = relations(familyMembers, ({ one }) => ({
  family: one(families, { fields: [familyMembers.familyId], references: [families.id] }),
  user: one(users, { fields: [familyMembers.userId], references: [users.id] }),
}));

export const insertFamilyMemberSchema = createInsertSchema(familyMembers).omit({
  id: true,
  joinedAt: true,
  contributedGifts: true,
});
export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;
export type FamilyMember = typeof familyMembers.$inferSelect;

// Family Messages table - group chat
export const familyMessages = pgTable("family_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").notNull().references(() => families.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  familyIdIdx: index("family_messages_family_id_idx").on(table.familyId),
  createdAtIdx: index("family_messages_created_at_idx").on(table.createdAt),
}));

export const familyMessagesRelations = relations(familyMessages, ({ one }) => ({
  family: one(families, { fields: [familyMessages.familyId], references: [families.id] }),
  user: one(users, { fields: [familyMessages.userId], references: [users.id] }),
}));

export const insertFamilyMessageSchema = createInsertSchema(familyMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertFamilyMessage = z.infer<typeof insertFamilyMessageSchema>;
export type FamilyMessage = typeof familyMessages.$inferSelect;

// Achievements table - unlockable milestones
export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  emoji: text("emoji").notNull(),
  category: text("category").notNull(), // streaming, social, gifting, spending, leveling
  requirement: text("requirement").notNull(), // JSON: { type: "followers", value: 100 }
  rewardXp: integer("reward_xp").notNull().default(0),
  rewardCoins: integer("reward_coins").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  createdAt: true,
});
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;

// User Achievements - tracks which achievements users have unlocked
export const userAchievements = pgTable("user_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  achievementId: varchar("achievement_id").notNull().references(() => achievements.id),
  unlockedAt: timestamp("unlocked_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("user_achievements_user_id_idx").on(table.userId),
  achievementIdIdx: index("user_achievements_achievement_id_idx").on(table.achievementId),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, { fields: [userAchievements.userId], references: [users.id] }),
  achievement: one(achievements, { fields: [userAchievements.achievementId], references: [achievements.id] }),
}));

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  unlockedAt: true,
});
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;

// Profile Visits - tracks who visited whose profile
export const profileVisits = pgTable("profile_visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull().references(() => users.id),
  visitorId: varchar("visitor_id").references(() => users.id), // null for anonymous
  visitedAt: timestamp("visited_at").notNull().defaultNow(),
}, (table) => ({
  profileIdIdx: index("profile_visits_profile_id_idx").on(table.profileId),
  visitedAtIdx: index("profile_visits_visited_at_idx").on(table.visitedAt),
}));

export const profileVisitsRelations = relations(profileVisits, ({ one }) => ({
  profile: one(users, { fields: [profileVisits.profileId], references: [users.id] }),
  visitor: one(users, { fields: [profileVisits.visitorId], references: [users.id] }),
}));

export const insertProfileVisitSchema = createInsertSchema(profileVisits).omit({
  id: true,
  visitedAt: true,
});
export type InsertProfileVisit = z.infer<typeof insertProfileVisitSchema>;
export type ProfileVisit = typeof profileVisits.$inferSelect;

// Coin Purchases table - tracks all coin purchases
export const coinPurchases = pgTable("coin_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  packageCoins: integer("package_coins").notNull(),
  bonusCoins: integer("bonus_coins").notNull().default(0),
  totalCoins: integer("total_coins").notNull(),
  priceUsd: doublePrecision("price_usd").notNull(),
  isFirstPurchase: boolean("is_first_purchase").notNull().default(false),
  stripeSessionId: text("stripe_session_id").unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("coin_purchases_user_id_idx").on(table.userId),
  createdAtIdx: index("coin_purchases_created_at_idx").on(table.createdAt),
}));

export const coinPurchasesRelations = relations(coinPurchases, ({ one }) => ({
  user: one(users, { fields: [coinPurchases.userId], references: [users.id] }),
}));

export const insertCoinPurchaseSchema = createInsertSchema(coinPurchases).omit({
  id: true,
  createdAt: true,
});
export type InsertCoinPurchase = z.infer<typeof insertCoinPurchaseSchema>;
export type CoinPurchase = typeof coinPurchases.$inferSelect;

export const userBlocks = pgTable("user_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blockerId: varchar("blocker_id").notNull().references(() => users.id),
  blockedId: varchar("blocked_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  blockerIdIdx: index("user_blocks_blocker_id_idx").on(table.blockerId),
  blockedIdIdx: index("user_blocks_blocked_id_idx").on(table.blockedId),
}));

export const userBlocksRelations = relations(userBlocks, ({ one }) => ({
  blocker: one(users, { fields: [userBlocks.blockerId], references: [users.id] }),
  blocked: one(users, { fields: [userBlocks.blockedId], references: [users.id] }),
}));

export const insertUserBlockSchema = createInsertSchema(userBlocks).omit({
  id: true,
  createdAt: true,
});
export type InsertUserBlock = z.infer<typeof insertUserBlockSchema>;
export type UserBlock = typeof userBlocks.$inferSelect;

export const userReports = pgTable("user_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").notNull().references(() => users.id),
  reportedId: varchar("reported_id").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  reporterIdIdx: index("user_reports_reporter_id_idx").on(table.reporterId),
  reportedIdIdx: index("user_reports_reported_id_idx").on(table.reportedId),
}));

export const userReportsRelations = relations(userReports, ({ one }) => ({
  reporter: one(users, { fields: [userReports.reporterId], references: [users.id] }),
  reported: one(users, { fields: [userReports.reportedId], references: [users.id] }),
}));

export const insertUserReportSchema = createInsertSchema(userReports).omit({
  id: true,
  status: true,
  createdAt: true,
});
export type InsertUserReport = z.infer<typeof insertUserReportSchema>;
export type UserReport = typeof userReports.$inferSelect;

export const userMutedCalls = pgTable("user_muted_calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  mutedUserId: varchar("muted_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("user_muted_calls_user_id_idx").on(table.userId),
  mutedUserIdIdx: index("user_muted_calls_muted_user_id_idx").on(table.mutedUserId),
}));

export const userMutedCallsRelations = relations(userMutedCalls, ({ one }) => ({
  user: one(users, { fields: [userMutedCalls.userId], references: [users.id] }),
  mutedUser: one(users, { fields: [userMutedCalls.mutedUserId], references: [users.id] }),
}));

export const insertUserMutedCallSchema = createInsertSchema(userMutedCalls).omit({
  id: true,
  createdAt: true,
});
export type InsertUserMutedCall = z.infer<typeof insertUserMutedCallSchema>;
export type UserMutedCall = typeof userMutedCalls.$inferSelect;

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // follow, gift, call_request, system, level_up
  title: text("title").notNull(),
  message: text("message").notNull(),
  metadata: text("metadata"), // JSON string for extra data
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("notifications_user_id_idx").on(table.userId),
  createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Push Subscriptions table
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("push_sub_user_id_idx").on(table.userId),
  endpointIdx: index("push_sub_endpoint_idx").on(table.endpoint),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, { fields: [pushSubscriptions.userId], references: [users.id] }),
}));

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
});
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// Scheduled Events table
export const scheduledEvents = pgTable("scheduled_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hostId: varchar("host_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default("General"),
  coverImage: text("cover_image"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  rsvpCount: integer("rsvp_count").notNull().default(0),
  status: text("status").notNull().default("upcoming"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  hostIdIdx: index("events_host_id_idx").on(table.hostId),
  scheduledAtIdx: index("events_scheduled_at_idx").on(table.scheduledAt),
  statusIdx: index("events_status_idx").on(table.status),
}));

export const scheduledEventsRelations = relations(scheduledEvents, ({ one }) => ({
  host: one(users, { fields: [scheduledEvents.hostId], references: [users.id] }),
}));

export const insertScheduledEventSchema = createInsertSchema(scheduledEvents).omit({
  id: true,
  rsvpCount: true,
  createdAt: true,
});
export type InsertScheduledEvent = z.infer<typeof insertScheduledEventSchema>;
export type ScheduledEvent = typeof scheduledEvents.$inferSelect;

// Event RSVPs table
export const eventRsvps = pgTable("event_rsvps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => scheduledEvents.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  eventIdIdx: index("rsvps_event_id_idx").on(table.eventId),
  userIdIdx: index("rsvps_user_id_idx").on(table.userId),
  uniqueRsvp: index("rsvps_unique_idx").on(table.eventId, table.userId),
}));

export const eventRsvpsRelations = relations(eventRsvps, ({ one }) => ({
  event: one(scheduledEvents, { fields: [eventRsvps.eventId], references: [scheduledEvents.id] }),
  user: one(users, { fields: [eventRsvps.userId], references: [users.id] }),
}));

export const insertEventRsvpSchema = createInsertSchema(eventRsvps).omit({
  id: true,
  createdAt: true,
});
export type InsertEventRsvp = z.infer<typeof insertEventRsvpSchema>;
export type EventRsvp = typeof eventRsvps.$inferSelect;

// Export Replit Auth models (sessions table is mandatory)
export * from "./models/auth";
