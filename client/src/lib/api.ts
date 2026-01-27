import type { User, Stream, Short, Gift, GiftTransaction, Message, Badge, UserBadge, WishlistItem, WheelPrize, WheelSpin, CallRequest, StreamGoal, JoinRequest, Group, GroupMember, GroupMessage, MediaUnlock } from "@shared/schema";

const API_BASE = "";

export const api = {
  // Auth
  async register(username: string, email: string, password: string) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ user: User }>;
  },

  async login(username: string, password: string) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ user: User }>;
  },

  // Users
  async getUser(id: string) {
    const res = await fetch(`${API_BASE}/api/users/${id}`);
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

  // Streams
  async getLiveStreams(limit = 50) {
    const res = await fetch(`${API_BASE}/api/streams/live?limit=${limit}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Array<Stream & { user: User }>>;
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
    isPrivate?: boolean;
    accessType?: string;
    minVipTier?: number;
    groupId?: string;
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
  async sendMessage(senderId: string, receiverId: string, content: string) {
    const res = await fetch(`${API_BASE}/api/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderId, receiverId, content }),
    });
    if (!res.ok) throw new Error(await res.text());
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

  // Leaderboard
  async getLeaderboard(period: "daily" | "weekly") {
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
    const res = await fetch(`${API_BASE}/api/users/${userId}/dnd`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
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
};
