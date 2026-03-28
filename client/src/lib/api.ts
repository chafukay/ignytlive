import type { User, Stream, Short, Gift, GiftTransaction, Message, Badge, UserBadge, WishlistItem, WheelPrize, WheelSpin, CallRequest, StreamGoal, JoinRequest, Group, GroupMember, GroupMessage, MediaUnlock, Notification, ScheduledEvent } from "@shared/schema";
import { getAuthToken } from "./auth-context";

const API_BASE = "";

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

function authJsonHeaders(): Record<string, string> {
  return authHeaders({ "Content-Type": "application/json" });
}

export const api = {
  // Auth
  async register(username: string, email: string, password: string, birthdate?: string) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, birthdate }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ user: User; token?: string; verifyToken?: string }>;
  },

  async login(username: string, password: string) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ user: User; token?: string; verifyToken?: string }>;
  },

  async sendPhoneCode(phone: string) {
    const res = await fetch(`${API_BASE}/api/auth/phone/send-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ success: boolean; message: string; smsConfigured: boolean }>;
  },

  async verifyPhoneCode(phone: string, code: string) {
    const res = await fetch(`${API_BASE}/api/auth/phone/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ user: User; token?: string }>;
  },

  async sendEmailVerification(userId: string, verifyToken: string) {
    const res = await fetch(`${API_BASE}/api/auth/send-email-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, verifyToken }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to send verification code");
    }
    return res.json() as Promise<{ message: string }>;
  },

  async verifyEmail(userId: string, code: string, verifyToken: string) {
    const res = await fetch(`${API_BASE}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, code, verifyToken }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Verification failed");
    }
    return res.json() as Promise<{ user: User; message: string }>;
  },

  async guestLogin(data: { username?: string; birthdate: string; disclaimerAccepted: boolean }) {
    const res = await fetch(`${API_BASE}/api/auth/guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to create guest session" }));
      throw new Error(err.error || "Failed to create guest session");
    }
    return res.json() as Promise<{ user: User; token?: string }>;
  },

  // Location
  async updateUserLocation(userId: string, location: { latitude: number; longitude: number; city?: string; state?: string; country?: string }) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(location),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<User>;
  },

  async getNearbyStreams(latitude: number, longitude: number, radius: number = 100) {
    const res = await fetch(`${API_BASE}/api/streams/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<(Stream & { user: User; distance: number })[]>;
  },

  // Users
  async getUser(id: string) {
    const res = await fetch(`${API_BASE}/api/users/${id}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<User>;
  },

  async searchUsers(query: string) {
    const res = await fetch(`${API_BASE}/api/users/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<User[]>;
  },

  async getStreamers() {
    const res = await fetch(`${API_BASE}/api/streamers`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<User[]>;
  },

  async detectCountry() {
    const res = await fetch(`${API_BASE}/api/geo/detect`);
    if (!res.ok) return { country: null, countryCode: null };
    return res.json() as Promise<{ country: string | null; countryCode: string | null }>;
  },

  async getAllUsers() {
    const adminToken = localStorage.getItem("adminToken");
    const headers: Record<string, string> = {};
    if (adminToken) {
      headers["Authorization"] = `Bearer ${adminToken}`;
    }
    const res = await fetch(`${API_BASE}/api/admin/users`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<User[]>;
  },

  async deleteAccount(userId: string, password: string) {
    const res = await fetch(`${API_BASE}/api/auth/delete-account`, {
      method: "DELETE",
      headers: authJsonHeaders(),
      body: JSON.stringify({ userId, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Failed to delete account" }));
      throw new Error(data.error || "Failed to delete account");
    }
    return res.json();
  },

  async updateUser(userId: string, updates: Partial<User>) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/profile`, {
      method: "PATCH",
      headers: authJsonHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<User>;
  },

  async updateUserAdmin(userId: string, updates: Partial<User>) {
    const adminToken = localStorage.getItem("adminToken");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (adminToken) {
      headers["Authorization"] = `Bearer ${adminToken}`;
    }
    const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<User>;
  },

  async getFollowers(userId: string) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/followers`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<User[]>;
  },

  async getFollowing(userId: string) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/following`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<User[]>;
  },

  async followUser(followerId: string, followingId: string) {
    const res = await fetch(`${API_BASE}/api/follows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followerId, followingId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async unfollowUser(followerId: string, followingId: string) {
    const res = await fetch(`${API_BASE}/api/follows`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followerId, followingId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async isFollowing(followerId: string, followingId: string) {
    const res = await fetch(`${API_BASE}/api/follows/check?followerId=${followerId}&followingId=${followingId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ isFollowing: boolean }>;
  },

  // Streams
  async getLiveStreams(limit = 20, sort = "popular", cursor?: string) {
    const params = new URLSearchParams({ limit: String(limit), sort });
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`${API_BASE}/api/streams/live?${params}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ streams: Array<Stream & { user: User }>; nextCursor: string | null }>;
  },

  async getStream(id: string) {
    const res = await fetch(`${API_BASE}/api/streams/${id}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Stream>;
  },

  async createStream(data: { 
    userId: string; 
    title: string; 
    description?: string; 
    category?: string;
    thumbnail?: string;
    isPrivate?: boolean;
    accessType?: string;
    minVipTier?: number;
    groupId?: string;
    showCountry?: boolean;
  }) {
    const res = await fetch(`${API_BASE}/api/streams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Stream>;
  },

  async updateStream(id: string, updates: Partial<Stream>) {
    const res = await fetch(`${API_BASE}/api/streams/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Stream>;
  },

  async postStreamComment(streamId: string, data: { userId: string; text: string }) {
    const res = await fetch(`${API_BASE}/api/streams/${streamId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async endStream(streamId: string, userId: string) {
    const res = await fetch(`${API_BASE}/api/streams/${streamId}/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Stream>;
  },

  // Shorts
  async getShortsFeed(limit = 20) {
    const res = await fetch(`${API_BASE}/api/shorts/feed?limit=${limit}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Array<Short & { user: User }>>;
  },

  async getShort(id: string) {
    const res = await fetch(`${API_BASE}/api/shorts/${id}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Short>;
  },

  async getUserShorts(userId: string) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/shorts`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Short[]>;
  },

  async createShort(data: { userId: string; videoUrl: string; description?: string; duration?: number; song?: string; thumbnail?: string }) {
    const res = await fetch(`${API_BASE}/api/shorts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Short>;
  },

  async likeShort(shortId: string, userId: string): Promise<{ success: boolean; liked: boolean }> {
    const res = await fetch(`${API_BASE}/api/shorts/${shortId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async isShortLiked(shortId: string, userId: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/api/shorts/${shortId}/liked/${userId}`);
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.liked;
  },

  async getShortComments(shortId: string) {
    const res = await fetch(`${API_BASE}/api/shorts/${shortId}/comments`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async createShortComment(shortId: string, userId: string, content: string, parentId?: string) {
    const res = await fetch(`${API_BASE}/api/shorts/${shortId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, content, parentId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async deleteShortComment(commentId: string, userId: string) {
    const res = await fetch(`${API_BASE}/api/shorts/comments/${commentId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async reactToComment(commentId: string, userId: string, reaction: string) {
    const res = await fetch(`${API_BASE}/api/shorts/comments/${commentId}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, reaction }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async removeCommentReaction(commentId: string, userId: string) {
    const res = await fetch(`${API_BASE}/api/shorts/comments/${commentId}/react`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getCommentReactions(commentId: string) {
    const res = await fetch(`${API_BASE}/api/shorts/comments/${commentId}/reactions`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getUserCommentReaction(commentId: string, userId: string) {
    const res = await fetch(`${API_BASE}/api/shorts/comments/${commentId}/reactions/${userId}`);
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.reaction;
  },

  // Follows
  async follow(followerId: string, followingId: string) {
    const res = await fetch(`${API_BASE}/api/follows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followerId, followingId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async unfollow(followerId: string, followingId: string) {
    const res = await fetch(`${API_BASE}/api/follows`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followerId, followingId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Gifts
  async getGifts() {
    const res = await fetch(`${API_BASE}/api/gifts`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Gift[]>;
  },

  async sendGift(data: {
    giftId: string;
    senderId: string;
    receiverId: string;
    streamId?: string;
    quantity: number;
    totalCoins: number;
  }) {
    const res = await fetch(`${API_BASE}/api/gifts/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<GiftTransaction>;
  },

  // Messages
  async sendMessage(senderId: string, receiverId: string, content: string, replyToId?: string) {
    const res = await fetch(`${API_BASE}/api/messages`, {
      method: "POST",
      headers: authJsonHeaders(),
      body: JSON.stringify({ senderId, receiverId, content, ...(replyToId ? { replyToId } : {}) }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Failed to send message" }));
      const error = new Error(errorData.error || "Failed to send message") as Error & { code?: string };
      error.code = errorData.code;
      throw error;
    }
    return res.json() as Promise<Message>;
  },

  async getConversation(userId1: string, userId2: string) {
    const res = await fetch(`${API_BASE}/api/messages/conversation?userId1=${userId1}&userId2=${userId2}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Message[]>;
  },

  async getRecentChats(userId: string) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/chats`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Array<{ user: User; lastMessage: Message }>>;
  },

  async getUnreadMessageCount(userId: string) {
    const res = await fetch(`${API_BASE}/api/messages/unread-count/${userId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ total: number; perSender: Array<{ senderId: string; count: number }> }>;
  },

  async markMessagesAsRead(userId: string, otherUserId: string) {
    const res = await fetch(`${API_BASE}/api/messages/mark-read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, otherUserId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ success: boolean }>;
  },

  async deleteConversation(userId1: string, userId2: string) {
    const res = await fetch(`${API_BASE}/api/messages/conversation/${userId1}/${userId2}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async deleteMessage(messageId: string, userId: string) {
    const res = await fetch(`${API_BASE}/api/messages/${messageId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async editMessage(messageId: string, userId: string, content: string) {
    const res = await fetch(`${API_BASE}/api/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, content }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async translateText(text: string, targetLang: string = "en") {
    const res = await fetch(`${API_BASE}/api/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLang }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async deleteMultipleConversations(userId: string, otherUserIds: string[]) {
    const res = await fetch(`${API_BASE}/api/messages/delete-conversations`, {
      method: "POST",
      headers: authJsonHeaders(),
      body: JSON.stringify({ otherUserIds }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async blockUser(userId: string, blockedId: string) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/block/${blockedId}`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async unblockUser(userId: string, blockedId: string) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/block/${blockedId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async isUserBlocked(userId: string, otherUserId: string) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/blocked/${otherUserId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ blocked: boolean }>;
  },

  async reportUser(userId: string, reportedId: string, reason: string, description?: string) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/report/${reportedId}`, {
      method: "POST",
      headers: authJsonHeaders(),
      body: JSON.stringify({ reason, description }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async muteCallsFromUser(userId: string, mutedUserId: string) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/mute-calls/${mutedUserId}`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async unmuteCallsFromUser(userId: string, mutedUserId: string) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/mute-calls/${mutedUserId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async isCallMuted(userId: string, mutedUserId: string) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/mute-calls/${mutedUserId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ muted: boolean }>;
  },

  // Leaderboard
  async getLeaderboard(period: "daily" | "weekly" | "alltime") {
    const res = await fetch(`${API_BASE}/api/leaderboard/${period}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<User[]>;
  },

  // Badges
  async getBadges() {
    const res = await fetch(`${API_BASE}/api/badges`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Badge[]>;
  },

  async getUserBadges(userId: string) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/badges`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<(UserBadge & { badge: Badge })[]>;
  },

  async awardBadge(userId: string, badgeId: string) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/badges`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ badgeId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<UserBadge>;
  },

  // Wishlist
  async getWishlist(userId: string) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/wishlist`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<WishlistItem[]>;
  },

  async createWishlistItem(data: { userId: string; name: string; description?: string; targetAmount: number; imageUrl?: string }) {
    const res = await fetch(`${API_BASE}/api/wishlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<WishlistItem>;
  },

  async contributeToWishlist(itemId: string, amount: number) {
    const res = await fetch(`${API_BASE}/api/wishlist/${itemId}/contribute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<WishlistItem>;
  },

  // Wheel
  async getWheelPrizes() {
    const res = await fetch(`${API_BASE}/api/wheel/prizes`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<WheelPrize[]>;
  },

  async spinWheel(userId: string, streamId?: string) {
    const res = await fetch(`${API_BASE}/api/wheel/spin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, streamId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<WheelSpin & { prize: WheelPrize }>;
  },

  // DND
  async toggleDND(userId: string, enabled: boolean) {
    const token = localStorage.getItem("authToken");
    const res = await fetch(`${API_BASE}/api/users/${userId}/dnd`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<User>;
  },

  // 1-on-1 Calls
  async requestCall(data: { callerId: string; receiverId: string; coinCost: number }) {
    const res = await fetch(`${API_BASE}/api/calls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<CallRequest>;
  },

  async updateCall(callId: string, updates: Partial<CallRequest>) {
    const res = await fetch(`${API_BASE}/api/calls/${callId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<CallRequest>;
  },

  async getUserCalls(userId: string) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/calls`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<CallRequest[]>;
  },

  // Stream Goals
  async getStreamGoals(streamId: string) {
    const res = await fetch(`${API_BASE}/api/streams/${streamId}/goals`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<StreamGoal[]>;
  },

  async createStreamGoal(streamId: string, data: { title: string; targetCoins: number; rewardDescription?: string }) {
    const res = await fetch(`${API_BASE}/api/streams/${streamId}/goals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<StreamGoal>;
  },

  async contributeToGoal(goalId: string, amount: number) {
    const res = await fetch(`${API_BASE}/api/goals/${goalId}/contribute`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<StreamGoal>;
  },

  // Join Video Requests
  async getJoinRequests(streamId: string) {
    const res = await fetch(`${API_BASE}/api/streams/${streamId}/join-requests`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Array<JoinRequest & { user: User }>>;
  },

  async requestJoinVideo(streamId: string, userId: string) {
    const res = await fetch(`${API_BASE}/api/streams/${streamId}/join-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<JoinRequest>;
  },

  async updateJoinRequest(requestId: string, status: string) {
    const res = await fetch(`${API_BASE}/api/join-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<JoinRequest>;
  },

  // PK Battle
  async togglePKBattle(streamId: string, isPKBattle: boolean, userId: string) {
    const res = await fetch(`${API_BASE}/api/streams/${streamId}/pk-battle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPKBattle, userId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Stream>;
  },

  // Groups
  async createGroup(name: string, ownerId: string, description?: string, isPrivate = true) {
    const res = await fetch(`${API_BASE}/api/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ownerId, description, isPrivate }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Group>;
  },

  async getGroup(id: string) {
    const res = await fetch(`${API_BASE}/api/groups/${id}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Group>;
  },

  async getUserGroups(userId: string) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/groups`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Array<Group & { memberCount: number }>>;
  },

  async updateGroup(id: string, updates: Partial<Group>) {
    const res = await fetch(`${API_BASE}/api/groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Group>;
  },

  async deleteGroup(id: string) {
    const res = await fetch(`${API_BASE}/api/groups/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Group Members
  async getGroupMembers(groupId: string) {
    const res = await fetch(`${API_BASE}/api/groups/${groupId}/members`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Array<GroupMember & { user: User }>>;
  },

  async addGroupMember(groupId: string, userId: string, role = "member") {
    const res = await fetch(`${API_BASE}/api/groups/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<GroupMember>;
  },

  async removeGroupMember(groupId: string, userId: string) {
    const res = await fetch(`${API_BASE}/api/groups/${groupId}/members/${userId}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async checkGroupMembership(groupId: string, userId: string) {
    const res = await fetch(`${API_BASE}/api/groups/${groupId}/members/${userId}/check`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ isMember: boolean }>;
  },

  // Group Messages
  async getGroupMessages(groupId: string) {
    const res = await fetch(`${API_BASE}/api/groups/${groupId}/messages`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Array<GroupMessage & { sender: User }>>;
  },

  async sendGroupMessage(groupId: string, senderId: string, content?: string, mediaUrl?: string, mediaType?: string, isPrivateMedia = false, unlockCost = 0) {
    const res = await fetch(`${API_BASE}/api/groups/${groupId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderId, content, mediaUrl, mediaType, isPrivateMedia, unlockCost }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<GroupMessage>;
  },

  // Media Unlock
  async unlockMedia(userId: string, messageId: string, messageType: string, coinsPaid: number) {
    const res = await fetch(`${API_BASE}/api/media/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, messageId, messageType, coinsPaid }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<MediaUnlock>;
  },

  async checkMediaUnlock(userId: string, messageId: string, messageType: string) {
    const res = await fetch(`${API_BASE}/api/media/unlock/check?userId=${userId}&messageId=${messageId}&messageType=${messageType}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ unlocked: boolean }>;
  },

  // Private Calls
  async requestPrivateCall(viewerId: string, hostId: string) {
    const res = await fetch(`${API_BASE}/api/private-calls/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ viewerId, hostId }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Failed to request call" }));
      const error = new Error(errorData.error || "Failed to request call") as Error & { code?: string };
      error.code = errorData.code;
      throw error;
    }
    return res.json();
  },

  async acceptPrivateCall(callId: string, userId: string) {
    const res = await fetch(`${API_BASE}/api/private-calls/${callId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async declinePrivateCall(callId: string, userId: string) {
    const res = await fetch(`${API_BASE}/api/private-calls/${callId}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async endPrivateCall(callId: string, userId: string, endReason?: string) {
    const res = await fetch(`${API_BASE}/api/private-calls/${callId}/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endReason, userId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async billPrivateCallMinute(callId: string, userId: string) {
    const res = await fetch(`${API_BASE}/api/private-calls/${callId}/bill-minute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Billing failed");
    }
    return res.json();
  },

  async getPendingPrivateCalls(hostId: string) {
    const res = await fetch(`${API_BASE}/api/private-calls/pending/${hostId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getPrivateCallHistory(userId: string) {
    const res = await fetch(`${API_BASE}/api/private-calls/history/${userId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getActivePrivateCall(userId: string) {
    const res = await fetch(`${API_BASE}/api/private-calls/active/${userId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getPrivateCall(callId: string) {
    const res = await fetch(`${API_BASE}/api/private-calls/${callId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updatePrivateCallSettings(userId: string, settings: {
    availableForPrivateCall?: boolean;
    privateCallRate?: number;
    privateCallBillingMode?: string;
    privateCallSessionPrice?: number;
  }) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/private-call-settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...settings, userId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // ========== Moderation API ==========
  
  async addRoomModerator(streamId: string, userId: string, assignedBy: string) {
    const res = await fetch(`${API_BASE}/api/streams/${streamId}/moderators`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, assignedBy }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async removeRoomModerator(streamId: string, userId: string, requesterId: string) {
    const res = await fetch(`${API_BASE}/api/streams/${streamId}/moderators/${userId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requesterId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getRoomModerators(streamId: string) {
    const res = await fetch(`${API_BASE}/api/streams/${streamId}/moderators`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async banUser(streamId: string, userId: string, bannedBy: string, reason?: string, isPermanent = false, durationSeconds = 3600) {
    const res = await fetch(`${API_BASE}/api/streams/${streamId}/bans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, bannedBy, reason, isPermanent, durationSeconds }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async unbanUser(streamId: string, userId: string, requesterId: string) {
    const res = await fetch(`${API_BASE}/api/streams/${streamId}/bans/${userId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requesterId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getRoomBans(streamId: string) {
    const res = await fetch(`${API_BASE}/api/streams/${streamId}/bans`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async checkUserBanned(streamId: string, userId: string) {
    const res = await fetch(`${API_BASE}/api/streams/${streamId}/bans/${userId}/check`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async muteUser(streamId: string, userId: string, mutedBy: string, reason?: string, durationSeconds = 300) {
    const res = await fetch(`${API_BASE}/api/streams/${streamId}/mutes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, mutedBy, reason, durationSeconds }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async unmuteUser(streamId: string, userId: string, requesterId: string) {
    const res = await fetch(`${API_BASE}/api/streams/${streamId}/mutes/${userId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requesterId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getRoomMutes(streamId: string) {
    const res = await fetch(`${API_BASE}/api/streams/${streamId}/mutes`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async checkUserMuted(streamId: string, userId: string) {
    const res = await fetch(`${API_BASE}/api/streams/${streamId}/mutes/${userId}/check`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateStreamSettings(streamId: string, userId: string, settings: { slowModeSeconds?: number; pinnedMessageId?: string | null }) {
    const res = await fetch(`${API_BASE}/api/streams/${streamId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...settings, userId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getModerationInfo(streamId: string, userId: string) {
    const res = await fetch(`${API_BASE}/api/streams/${streamId}/moderation/${userId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Store & Inventory
  async getStoreItems(type?: string) {
    const url = type ? `${API_BASE}/api/store/items?type=${type}` : `${API_BASE}/api/store/items`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getStoreItem(id: string) {
    const res = await fetch(`${API_BASE}/api/store/items/${id}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async purchaseItem(userId: string, itemId: string) {
    const res = await fetch(`${API_BASE}/api/store/purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, itemId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getUserItems(userId: string) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/items`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getEquippedItems(userId: string) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/equipped-items`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async equipItem(userItemId: string) {
    const res = await fetch(`${API_BASE}/api/user-items/${userItemId}/equip`, {
      method: "PATCH",
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async unequipItem(userItemId: string) {
    const res = await fetch(`${API_BASE}/api/user-items/${userItemId}/unequip`, {
      method: "PATCH",
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getTopGifters(userId: string, limit: number = 20) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/top-gifters?limit=${limit}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<TopGifter[]>;
  },

  async generateReferralCode(userId: string) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/referral-code`, {
      method: "POST",
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ referralCode: string }>;
  },

  async applyReferralCode(userId: string, referralCode: string) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/apply-referral`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralCode }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ success: boolean; bonusCoins: number }>;
  },

  async getSuggestedUsers(userId: string, limit: number = 15) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/suggested?limit=${limit}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<SuggestedUser[]>;
  },

  async getProfileVisitors(userId: string, limit: number = 20) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/visitors?limit=${limit}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<ProfileVisitor[]>;
  },

  async claimDailyLogin(userId: string) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/daily-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<DailyLoginResult>;
  },

  async getNotifications(userId: string, limit = 50, offset = 0) {
    const res = await fetch(`${API_BASE}/api/notifications/${userId}?limit=${limit}&offset=${offset}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Notification[]>;
  },

  async getUnreadNotificationCount(userId: string) {
    const res = await fetch(`${API_BASE}/api/notifications/${userId}/unread-count`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ count: number }>;
  },

  async markAllNotificationsRead(userId: string) {
    const res = await fetch(`${API_BASE}/api/notifications/${userId}/mark-read`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async markNotificationRead(notifId: string) {
    const res = await fetch(`${API_BASE}/api/notifications/${notifId}/read`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Notification>;
  },

  async getVapidPublicKey() {
    const res = await fetch(`${API_BASE}/api/push/vapid-key`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.key as string | null;
  },

  async savePushSubscription(userId: string, endpoint: string, p256dh: string, auth: string) {
    const res = await fetch(`${API_BASE}/api/push/subscribe`, {
      method: "POST",
      headers: authJsonHeaders(),
      body: JSON.stringify({ endpoint, p256dh, auth }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async removePushSubscription(endpoint: string) {
    const res = await fetch(`${API_BASE}/api/push/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getUpcomingEvents(limit?: number, category?: string, userId?: string) {
    const params = new URLSearchParams();
    if (limit) params.set("limit", String(limit));
    if (category) params.set("category", category);
    if (userId) params.set("userId", userId);
    const res = await fetch(`${API_BASE}/api/events?${params}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<ScheduledEventWithHost[]>;
  },

  async getEvent(id: string) {
    const res = await fetch(`${API_BASE}/api/events/${id}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<ScheduledEventWithHost>;
  },

  async createEvent(data: { hostId: string; title: string; description?: string; category?: string; coverImage?: string; scheduledAt: string; durationMinutes?: number }) {
    const res = await fetch(`${API_BASE}/api/events`, {
      method: "POST",
      headers: authJsonHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateEvent(id: string, data: Record<string, any>) {
    const res = await fetch(`${API_BASE}/api/events/${id}`, {
      method: "PATCH",
      headers: authJsonHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async deleteEvent(id: string) {
    const res = await fetch(`${API_BASE}/api/events/${id}`, { method: "DELETE", headers: authHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async rsvpEvent(eventId: string, userId: string) {
    const res = await fetch(`${API_BASE}/api/events/${eventId}/rsvp`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async unrsvpEvent(eventId: string, userId: string) {
    const res = await fetch(`${API_BASE}/api/events/${eventId}/rsvp`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async checkRsvp(eventId: string, userId: string) {
    const token = localStorage.getItem("authToken");
    const res = await fetch(`${API_BASE}/api/events/${eventId}/rsvp/check`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ hasRsvped: boolean }>;
  },

  async getEventRsvps(eventId: string) {
    const res = await fetch(`${API_BASE}/api/events/${eventId}/rsvps`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getUserRsvps(userId: string) {
    const res = await fetch(`${API_BASE}/api/users/${userId}/rsvps`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getUserEvents(userId: string) {
    const res = await fetch(`${API_BASE}/api/events/user/${userId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

export interface TopGifter {
  user: User;
  totalCoins: number;
  giftCount: number;
}

export interface SuggestedUser {
  user: User;
  mutualCount: number;
  mutualNames: string[];
}

export interface ProfileVisitor {
  id: string;
  visitorId: string;
  visitedAt: string;
  visitor?: User;
}

export interface DailyReward {
  day: number;
  coins: number;
  xpMultiplier: number;
  emoji: string;
}

export interface DailyLoginResult {
  eligible: boolean;
  streak?: number;
  day?: number;
  coinsAwarded?: number;
  xpAwarded?: number;
  newTotalXP?: number;
  newCoinBalance?: number;
  rewards?: DailyReward[];
}

export interface ScheduledEventWithHost extends ScheduledEvent {
  host: User;
}
