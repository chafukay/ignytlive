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
  followersCount: integer("followers_count").notNull().default(0),
  followingCount: integer("following_count").notNull().default(0),
  totalLikes: integer("total_likes").notNull().default(0),
  isLive: boolean("is_live").notNull().default(false),
  vipTier: integer("vip_tier").notNull().default(0),
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
