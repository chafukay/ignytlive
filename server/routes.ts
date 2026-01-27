import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
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
      const { userId, title, description, category, thumbnail, tags } = req.body;
      
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
    const period = req.params.period as 'daily' | 'weekly';
    const topStreamers = await storage.getTopStreamers(period);
    res.json(topStreamers);
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

  return httpServer;
}
