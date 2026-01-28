import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import * as AgoraToken from "agora-token";
import { 
  insertUserSchema, 
  insertStreamSchema,
  insertShortSchema,
  insertFollowSchema,
  insertGiftTransactionSchema,
  insertMessageSchema,
  insertStreamCommentSchema,
  insertStreamGoalSchema,
  insertJoinRequestSchema
} from "@shared/schema";
import { z } from "zod";

// WebSocket connections per stream
const streamConnections = new Map<string, Set<WebSocket>>();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // WebSocket server for real-time features
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  
  wss.on("connection", (ws: WebSocket, req) => {
    const streamId = new URL(req.url!, `http://${req.headers.host}`).searchParams.get("streamId");
    
    if (streamId) {
      if (!streamConnections.has(streamId)) {
        streamConnections.set(streamId, new Set());
      }
      streamConnections.get(streamId)!.add(ws);
      
      ws.on("close", () => {
        streamConnections.get(streamId)?.delete(ws);
      });
      
      ws.on("message", async (data) => {
        const message = JSON.parse(data.toString());
        // Broadcast to all viewers of the stream
        streamConnections.get(streamId)?.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
          }
        });
      });
    }
  });

  // Agora token generation endpoint
  app.post("/api/agora/token", async (req, res) => {
    try {
      const { channelName, uid, role } = req.body;
      
      const appId = process.env.VITE_AGORA_APP_ID;
      const appCertificate = process.env.AGORA_APP_CERTIFICATE;
      
      if (!appId || !appCertificate) {
        return res.status(500).json({ error: "Agora credentials not configured" });
      }
      
      const expirationTimeInSeconds = 3600; // 1 hour
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
      
      const agoraRole = role === "host" ? AgoraToken.RtcRole.PUBLISHER : AgoraToken.RtcRole.SUBSCRIBER;
      
      const token = AgoraToken.RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channelName,
        uid || 0,
        agoraRole,
        privilegeExpiredTs,
        privilegeExpiredTs
      );
      
      res.json({ token });
    } catch (error) {
      console.error("Error generating Agora token:", error);
      res.status(500).json({ error: "Failed to generate token" });
    }
  });

  // User routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      const user = await storage.createUser(userData);
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ ...user, password: undefined });
  });

  // Get all streamers sorted by live status (live users first)
  app.get("/api/streamers", async (req, res) => {
    try {
      const users = await storage.getStreamers();
      const liveStreams = await storage.getLiveStreams(100);
      
      // Build a set of user IDs who have active live streams
      const liveUserIds = new Set(liveStreams.map(s => s.userId));
      
      // Update isLive based on actual active streams
      const usersWithLiveStatus = users.map(u => ({
        ...u,
        password: undefined,
        isLive: liveUserIds.has(u.id), // Compute from actual streams
      }));
      
      // Sort by isLive (live users first), then by followersCount
      const sorted = usersWithLiveStatus.sort((a, b) => {
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        return (b.followersCount || 0) - (a.followersCount || 0);
      });
      res.json(sorted);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch streamers" });
    }
  });

  // Stream routes
  app.get("/api/streams/live", async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const streams = await storage.getLiveStreams(limit);
    res.json(streams);
  });

  app.get("/api/streams/:id", async (req, res) => {
    const stream = await storage.getStream(req.params.id);
    if (!stream) {
      return res.status(404).json({ error: "Stream not found" });
    }
    res.json(stream);
  });

  app.post("/api/streams", async (req, res) => {
    try {
      const { userId, title, description, category, thumbnail, tags, isPrivate, accessType, minVipTier, groupId } = req.body;
      
      if (!userId || !title) {
        return res.status(400).json({ error: "userId and title are required" });
      }
      
      const stream = await storage.createStream({
        userId,
        title,
        description: description || null,
        category: category || null,
        thumbnail: thumbnail || null,
        tags: tags || null,
        isPrivate: isPrivate || false,
        accessType: accessType || "public",
        minVipTier: minVipTier || 0,
        groupId: groupId || null,
        streamKey: `stream_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        isLive: true,
        startedAt: new Date(),
      });
      res.json(stream);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  app.patch("/api/streams/:id", async (req, res) => {
    try {
      const stream = await storage.updateStream(req.params.id, req.body);
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      res.json(stream);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Update failed" });
    }
  });

  // End stream (properly mark as not live)
  app.post("/api/streams/:id/end", async (req, res) => {
    try {
      const { userId } = req.body;
      const stream = await storage.getStream(req.params.id);
      
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      // Only stream owner can end the stream
      if (stream.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to end this stream" });
      }
      
      const updatedStream = await storage.updateStream(req.params.id, {
        isLive: false,
        endedAt: new Date(),
      });
      
      res.json(updatedStream);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to end stream" });
    }
  });

  app.get("/api/streams/:id/comments", async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const comments = await storage.getStreamComments(req.params.id, limit);
    res.json(comments);
  });

  app.post("/api/streams/:id/comments", async (req, res) => {
    try {
      const comment = await storage.createStreamComment({
        streamId: req.params.id,
        ...req.body
      });
      
      // Broadcast to WebSocket clients
      const streamWs = streamConnections.get(req.params.id);
      if (streamWs) {
        streamWs.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'comment', data: comment }));
          }
        });
      }
      
      res.json(comment);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to post comment" });
    }
  });

  // Shorts routes
  app.get("/api/shorts/feed", async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const shorts = await storage.getShortsFeed(limit);
    res.json(shorts);
  });

  app.get("/api/shorts/:id", async (req, res) => {
    const short = await storage.getShort(req.params.id);
    if (!short) {
      return res.status(404).json({ error: "Short not found" });
    }
    res.json(short);
  });

  app.post("/api/shorts", async (req, res) => {
    try {
      const shortData = insertShortSchema.parse(req.body);
      const short = await storage.createShort(shortData);
      res.json(short);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  // Follow routes
  app.post("/api/follows", async (req, res) => {
    try {
      const followData = insertFollowSchema.parse(req.body);
      const follow = await storage.createFollow(followData);
      res.json(follow);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to follow" });
    }
  });

  app.delete("/api/follows", async (req, res) => {
    try {
      const { followerId, followingId } = req.body;
      await storage.deleteFollow(followerId, followingId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to unfollow" });
    }
  });

  app.get("/api/users/:id/followers", async (req, res) => {
    const followers = await storage.getFollowers(req.params.id);
    res.json(followers);
  });

  app.get("/api/users/:id/following", async (req, res) => {
    const following = await storage.getFollowing(req.params.id);
    res.json(following);
  });

  app.get("/api/follows/check", async (req, res) => {
    const { followerId, followingId } = req.query;
    if (!followerId || !followingId) {
      return res.status(400).json({ error: "followerId and followingId required" });
    }
    const isFollowing = await storage.isFollowing(followerId as string, followingId as string);
    res.json({ isFollowing });
  });

  // Gift routes
  app.get("/api/gifts", async (req, res) => {
    const gifts = await storage.getGifts();
    res.json(gifts);
  });

  app.post("/api/gifts/send", async (req, res) => {
    try {
      const transactionData = insertGiftTransactionSchema.parse(req.body);
      const transaction = await storage.sendGift(transactionData);
      
      // Broadcast gift to stream viewers
      if (transaction.streamId) {
        const streamWs = streamConnections.get(transaction.streamId);
        if (streamWs) {
          streamWs.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'gift', data: transaction }));
            }
          });
        }
      }
      
      res.json(transaction);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to send gift" });
    }
  });

  // Message routes
  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to send message" });
    }
  });

  app.get("/api/messages/conversation", async (req, res) => {
    const { userId1, userId2 } = req.query as { userId1: string; userId2: string };
    const messages = await storage.getConversation(userId1, userId2);
    res.json(messages);
  });

  app.get("/api/users/:id/chats", async (req, res) => {
    const chats = await storage.getRecentChats(req.params.id);
    res.json(chats);
  });

  // Leaderboard routes
  app.get("/api/leaderboard/:period", async (req, res) => {
    const period = req.params.period as 'daily' | 'weekly' | 'alltime';
    const topStreamers = await storage.getTopStreamers(period);
    res.json(topStreamers);
  });

  // Admin routes
  const adminUpdateSchema = z.object({
    role: z.enum(["user", "admin", "superadmin"]).optional(),
    vipTier: z.number().min(0).max(5).optional(),
    coins: z.number().min(0).optional(),
    diamonds: z.number().min(0).optional(),
    level: z.number().min(1).max(100).optional(),
  });

  app.get("/api/admin/users", async (req, res) => {
    // Check admin access via header (in production, use proper session/JWT)
    const adminUserId = req.headers["x-admin-user-id"] as string;
    if (adminUserId) {
      const adminUser = await storage.getUser(adminUserId);
      if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "superadmin")) {
        return res.status(403).json({ error: "Access denied" });
      }
    }
    
    const allUsers = await storage.getAllUsers();
    // Strip passwords from response
    const safeUsers = allUsers.map(({ password, ...user }) => user);
    res.json(safeUsers);
  });

  app.patch("/api/admin/users/:id", async (req, res) => {
    // Check admin access via header (in production, use proper session/JWT)
    const adminUserId = req.headers["x-admin-user-id"] as string;
    let requestingUser = null;
    
    if (adminUserId) {
      requestingUser = await storage.getUser(adminUserId);
      if (!requestingUser || (requestingUser.role !== "admin" && requestingUser.role !== "superadmin")) {
        return res.status(403).json({ error: "Access denied" });
      }
    }
    
    // Validate update payload
    const parseResult = adminUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid update data", details: parseResult.error.errors });
    }
    
    const updates = parseResult.data;
    
    // Only superadmin can change roles
    if (updates.role && (!requestingUser || requestingUser.role !== "superadmin")) {
      return res.status(403).json({ error: "Only superadmin can change user roles" });
    }
    
    const updatedUser = await storage.updateUser(req.params.id, updates);
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Strip password from response
    const { password, ...safeUser } = updatedUser;
    res.json(safeUser);
  });

  // Badge routes
  app.get("/api/badges", async (req, res) => {
    const allBadges = await storage.getBadges();
    res.json(allBadges);
  });

  app.get("/api/users/:id/badges", async (req, res) => {
    const userBadgesList = await storage.getUserBadges(req.params.id);
    res.json(userBadgesList);
  });

  app.post("/api/users/:id/badges", async (req, res) => {
    try {
      const { badgeId } = req.body;
      if (!badgeId) {
        return res.status(400).json({ error: "Badge ID is required" });
      }
      const userBadge = await storage.awardBadge(req.params.id, badgeId);
      res.json(userBadge);
    } catch (error) {
      res.status(400).json({ error: "Failed to award badge" });
    }
  });

  // Wishlist routes
  app.get("/api/users/:id/wishlist", async (req, res) => {
    const wishlist = await storage.getWishlistItems(req.params.id);
    res.json(wishlist);
  });

  app.post("/api/wishlist", async (req, res) => {
    try {
      const item = await storage.createWishlistItem(req.body);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: "Failed to create wishlist item" });
    }
  });

  app.post("/api/wishlist/:id/contribute", async (req, res) => {
    try {
      const { amount } = req.body;
      const item = await storage.contributeToWishlist(req.params.id, amount);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: "Failed to contribute" });
    }
  });

  // Wheel routes
  app.get("/api/wheel/prizes", async (req, res) => {
    const prizes = await storage.getWheelPrizes();
    res.json(prizes);
  });

  app.post("/api/wheel/spin", async (req, res) => {
    try {
      const { userId, streamId } = req.body;
      const result = await storage.spinWheel(userId, streamId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Spin failed" });
    }
  });

  // DND toggle route
  app.patch("/api/users/:id/dnd", async (req, res) => {
    try {
      const { enabled } = req.body;
      const user = await storage.updateUser(req.params.id, { dndEnabled: enabled });
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: "Failed to update DND status" });
    }
  });

  // 1-on-1 call routes
  app.post("/api/calls", async (req, res) => {
    try {
      const call = await storage.createCallRequest(req.body);
      res.json(call);
    } catch (error) {
      res.status(400).json({ error: "Failed to create call request" });
    }
  });

  app.patch("/api/calls/:id", async (req, res) => {
    try {
      const call = await storage.updateCallRequest(req.params.id, req.body);
      res.json(call);
    } catch (error) {
      res.status(400).json({ error: "Failed to update call" });
    }
  });

  app.get("/api/users/:id/calls", async (req, res) => {
    const calls = await storage.getUserCallRequests(req.params.id);
    res.json(calls);
  });

  // Stream Goals routes
  app.get("/api/streams/:id/goals", async (req, res) => {
    try {
      const goals = await storage.getStreamGoals(req.params.id);
      res.json(goals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stream goals" });
    }
  });

  const createStreamGoalSchema = z.object({
    title: z.string().min(1),
    targetCoins: z.number().positive(),
    rewardDescription: z.string().optional(),
  });

  app.post("/api/streams/:id/goals", async (req, res) => {
    try {
      const validated = createStreamGoalSchema.parse(req.body);
      const goal = await storage.createStreamGoal({
        streamId: req.params.id,
        ...validated,
      });
      res.json(goal);
    } catch (error) {
      res.status(400).json({ error: "Failed to create stream goal" });
    }
  });

  const contributeSchema = z.object({
    amount: z.number().positive(),
  });

  app.patch("/api/goals/:id/contribute", async (req, res) => {
    try {
      const { amount } = contributeSchema.parse(req.body);
      const goal = await storage.contributeToGoal(req.params.id, amount);
      res.json(goal);
    } catch (error) {
      res.status(400).json({ error: "Failed to contribute to goal" });
    }
  });

  // Join Video Request routes
  app.get("/api/streams/:id/join-requests", async (req, res) => {
    try {
      const requests = await storage.getJoinRequests(req.params.id);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch join requests" });
    }
  });

  const joinRequestSchema = z.object({
    userId: z.string().min(1),
  });

  app.post("/api/streams/:id/join-requests", async (req, res) => {
    try {
      const { userId } = joinRequestSchema.parse(req.body);
      const request = await storage.createJoinRequest({
        streamId: req.params.id,
        userId,
        status: "pending",
      });
      res.json(request);
    } catch (error) {
      res.status(400).json({ error: "Failed to create join request" });
    }
  });

  const updateJoinRequestSchema = z.object({
    status: z.enum(["pending", "accepted", "rejected"]),
  });

  app.patch("/api/join-requests/:id", async (req, res) => {
    try {
      const { status } = updateJoinRequestSchema.parse(req.body);
      const request = await storage.updateJoinRequest(req.params.id, status);
      res.json(request);
    } catch (error) {
      res.status(400).json({ error: "Failed to update join request" });
    }
  });

  // PK Battle toggle
  const pkBattleSchema = z.object({
    isPKBattle: z.boolean(),
    userId: z.string().min(1), // For authorization check
  });

  app.patch("/api/streams/:id/pk-battle", async (req, res) => {
    try {
      const { isPKBattle, userId } = pkBattleSchema.parse(req.body);
      
      // Get stream to verify ownership
      const stream = await storage.getStream(req.params.id);
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      // Authorization: Only stream owner can toggle PK battle
      if (stream.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to modify this stream" });
      }
      
      const updatedStream = await storage.updateStream(req.params.id, { isPKBattle });
      res.json(updatedStream);
    } catch (error) {
      res.status(400).json({ error: "Failed to update PK battle status" });
    }
  });

  // Group routes
  const createGroupSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    avatar: z.string().optional(),
    ownerId: z.string().min(1),
    isPrivate: z.boolean().optional(),
  });

  app.post("/api/groups", async (req, res) => {
    try {
      const data = createGroupSchema.parse(req.body);
      const group = await storage.createGroup(data);
      res.json(group);
    } catch (error) {
      res.status(400).json({ error: "Failed to create group" });
    }
  });

  app.get("/api/groups/:id", async (req, res) => {
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }
      res.json(group);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch group" });
    }
  });

  app.get("/api/users/:id/groups", async (req, res) => {
    try {
      const userGroups = await storage.getUserGroups(req.params.id);
      res.json(userGroups);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user groups" });
    }
  });

  app.patch("/api/groups/:id", async (req, res) => {
    try {
      const group = await storage.updateGroup(req.params.id, req.body);
      res.json(group);
    } catch (error) {
      res.status(400).json({ error: "Failed to update group" });
    }
  });

  app.delete("/api/groups/:id", async (req, res) => {
    try {
      await storage.deleteGroup(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to delete group" });
    }
  });

  // Group member routes
  const addMemberSchema = z.object({
    userId: z.string().min(1),
    role: z.string().optional(),
  });

  app.get("/api/groups/:id/members", async (req, res) => {
    try {
      const members = await storage.getGroupMembers(req.params.id);
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch group members" });
    }
  });

  app.post("/api/groups/:id/members", async (req, res) => {
    try {
      const { userId, role } = addMemberSchema.parse(req.body);
      const member = await storage.addGroupMember({
        groupId: req.params.id,
        userId,
        role: role || "member",
      });
      res.json(member);
    } catch (error) {
      res.status(400).json({ error: "Failed to add member" });
    }
  });

  app.delete("/api/groups/:groupId/members/:userId", async (req, res) => {
    try {
      await storage.removeGroupMember(req.params.groupId, req.params.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to remove member" });
    }
  });

  app.get("/api/groups/:groupId/members/:userId/check", async (req, res) => {
    try {
      const isMember = await storage.isGroupMember(req.params.groupId, req.params.userId);
      res.json({ isMember });
    } catch (error) {
      res.status(500).json({ error: "Failed to check membership" });
    }
  });

  // Group message routes
  const groupMessageSchema = z.object({
    senderId: z.string().min(1),
    content: z.string().optional(),
    mediaUrl: z.string().optional(),
    mediaType: z.string().optional(),
    isPrivateMedia: z.boolean().optional(),
    unlockCost: z.number().optional(),
  });

  app.get("/api/groups/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getGroupMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/groups/:id/messages", async (req, res) => {
    try {
      const data = groupMessageSchema.parse(req.body);
      const message = await storage.createGroupMessage({
        groupId: req.params.id,
        ...data,
      });
      res.json(message);
    } catch (error) {
      res.status(400).json({ error: "Failed to send message" });
    }
  });

  // Media unlock routes
  const unlockMediaSchema = z.object({
    userId: z.string().min(1),
    messageId: z.string().min(1),
    messageType: z.string().min(1),
    coinsPaid: z.number().min(1),
  });

  app.post("/api/media/unlock", async (req, res) => {
    try {
      const data = unlockMediaSchema.parse(req.body);
      const user = await storage.getUser(data.userId);
      if (!user || user.coins < data.coinsPaid) {
        return res.status(400).json({ error: "Insufficient coins" });
      }
      await storage.updateUser(data.userId, { coins: user.coins - data.coinsPaid });
      const unlock = await storage.unlockMedia(data);
      res.json(unlock);
    } catch (error) {
      res.status(400).json({ error: "Failed to unlock media" });
    }
  });

  app.get("/api/media/unlock/check", async (req, res) => {
    try {
      const { userId, messageId, messageType } = req.query;
      if (!userId || !messageId || !messageType) {
        return res.status(400).json({ error: "Missing parameters" });
      }
      const hasUnlocked = await storage.hasUnlockedMedia(
        userId as string,
        messageId as string,
        messageType as string
      );
      res.json({ unlocked: hasUnlocked });
    } catch (error) {
      res.status(500).json({ error: "Failed to check unlock status" });
    }
  });

  return httpServer;
}
