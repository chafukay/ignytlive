import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { cache, CACHE_KEYS, TTL } from "./cache";
import agoraToken from "agora-token";
const { RtcRole, RtcTokenBuilder } = agoraToken;
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
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { awardXP, checkDailyLoginBonus } from "./xp-service";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

// Helper to check if user is a guest and block write actions
const checkGuestRestriction = async (userId: string | undefined, res: any, storage: any): Promise<boolean> => {
  if (!userId) return false;
  const user = await storage.getUser(userId);
  if (user?.isGuest) {
    res.status(403).json({ error: "Guest users cannot perform this action. Please sign up to continue." });
    return true;
  }
  return false;
};

// Helper to check if user needs age verification (social login without birthdate)
const checkAgeVerification = async (userId: string | undefined, res: any, storage: any): Promise<boolean> => {
  if (!userId) return false;
  const user = await storage.getUser(userId);
  // Social login users without birthdate need to verify age
  if (user?.socialProvider && !user?.birthdate && !user?.isGuest) {
    res.status(403).json({ 
      error: "Age verification required",
      code: "AGE_VERIFICATION_REQUIRED",
      message: "Please verify your age to continue using IgnytLive"
    });
    return true;
  }
  return false;
};

// Combined check for guest and age restrictions
const checkUserRestrictions = async (userId: string | undefined, res: any, storage: any): Promise<boolean> => {
  if (await checkGuestRestriction(userId, res, storage)) return true;
  if (await checkAgeVerification(userId, res, storage)) return true;
  return false;
};

// Age verification helper
const verifyAge = (birthdate: string | Date | null | undefined): { valid: boolean; age?: number; error?: string } => {
  if (!birthdate) {
    return { valid: false, error: "Birthdate is required for age verification" };
  }
  const birthDate = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  if (age < 18) {
    return { valid: false, age, error: "You must be 18 or older to use this platform" };
  }
  return { valid: true, age };
};

// WebSocket connections per stream
const streamConnections = new Map<string, Set<WebSocket>>();

// Track last message time per user per stream for slow mode
const lastMessageTimes = new Map<string, Map<string, number>>();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup Replit Auth (MUST be before other routes)
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // WebSocket server for real-time features
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  
  // Track real viewers separately from all connections
  const realViewers = new Map<string, Set<WebSocket>>();
  
  wss.on("connection", async (ws: WebSocket, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const streamId = url.searchParams.get("streamId");
    const isPreview = url.searchParams.get("preview") === "true";
    const userId = url.searchParams.get("userId");
    
    if (streamId) {
      if (!streamConnections.has(streamId)) {
        streamConnections.set(streamId, new Set());
      }
      streamConnections.get(streamId)!.add(ws);
      
      // Check if this user is the broadcaster (stream owner)
      const stream = await storage.getStream(streamId);
      const isBroadcaster = stream && userId && stream.userId === userId;
      
      // Only count as viewer if not a preview connection and not the broadcaster
      const shouldCountAsViewer = !isPreview && !isBroadcaster;
      
      if (shouldCountAsViewer) {
        if (!realViewers.has(streamId)) {
          realViewers.set(streamId, new Set());
        }
        realViewers.get(streamId)!.add(ws);
        
        // Update viewer count when user joins
        const viewersCount = realViewers.get(streamId)!.size;
        await storage.updateStream(streamId, { viewersCount });
        
        // Broadcast updated viewer count to all clients
        streamConnections.get(streamId)?.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'viewer_count', data: { viewerCount: viewersCount } }));
          }
        });
      }
      
      ws.on("close", async () => {
        streamConnections.get(streamId)?.delete(ws);
        
        // Only update viewer count if this was a real viewer (not preview, not broadcaster)
        if (shouldCountAsViewer && realViewers.has(streamId)) {
          realViewers.get(streamId)?.delete(ws);
          
          // Update viewer count when user leaves
          const newViewersCount = realViewers.get(streamId)?.size || 0;
          await storage.updateStream(streamId, { viewersCount: newViewersCount });
          
          // Broadcast updated viewer count
          streamConnections.get(streamId)?.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'viewer_count', data: { viewerCount: newViewersCount } }));
            }
          });
        }
      });
      
      ws.on("message", async (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          // If this is a chat comment, validate through moderation checks
          if (message.type === 'comment' && message.data?.userId) {
            const userId = message.data.userId;
            
            // Check if user is banned (cached)
            const banKey = CACHE_KEYS.userBan(streamId, userId);
            let isBanned = await cache.get<boolean>(banKey);
            if (isBanned === null) {
              isBanned = await storage.isUserBanned(streamId, userId);
              await cache.set(banKey, isBanned, TTL.MODERATION);
            }
            if (isBanned) {
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'You are banned from this stream' 
              }));
              return;
            }
            
            // Check if user is muted (cached)
            const muteKey = CACHE_KEYS.userMute(streamId, userId);
            let isMuted = await cache.get<boolean>(muteKey);
            if (isMuted === null) {
              isMuted = await storage.isUserMuted(streamId, userId);
              await cache.set(muteKey, isMuted, TTL.MODERATION);
            }
            if (isMuted) {
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'You are muted in this stream' 
              }));
              return;
            }
            
            // Check slow mode (stream data cached)
            const streamKey = CACHE_KEYS.stream(streamId);
            let stream = await cache.get<any>(streamKey);
            if (stream === null) {
              stream = await storage.getStream(streamId);
              if (stream) await cache.set(streamKey, stream, TTL.STREAM);
            }
            if (stream?.slowModeSeconds && stream.slowModeSeconds > 0 && stream.userId !== userId) {
              const modKey = CACHE_KEYS.roomModerator(streamId, userId);
              let isMod = await cache.get<boolean>(modKey);
              if (isMod === null) {
                isMod = await storage.isRoomModerator(streamId, userId);
                await cache.set(modKey, isMod, TTL.MODERATION);
              }
              if (!isMod) {
                // Check last message time from the map
                if (!lastMessageTimes.has(streamId)) {
                  lastMessageTimes.set(streamId, new Map());
                }
                const streamMessages = lastMessageTimes.get(streamId)!;
                const lastTime = streamMessages.get(userId) || 0;
                const now = Date.now();
                const timeSinceLastMessage = (now - lastTime) / 1000;
                
                if (timeSinceLastMessage < stream.slowModeSeconds) {
                  const waitTime = Math.ceil(stream.slowModeSeconds - timeSinceLastMessage);
                  ws.send(JSON.stringify({ 
                    type: 'error', 
                    message: `Slow mode is enabled. Wait ${waitTime} seconds.` 
                  }));
                  return;
                }
                streamMessages.set(userId, now);
              }
            }
          }
          
          // Broadcast validated message to all viewers of the stream
          streamConnections.get(streamId)?.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(message));
            }
          });
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });
    }
  });

  // Agora config endpoint - returns App ID for frontend
  // Note: Secrets were swapped during entry, so we read them in reverse
  app.get("/api/agora/config", async (req, res) => {
    const appId = process.env.AGORA_APP_CERTIFICATE; // Actually contains App ID
    if (!appId) {
      return res.status(200).json({ appId: null, configured: false });
    }
    res.json({ appId, configured: true });
  });

  // Agora token generation endpoint
  app.post("/api/agora/token", async (req, res) => {
    try {
      const { channelName, uid, role } = req.body;
      
      // Note: Secrets were swapped during entry, so we read them in reverse
      const appId = process.env.AGORA_APP_CERTIFICATE; // Actually contains App ID
      const appCertificate = process.env.VITE_AGORA_APP_ID; // Actually contains Certificate
      
      if (!appId || !appCertificate) {
        return res.status(500).json({ error: "Agora credentials not configured" });
      }
      
      const expirationTimeInSeconds = 3600; // 1 hour
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
      
      const agoraRole = role === "host" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
      
      const finalUid = uid || 0;
      const token = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channelName,
        finalUid,
        agoraRole,
        privilegeExpiredTs,
        privilegeExpiredTs
      );
      
      res.json({ token, uid: finalUid });
    } catch (error) {
      console.error("Error generating Agora token:", error);
      res.status(500).json({ error: "Failed to generate token" });
    }
  });

  // User routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.birthdate && typeof body.birthdate === 'string') {
        body.birthdate = new Date(body.birthdate);
      }
      const userData = insertUserSchema.parse(body);
      
      // Age gating - require birthdate and check 18+
      const ageCheck = verifyAge(userData.birthdate);
      if (!ageCheck.valid) {
        return res.status(400).json({ error: ageCheck.error });
      }
      
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

  // Guest login - creates a temporary read-only account
  app.post("/api/auth/guest", async (req, res) => {
    try {
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const guestUser = await storage.createUser({
        username: guestId,
        email: `${guestId}@guest.ignytlive.com`,
        password: crypto.randomUUID(),
        isGuest: true,
      });
      res.json({ user: { ...guestUser, password: undefined } });
    } catch (error) {
      console.error("Guest login error:", error);
      res.status(500).json({ error: "Failed to create guest session" });
    }
  });

  // Age verification for social login users
  app.post("/api/auth/verify-age", async (req, res) => {
    try {
      const { userId, birthdate } = req.body;
      
      if (!userId || !birthdate) {
        return res.status(400).json({ error: "User ID and birthdate are required" });
      }

      // Verify age
      const ageCheck = verifyAge(birthdate);
      if (!ageCheck.valid) {
        return res.status(400).json({ error: ageCheck.error });
      }

      // Update user with verified birthdate
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await storage.updateUser(userId, { birthdate: new Date(birthdate) });
      res.json({ user: { ...updatedUser, password: undefined } });
    } catch (error) {
      console.error("Age verification error:", error);
      res.status(500).json({ error: "Failed to verify age" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      // Try to find user by username first, then by email
      let user = await storage.getUserByUsername(username);
      if (!user) {
        user = await storage.getUserByEmail(username);
      }
      
      if (!user) {
        console.log(`[login] User not found for: "${username}"`);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      if (user.password !== password) {
        console.log(`[login] Password mismatch for user "${username}" - stored length: ${user.password?.length}, provided length: ${password?.length}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Phone authentication - send verification code
  app.post("/api/auth/phone/send-code", async (req, res) => {
    try {
      const { phone } = req.body;
      
      if (!phone || typeof phone !== "string") {
        return res.status(400).json({ error: "Phone number is required" });
      }

      // Generate 6-digit code
      const { generateVerificationCode, sendVerificationCode, isSmsConfigured } = await import("./sms");
      const code = generateVerificationCode();
      
      // Store in database
      await storage.createPhoneVerificationCode(phone, code);
      
      // Send via SMS
      const sent = await sendVerificationCode(phone, code);
      
      res.json({ 
        success: true, 
        message: sent ? "Verification code sent" : "Code generated (SMS not configured)",
        smsConfigured: isSmsConfigured()
      });
    } catch (error) {
      console.error("Phone code error:", error);
      res.status(500).json({ error: "Failed to send verification code" });
    }
  });

  // Phone authentication - verify code and login/register
  app.post("/api/auth/phone/verify", async (req, res) => {
    try {
      const { phone, code, birthdate } = req.body;
      
      if (!phone || !code) {
        return res.status(400).json({ error: "Phone and code are required" });
      }

      // Verify the code
      const isValid = await storage.verifyPhoneCode(phone, code);
      
      if (!isValid) {
        return res.status(401).json({ error: "Invalid or expired code" });
      }

      // Check if user exists with this phone
      let user = await storage.getUserByPhone(phone);
      
      if (!user) {
        // Age gating for new users
        const ageCheck = verifyAge(birthdate);
        if (!ageCheck.valid) {
          return res.status(400).json({ error: ageCheck.error || "Age verification required" });
        }
        
        // Create new user with phone number
        const username = `user_${phone.slice(-4)}_${Date.now().toString(36)}`;
        user = await storage.createUser({
          username,
          email: `${username}@phone.ignyt.live`,
          password: Math.random().toString(36).slice(2),
          phone,
          phoneVerified: true,
          birthdate: birthdate ? new Date(birthdate) : undefined,
        });
      }

      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Phone verify error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // ========== LINK ACCOUNT ==========

  // Link email to existing account
  app.post("/api/users/:userId/link-email", async (req, res) => {
    try {
      const userId = req.params.userId;
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Please enter a valid email address" });
      }

      if (typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if email is already taken by another user
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: "This email is already in use by another account" });
      }

      const updated = await storage.updateUser(userId, { 
        email, 
        password,
      });

      res.json({ user: { ...updated, password: undefined } });
    } catch (error) {
      console.error("Link email error:", error);
      res.status(500).json({ error: "Failed to link email" });
    }
  });

  // Link phone to existing account - send code
  app.post("/api/users/:userId/link-phone/send-code", async (req, res) => {
    try {
      const { phone } = req.body;

      if (!phone || typeof phone !== "string") {
        return res.status(400).json({ error: "Phone number is required" });
      }

      // Check if phone is already linked to another user
      const existingUser = await storage.getUserByPhone(phone);
      if (existingUser && existingUser.id !== req.params.userId) {
        return res.status(400).json({ error: "This phone number is already linked to another account" });
      }

      const { generateVerificationCode, sendVerificationCode, isSmsConfigured } = await import("./sms");
      const code = generateVerificationCode();
      await storage.createPhoneVerificationCode(phone, code);
      const sent = await sendVerificationCode(phone, code);

      res.json({
        success: true,
        message: sent ? "Verification code sent" : "Code generated (SMS not configured)",
        smsConfigured: isSmsConfigured()
      });
    } catch (error) {
      console.error("Link phone send code error:", error);
      res.status(500).json({ error: "Failed to send verification code" });
    }
  });

  // Link phone to existing account - verify code
  app.post("/api/users/:userId/link-phone/verify", async (req, res) => {
    try {
      const userId = req.params.userId;
      const { phone, code } = req.body;

      if (!phone || !code) {
        return res.status(400).json({ error: "Phone and code are required" });
      }

      const isValid = await storage.verifyPhoneCode(phone, code);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid or expired code" });
      }

      // Re-check phone uniqueness at verification time
      const existingUser = await storage.getUserByPhone(phone);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: "This phone number is already linked to another account" });
      }

      const updated = await storage.updateUser(userId, {
        phone,
        phoneVerified: true,
      });

      res.json({ user: { ...updated, password: undefined } });
    } catch (error) {
      console.error("Link phone verify error:", error);
      res.status(500).json({ error: "Failed to verify phone" });
    }
  });

  // Unlink phone from account
  app.post("/api/users/:userId/unlink-phone", async (req, res) => {
    try {
      const userId = req.params.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Must have at least email+password to unlink phone
      if (!user.email || user.email.includes('@phone.ignyt.live')) {
        return res.status(400).json({ error: "You must link an email before unlinking your phone" });
      }

      const updated = await storage.updateUser(userId, {
        phone: null,
        phoneVerified: false,
      });

      res.json({ user: { ...updated, password: undefined } });
    } catch (error) {
      res.status(500).json({ error: "Failed to unlink phone" });
    }
  });

  app.get("/api/users/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length < 1) {
        return res.json([]);
      }
      const results = await storage.searchUsers(query.trim());
      res.json(results.map(u => ({ ...u, password: undefined })));
    } catch (error) {
      res.status(500).json({ error: "Search failed" });
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
      const { streams: liveStreams } = await storage.getLiveStreams(100);
      
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
    const limit = parseInt(req.query.limit as string) || 20;
    const sort = (req.query.sort as string) || "popular";
    const cursor = (req.query.cursor as string) || undefined;
    const result = await storage.getLiveStreams(limit, sort, cursor);
    res.json(result);
  });

  // Get nearby streams based on user location
  app.get("/api/streams/nearby", async (req, res) => {
    try {
      const latitude = parseFloat(req.query.latitude as string);
      const longitude = parseFloat(req.query.longitude as string);
      const radius = parseFloat(req.query.radius as string) || 100; // Default 100km

      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: "Valid latitude and longitude are required" });
      }

      const streams = await storage.getNearbyStreams(latitude, longitude, radius);
      res.json(streams);
    } catch (error) {
      console.error("Nearby streams error:", error);
      res.status(500).json({ error: "Failed to get nearby streams" });
    }
  });

  // Update user location
  app.post("/api/users/:id/location", async (req, res) => {
    try {
      const { latitude, longitude, city, state, country } = req.body;

      if (typeof latitude !== "number" || typeof longitude !== "number") {
        return res.status(400).json({ error: "Valid latitude and longitude are required" });
      }

      const user = await storage.updateUserLocation(req.params.id, {
        latitude,
        longitude,
        city,
        state,
        country,
      });

      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error("Update location error:", error);
      res.status(500).json({ error: "Failed to update location" });
    }
  });

  // Update user profile (for regular users updating their own profile)
  app.patch("/api/users/:id/profile", async (req, res) => {
    try {
      const userId = req.params.id;
      const { username, bio, gender, birthdate, avatar, privacySettings, notificationSettings, language } = req.body;
      
      // Check if user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Build updates object with only allowed fields
      const updates: any = {};
      if (username !== undefined) updates.username = username;
      if (bio !== undefined) updates.bio = bio;
      if (gender !== undefined) updates.gender = gender;
      if (birthdate !== undefined) updates.birthdate = new Date(birthdate);
      if (avatar !== undefined) updates.avatar = avatar;
      if (privacySettings !== undefined) updates.privacySettings = privacySettings;
      if (notificationSettings !== undefined) updates.notificationSettings = notificationSettings;
      if (language !== undefined) updates.language = language;

      const user = await storage.updateUser(userId, updates);
      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.get("/api/streams/:id", async (req, res) => {
    const stream = await storage.getStream(req.params.id);
    if (!stream) {
      return res.status(404).json({ error: "Stream not found" });
    }
    res.json(stream);
  });

  app.get("/api/geo/detect", async (req, res) => {
    try {
      const forwarded = req.headers["x-forwarded-for"];
      const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket.remoteAddress || "";
      const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode`);
      const data = await response.json() as { status: string; country?: string; countryCode?: string };
      if (data.status === "success" && data.countryCode) {
        res.json({ country: data.country, countryCode: data.countryCode });
      } else {
        res.json({ country: null, countryCode: null });
      }
    } catch {
      res.json({ country: null, countryCode: null });
    }
  });

  app.post("/api/streams", async (req, res) => {
    try {
      const { userId, title, description, category, thumbnail, tags, isPrivate, accessType, minVipTier, groupId, showCountry } = req.body;
      
      if (!userId || !title) {
        return res.status(400).json({ error: "userId and title are required" });
      }
      
      // Guest restriction
      if (await checkGuestRestriction(userId, res, storage)) return;

      const user = await storage.getUser(userId);
      const streamCountry = user?.country || null;

      const existingStreams = await storage.getUserStreams(userId);
      for (const existing of existingStreams) {
        if (existing.isLive) {
          await storage.updateStream(existing.id, { isLive: false, endedAt: new Date() });
        }
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
        country: streamCountry,
        showCountry: showCountry !== false,
        streamKey: `stream_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        isLive: true,
        viewersCount: 0,
        startedAt: new Date(),
      });

      await storage.updateUser(userId, { isLive: true });

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

      await storage.updateUser(stream.userId, { isLive: false });
      
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
      const { userId, text } = req.body;
      const streamId = req.params.id;
      
      // Guest restriction
      if (await checkGuestRestriction(userId, res, storage)) return;
      
      // Get stream to check slow mode and host
      const stream = await storage.getStream(streamId);
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      // Check if user is banned from this stream
      const isBanned = await storage.isUserBanned(streamId, userId);
      if (isBanned) {
        return res.status(403).json({ error: "You are banned from this stream" });
      }
      
      // Check if user is muted (unless they're the host)
      if (userId !== stream.userId) {
        const isMuted = await storage.isUserMuted(streamId, userId);
        if (isMuted) {
          const mute = await storage.getActiveMute(streamId, userId);
          const remainingSeconds = mute ? Math.ceil((new Date(mute.expiresAt).getTime() - Date.now()) / 1000) : 0;
          return res.status(403).json({ error: `You are muted for ${remainingSeconds} more seconds` });
        }
      }
      
      // Check slow mode (unless user is host or moderator)
      if (stream.slowModeSeconds > 0 && userId !== stream.userId) {
        const isMod = await storage.isRoomModerator(streamId, userId);
        if (!isMod) {
          if (!lastMessageTimes.has(streamId)) {
            lastMessageTimes.set(streamId, new Map());
          }
          const streamMessages = lastMessageTimes.get(streamId)!;
          const lastTime = streamMessages.get(userId) || 0;
          const now = Date.now();
          const timeSinceLastMessage = (now - lastTime) / 1000;
          
          if (timeSinceLastMessage < stream.slowModeSeconds) {
            const waitTime = Math.ceil(stream.slowModeSeconds - timeSinceLastMessage);
            return res.status(429).json({ error: `Slow mode is enabled. Wait ${waitTime} seconds.` });
          }
          
          streamMessages.set(userId, now);
        }
      }
      
      const comment = await storage.createStreamComment({
        streamId,
        userId,
        content: text,
        ...req.body
      });
      
      const commentUser = await storage.getUser(userId);
      const broadcastData = {
        ...comment,
        username: commentUser?.username || 'User',
      };
      const streamWs = streamConnections.get(req.params.id);
      if (streamWs) {
        streamWs.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'comment', data: broadcastData }));
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

  app.get("/api/users/:userId/shorts", async (req, res) => {
    const shorts = await storage.getUserShorts(req.params.userId);
    res.json(shorts);
  });

  app.post("/api/shorts", async (req, res) => {
    try {
      const shortData = insertShortSchema.parse(req.body);
      
      // Guest restriction
      if (await checkGuestRestriction(shortData.userId, res, storage)) return;
      
      const short = await storage.createShort(shortData);
      res.json(short);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  app.post("/api/shorts/:id/like", async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      
      // Guest restriction
      if (await checkGuestRestriction(userId, res, storage)) return;
      
      const liked = await storage.likeShort(id, userId);
      res.json({ success: true, liked });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to like short" });
    }
  });

  app.get("/api/shorts/:id/liked/:userId", async (req, res) => {
    try {
      const { id, userId } = req.params;
      const liked = await storage.isShortLiked(id, userId);
      res.json({ liked });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to check like status" });
    }
  });

  // Short comments routes
  app.get("/api/shorts/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getShortComments(req.params.id);
      res.json(comments);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to get comments" });
    }
  });

  app.post("/api/shorts/:id/comments", async (req, res) => {
    try {
      const { userId, content, parentId } = req.body;
      if (!userId || !content) {
        return res.status(400).json({ error: "userId and content are required" });
      }
      
      // Guest restriction
      if (await checkGuestRestriction(userId, res, storage)) return;
      
      const comment = await storage.createShortComment({
        shortId: req.params.id,
        userId,
        content,
        parentId: parentId || null,
        likesCount: 0,
        repliesCount: 0,
      });
      res.json(comment);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create comment" });
    }
  });

  app.delete("/api/shorts/comments/:commentId", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      const deleted = await storage.deleteShortComment(req.params.commentId, userId);
      if (!deleted) {
        return res.status(404).json({ error: "Comment not found or not authorized" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to delete comment" });
    }
  });

  // Comment reactions routes
  app.post("/api/shorts/comments/:commentId/react", async (req, res) => {
    try {
      const { userId, reaction } = req.body;
      if (!userId || !reaction) {
        return res.status(400).json({ error: "userId and reaction are required" });
      }
      await storage.reactToComment(req.params.commentId, userId, reaction);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to react to comment" });
    }
  });

  app.delete("/api/shorts/comments/:commentId/react", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      await storage.removeCommentReaction(req.params.commentId, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to remove reaction" });
    }
  });

  app.get("/api/shorts/comments/:commentId/reactions", async (req, res) => {
    try {
      const reactions = await storage.getCommentReactions(req.params.commentId);
      res.json(reactions);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to get reactions" });
    }
  });

  app.get("/api/shorts/comments/:commentId/reactions/:userId", async (req, res) => {
    try {
      const reaction = await storage.getUserCommentReaction(req.params.commentId, req.params.userId);
      res.json({ reaction });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to get user reaction" });
    }
  });

  // Follow routes
  app.post("/api/follows", async (req, res) => {
    try {
      const followData = insertFollowSchema.parse(req.body);
      
      // Guest restriction
      if (await checkGuestRestriction(followData.followerId, res, storage)) return;
      
      const follow = await storage.createFollow(followData);
      
      // Award XP to both users
      await awardXP(followData.followerId, "FOLLOW_USER").catch(() => {});
      await awardXP(followData.followingId, "GET_FOLLOWED").catch(() => {});
      
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

  app.get("/api/users/:id/suggested", async (req, res) => {
    try {
      const userId = req.params.id;
      const limit = parseInt(req.query.limit as string) || 15;
      
      const myFollowing = await storage.getFollowing(userId);
      const myFollowingIds = new Set(myFollowing.map(u => u.id));
      
      const suggestedMap = new Map<string, { user: any; mutualCount: number; mutualNames: string[] }>();
      
      for (const followedUser of myFollowing) {
        const theirFollowing = await storage.getFollowing(followedUser.id);
        for (const candidate of theirFollowing) {
          if (candidate.id === userId || myFollowingIds.has(candidate.id) || candidate.isGuest || candidate.role === 'admin' || candidate.role === 'superadmin') continue;
          
          const existing = suggestedMap.get(candidate.id);
          if (existing) {
            existing.mutualCount++;
            if (existing.mutualNames.length < 3) {
              existing.mutualNames.push(followedUser.username);
            }
          } else {
            suggestedMap.set(candidate.id, {
              user: { ...candidate, password: undefined },
              mutualCount: 1,
              mutualNames: [followedUser.username],
            });
          }
        }
      }
      
      const suggestions = Array.from(suggestedMap.values())
        .sort((a, b) => b.mutualCount - a.mutualCount)
        .slice(0, limit);
      
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get suggestions" });
    }
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
      
      // Guest restriction
      if (await checkGuestRestriction(transactionData.senderId, res, storage)) return;
      
      // Check if recipient has DND enabled (for gift notifications, we still allow the gift but suppress notification)
      const recipient = await storage.getUser(transactionData.receiverId);
      const recipientHasDND = recipient?.dndEnabled || false;
      
      const transaction = await storage.sendGift(transactionData);
      
      // Award XP for sending and receiving gifts
      const quantity = transactionData.quantity || 1;
      await awardXP(transactionData.senderId, "SEND_GIFT", quantity).catch(() => {});
      await awardXP(transactionData.receiverId, "RECEIVE_GIFT", quantity).catch(() => {});
      
      // Broadcast gift to stream viewers (only if recipient doesn't have DND)
      if (transaction.streamId && !recipientHasDND) {
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

  app.get("/api/users/:userId/top-gifters", async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      const topGifters = await storage.getTopGifters(userId, limit);
      res.json(topGifters);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to get top gifters" });
    }
  });

  // Message routes
  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      
      // Guest restriction
      if (await checkGuestRestriction(messageData.senderId, res, storage)) return;
      
      // Check if recipient has DND enabled
      const recipient = await storage.getUser(messageData.receiverId);
      if (recipient?.dndEnabled) {
        return res.status(403).json({ error: "User has Do Not Disturb enabled", code: "DND_ENABLED" });
      }
      
      const message = await storage.createMessage(messageData);
      
      // Award XP for sending messages
      await awardXP(messageData.senderId, "SEND_MESSAGE").catch(() => {});
      
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

  app.delete("/api/messages/conversation/:userId1/:userId2", async (req, res) => {
    try {
      await storage.deleteConversation(req.params.userId1, req.params.userId2);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear conversation" });
    }
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

  // XP and Level routes
  app.post("/api/users/:id/daily-login", async (req, res) => {
    try {
      const userId = req.params.id;
      const result = await checkDailyLoginBonus(userId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to check daily login" });
    }
  });

  // VIP upgrade route
  const vipUpgradeSchema = z.object({
    tier: z.number().min(1).max(5),
    cost: z.number().min(0),
  });

  app.post("/api/users/:id/upgrade-vip", async (req, res) => {
    try {
      const userId = req.params.id;
      const { tier, cost } = vipUpgradeSchema.parse(req.body);
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (user.vipTier >= tier) {
        return res.status(400).json({ error: "You already have this tier or higher" });
      }
      
      if (tier !== user.vipTier + 1) {
        return res.status(400).json({ error: "You must upgrade to the next tier first" });
      }
      
      if (user.coins < cost) {
        return res.status(400).json({ error: "Not enough coins" });
      }
      
      const updatedUser = await storage.updateUser(userId, {
        vipTier: tier,
        coins: user.coins - cost,
      });
      
      res.json(updatedUser);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to upgrade VIP" });
    }
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

      if (status === 'accepted' && request.streamId) {
        const requesterUser = await storage.getUser(request.userId);
        streamConnections.get(request.streamId)?.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'join_accepted',
              data: {
                userId: request.userId,
                username: requesterUser?.username || 'User',
                avatar: requesterUser?.avatar,
                streamId: request.streamId,
              }
            }));
          }
        });
      }

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

  // Private Call routes
  const privateCallRequestSchema = z.object({
    viewerId: z.string().min(1),
    hostId: z.string().min(1),
  });

  // Request a private call
  app.post("/api/private-calls/request", async (req, res) => {
    try {
      const { viewerId, hostId } = privateCallRequestSchema.parse(req.body);
      
      // Get host to check availability and get rates
      const host = await storage.getUser(hostId);
      if (!host) {
        return res.status(404).json({ error: "Host not found" });
      }
      
      // Check if host has DND enabled
      if (host.dndEnabled) {
        return res.status(403).json({ error: "Host has Do Not Disturb enabled", code: "DND_ENABLED" });
      }
      
      if (!host.availableForPrivateCall) {
        return res.status(400).json({ error: "Host is not available for private calls" });
      }
      
      // Get viewer to check balance
      const viewer = await storage.getUser(viewerId);
      if (!viewer) {
        return res.status(404).json({ error: "Viewer not found" });
      }
      
      // Check if viewer has enough coins
      const minRequired = host.privateCallBillingMode === "per_session" 
        ? host.privateCallSessionPrice 
        : host.privateCallRate; // At least 1 minute worth
      
      if (viewer.coins < minRequired) {
        return res.status(400).json({ error: "Insufficient coins", required: minRequired });
      }
      
      // Check if viewer already has an active/pending call
      const existingCall = await storage.getActivePrivateCall(viewerId);
      if (existingCall) {
        return res.status(400).json({ error: "You already have an active call" });
      }
      
      // Create the call request
      const agoraChannel = `private_${Date.now()}_${viewerId}_${hostId}`;
      const call = await storage.createPrivateCall({
        viewerId,
        hostId,
        status: "pending",
        billingMode: host.privateCallBillingMode,
        ratePerMinute: host.privateCallRate,
        sessionPrice: host.privateCallSessionPrice,
        agoraChannel,
      });
      
      res.json(call);
    } catch (error) {
      res.status(400).json({ error: "Failed to request private call" });
    }
  });

  // Accept a private call - only host can accept
  app.post("/api/private-calls/:id/accept", async (req, res) => {
    try {
      const { userId } = req.body;
      const call = await storage.getPrivateCall(req.params.id);
      if (!call) {
        return res.status(404).json({ error: "Call not found" });
      }
      
      // Authorization check: only host can accept
      if (userId !== call.hostId) {
        return res.status(403).json({ error: "Only the host can accept this call" });
      }
      
      if (call.status !== "pending") {
        return res.status(400).json({ error: "Call is not pending" });
      }
      
      // For per-session billing, charge immediately
      if (call.billingMode === "per_session") {
        const viewer = await storage.getUser(call.viewerId);
        const host = await storage.getUser(call.hostId);
        if (!viewer || viewer.coins < call.sessionPrice) {
          await storage.updatePrivateCall(req.params.id, { status: "cancelled", endReason: "insufficient_funds" });
          return res.status(400).json({ error: "Viewer has insufficient coins" });
        }
        
        // Charge viewer and credit host
        await storage.updateUser(call.viewerId, { coins: viewer.coins - call.sessionPrice });
        await storage.updateUser(call.hostId, { earnings: (host?.earnings || 0) + call.sessionPrice });
      }
      
      const updatedCall = await storage.updatePrivateCall(req.params.id, {
        status: "active",
        startedAt: new Date(),
        totalCharged: call.billingMode === "per_session" ? call.sessionPrice : 0,
      });
      
      res.json(updatedCall);
    } catch (error) {
      res.status(400).json({ error: "Failed to accept call" });
    }
  });

  // Decline a private call - only host can decline
  app.post("/api/private-calls/:id/decline", async (req, res) => {
    try {
      const { userId } = req.body;
      const call = await storage.getPrivateCall(req.params.id);
      if (!call) {
        return res.status(404).json({ error: "Call not found" });
      }
      
      // Authorization check: only host can decline
      if (userId !== call.hostId) {
        return res.status(403).json({ error: "Only the host can decline this call" });
      }
      
      if (call.status !== "pending") {
        return res.status(400).json({ error: "Call is not pending" });
      }
      
      const updatedCall = await storage.updatePrivateCall(req.params.id, {
        status: "declined",
        endedAt: new Date(),
        endReason: "host_ended",
      });
      
      res.json(updatedCall);
    } catch (error) {
      res.status(400).json({ error: "Failed to decline call" });
    }
  });

  // End a private call - either party can end
  app.post("/api/private-calls/:id/end", async (req, res) => {
    try {
      const { endReason, userId } = req.body;
      const call = await storage.getPrivateCall(req.params.id);
      if (!call) {
        return res.status(404).json({ error: "Call not found" });
      }
      
      // Authorization check: only viewer or host can end
      if (userId !== call.viewerId && userId !== call.hostId) {
        return res.status(403).json({ error: "Only call participants can end this call" });
      }
      
      if (call.status !== "active" && call.status !== "pending") {
        return res.status(400).json({ error: "Call cannot be ended" });
      }
      
      // Calculate duration
      const startTime = call.startedAt ? new Date(call.startedAt).getTime() : Date.now();
      const durationSeconds = call.startedAt ? Math.floor((Date.now() - startTime) / 1000) : 0;
      
      const actualEndReason = endReason || (userId === call.hostId ? "host_ended" : "viewer_ended");
      
      const updatedCall = await storage.updatePrivateCall(req.params.id, {
        status: "ended",
        endedAt: new Date(),
        durationSeconds,
        endReason: actualEndReason,
      });
      
      res.json(updatedCall);
    } catch (error) {
      res.status(400).json({ error: "Failed to end call" });
    }
  });

  // Bill per minute (called by viewer client every minute during active call)
  app.post("/api/private-calls/:id/bill-minute", async (req, res) => {
    try {
      const { userId } = req.body;
      const call = await storage.getPrivateCall(req.params.id);
      if (!call) {
        return res.status(404).json({ error: "Call not found" });
      }
      
      // Authorization check: only viewer can trigger billing (prevents malicious billing)
      if (userId !== call.viewerId) {
        return res.status(403).json({ error: "Only the viewer can trigger billing" });
      }
      
      if (call.status !== "active" || call.billingMode !== "per_minute") {
        return res.status(400).json({ error: "Invalid call state for billing" });
      }
      
      const viewer = await storage.getUser(call.viewerId);
      const host = await storage.getUser(call.hostId);
      
      if (!viewer || viewer.coins < call.ratePerMinute) {
        // End call due to insufficient funds
        const startTime = call.startedAt ? new Date(call.startedAt).getTime() : Date.now();
        const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
        
        await storage.updatePrivateCall(req.params.id, {
          status: "ended",
          endedAt: new Date(),
          durationSeconds,
          endReason: "insufficient_funds",
        });
        
        return res.status(400).json({ error: "Insufficient funds - call ended", callEnded: true });
      }
      
      // Charge viewer and credit host
      await storage.updateUser(call.viewerId, { coins: viewer.coins - call.ratePerMinute });
      await storage.updateUser(call.hostId, { earnings: (host?.earnings || 0) + call.ratePerMinute });
      
      const updatedCall = await storage.updatePrivateCall(req.params.id, {
        totalCharged: call.totalCharged + call.ratePerMinute,
      });
      
      res.json({ success: true, totalCharged: updatedCall?.totalCharged, remainingCoins: viewer.coins - call.ratePerMinute });
    } catch (error) {
      res.status(400).json({ error: "Failed to bill minute" });
    }
  });

  // Get pending calls for a host
  app.get("/api/private-calls/pending/:hostId", async (req, res) => {
    try {
      const calls = await storage.getPendingPrivateCalls(req.params.hostId);
      res.json(calls);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pending calls" });
    }
  });

  // Get call history for a user
  app.get("/api/private-calls/history/:userId", async (req, res) => {
    try {
      const calls = await storage.getUserPrivateCalls(req.params.userId);
      res.json(calls);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch call history" });
    }
  });

  // Get active call for a user
  app.get("/api/private-calls/active/:userId", async (req, res) => {
    try {
      const call = await storage.getActivePrivateCall(req.params.userId);
      res.json(call || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active call" });
    }
  });

  // Get single call details
  app.get("/api/private-calls/:id", async (req, res) => {
    try {
      const call = await storage.getPrivateCall(req.params.id);
      if (!call) {
        return res.status(404).json({ error: "Call not found" });
      }
      res.json(call);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch call" });
    }
  });

  // Update host private call settings - only user can update their own settings
  app.patch("/api/users/:id/private-call-settings", async (req, res) => {
    try {
      const { availableForPrivateCall, privateCallRate, privateCallBillingMode, privateCallSessionPrice, userId } = req.body;
      
      // Authorization check: only user can update their own settings
      if (userId !== req.params.id) {
        return res.status(403).json({ error: "You can only update your own settings" });
      }
      
      const updates: any = {};
      
      if (availableForPrivateCall !== undefined) updates.availableForPrivateCall = availableForPrivateCall;
      if (privateCallRate !== undefined) updates.privateCallRate = privateCallRate;
      if (privateCallBillingMode !== undefined) updates.privateCallBillingMode = privateCallBillingMode;
      if (privateCallSessionPrice !== undefined) updates.privateCallSessionPrice = privateCallSessionPrice;
      
      const user = await storage.updateUser(req.params.id, updates);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: "Failed to update settings" });
    }
  });

  // ========== Moderation API Routes ==========
  
  // Add room moderator - host only
  app.post("/api/streams/:streamId/moderators", async (req, res) => {
    try {
      const { userId, assignedBy } = req.body;
      const stream = await storage.getStream(req.params.streamId);
      
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      // Only host can assign moderators
      if (stream.userId !== assignedBy) {
        return res.status(403).json({ error: "Only the host can assign moderators" });
      }
      
      const moderator = await storage.addRoomModerator({
        streamId: req.params.streamId,
        userId,
        assignedBy,
      });
      res.json(moderator);
    } catch (error) {
      res.status(400).json({ error: "Failed to add moderator" });
    }
  });
  
  // Remove room moderator - host only
  app.delete("/api/streams/:streamId/moderators/:userId", async (req, res) => {
    try {
      const { requesterId } = req.body;
      const stream = await storage.getStream(req.params.streamId);
      
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      // Only host can remove moderators
      if (stream.userId !== requesterId) {
        return res.status(403).json({ error: "Only the host can remove moderators" });
      }
      
      await storage.removeRoomModerator(req.params.streamId, req.params.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to remove moderator" });
    }
  });
  
  // Get room moderators
  app.get("/api/streams/:streamId/moderators", async (req, res) => {
    try {
      const moderators = await storage.getRoomModerators(req.params.streamId);
      res.json(moderators);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch moderators" });
    }
  });
  
  // Check if user is moderator
  app.get("/api/streams/:streamId/moderators/:userId/check", async (req, res) => {
    try {
      const isMod = await storage.isRoomModerator(req.params.streamId, req.params.userId);
      res.json({ isModerator: isMod });
    } catch (error) {
      res.status(500).json({ error: "Failed to check moderator status" });
    }
  });
  
  // Ban user from room - host or moderator
  app.post("/api/streams/:streamId/bans", async (req, res) => {
    try {
      const { userId, bannedBy, reason, isPermanent, durationSeconds } = req.body;
      const stream = await storage.getStream(req.params.streamId);
      
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      // Check if requester is host or moderator
      const isHost = stream.userId === bannedBy;
      const isMod = await storage.isRoomModerator(req.params.streamId, bannedBy);
      
      if (!isHost && !isMod) {
        return res.status(403).json({ error: "Only host or moderators can ban users" });
      }
      
      // Can't ban the host
      if (userId === stream.userId) {
        return res.status(400).json({ error: "Cannot ban the host" });
      }
      
      const expiresAt = isPermanent ? null : new Date(Date.now() + (durationSeconds || 3600) * 1000);
      
      const ban = await storage.createRoomBan({
        streamId: req.params.streamId,
        userId,
        bannedBy,
        reason,
        isPermanent: isPermanent || false,
        expiresAt,
      });
      res.json(ban);
    } catch (error) {
      res.status(400).json({ error: "Failed to ban user" });
    }
  });
  
  // Unban user - host or moderator
  app.delete("/api/streams/:streamId/bans/:userId", async (req, res) => {
    try {
      const { requesterId } = req.body;
      const stream = await storage.getStream(req.params.streamId);
      
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      const isHost = stream.userId === requesterId;
      const isMod = await storage.isRoomModerator(req.params.streamId, requesterId);
      
      if (!isHost && !isMod) {
        return res.status(403).json({ error: "Only host or moderators can unban users" });
      }
      
      await storage.removeRoomBan(req.params.streamId, req.params.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to unban user" });
    }
  });
  
  // Get banned users
  app.get("/api/streams/:streamId/bans", async (req, res) => {
    try {
      const bans = await storage.getRoomBans(req.params.streamId);
      res.json(bans);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bans" });
    }
  });
  
  // Check if user is banned
  app.get("/api/streams/:streamId/bans/:userId/check", async (req, res) => {
    try {
      const isBanned = await storage.isUserBanned(req.params.streamId, req.params.userId);
      res.json({ isBanned });
    } catch (error) {
      res.status(500).json({ error: "Failed to check ban status" });
    }
  });
  
  // Mute user with duration - host or moderator
  app.post("/api/streams/:streamId/mutes", async (req, res) => {
    try {
      const { userId, mutedBy, reason, durationSeconds } = req.body;
      const stream = await storage.getStream(req.params.streamId);
      
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      const isHost = stream.userId === mutedBy;
      const isMod = await storage.isRoomModerator(req.params.streamId, mutedBy);
      
      if (!isHost && !isMod) {
        return res.status(403).json({ error: "Only host or moderators can mute users" });
      }
      
      // Can't mute the host
      if (userId === stream.userId) {
        return res.status(400).json({ error: "Cannot mute the host" });
      }
      
      const duration = durationSeconds || 300; // default 5 minutes
      const expiresAt = new Date(Date.now() + duration * 1000);
      
      const mute = await storage.createRoomMute({
        streamId: req.params.streamId,
        userId,
        mutedBy,
        reason,
        durationSeconds: duration,
        expiresAt,
      });
      res.json(mute);
    } catch (error) {
      res.status(400).json({ error: "Failed to mute user" });
    }
  });
  
  // Unmute user - host or moderator
  app.delete("/api/streams/:streamId/mutes/:userId", async (req, res) => {
    try {
      const { requesterId } = req.body;
      const stream = await storage.getStream(req.params.streamId);
      
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      const isHost = stream.userId === requesterId;
      const isMod = await storage.isRoomModerator(req.params.streamId, requesterId);
      
      if (!isHost && !isMod) {
        return res.status(403).json({ error: "Only host or moderators can unmute users" });
      }
      
      await storage.removeRoomMute(req.params.streamId, req.params.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to unmute user" });
    }
  });
  
  // Get muted users
  app.get("/api/streams/:streamId/mutes", async (req, res) => {
    try {
      const mutes = await storage.getRoomMutes(req.params.streamId);
      res.json(mutes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch mutes" });
    }
  });
  
  // Check if user is muted and get mute details
  app.get("/api/streams/:streamId/mutes/:userId/check", async (req, res) => {
    try {
      const mute = await storage.getActiveMute(req.params.streamId, req.params.userId);
      res.json({ isMuted: !!mute, mute: mute || null });
    } catch (error) {
      res.status(500).json({ error: "Failed to check mute status" });
    }
  });
  
  // Update stream settings (slow mode, pinned message) - host only
  app.patch("/api/streams/:streamId/settings", async (req, res) => {
    try {
      const { slowModeSeconds, pinnedMessageId, userId } = req.body;
      const stream = await storage.getStream(req.params.streamId);
      
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      // Only host can update stream settings
      if (stream.userId !== userId) {
        return res.status(403).json({ error: "Only the host can update stream settings" });
      }
      
      const updates: any = {};
      if (slowModeSeconds !== undefined) updates.slowModeSeconds = slowModeSeconds;
      if (pinnedMessageId !== undefined) updates.pinnedMessageId = pinnedMessageId;
      
      const updated = await storage.updateStream(req.params.streamId, updates);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: "Failed to update stream settings" });
    }
  });
  
  // Get moderation info for a user in a stream
  app.get("/api/streams/:streamId/moderation/:userId", async (req, res) => {
    try {
      const stream = await storage.getStream(req.params.streamId);
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      const [isModerator, isBanned, mute] = await Promise.all([
        storage.isRoomModerator(req.params.streamId, req.params.userId),
        storage.isUserBanned(req.params.streamId, req.params.userId),
        storage.getActiveMute(req.params.streamId, req.params.userId),
      ]);
      
      res.json({
        isHost: stream.userId === req.params.userId,
        isModerator,
        isBanned,
        isMuted: !!mute,
        muteExpiresAt: mute?.expiresAt || null,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch moderation info" });
    }
  });

  // ========== Store & Inventory API Routes ==========
  
  // Get all store items (optionally filter by type)
  // Coin Purchase - check if user has made a purchase before (for first purchase bonus)
  app.get("/api/coins/first-purchase/:userId", async (req, res) => {
    try {
      const hasPurchased = await storage.hasUserPurchasedCoins(req.params.userId);
      res.json({ isFirstPurchase: !hasPurchased });
    } catch (error) {
      res.status(500).json({ error: "Failed to check purchase status" });
    }
  });

  // Valid coin packages (server-side source of truth)
  const VALID_COIN_PACKAGES = [
    { coins: 380, price: 1.99 },
    { coins: 975, price: 4.99 },
    { coins: 2000, price: 9.99 },
    { coins: 3875, price: 24.99 },
    { coins: 5100, price: 29.99 },
    { coins: 8750, price: 49.99 },
    { coins: 14400, price: 79.99 },
    { coins: 18500, price: 99.99 },
    { coins: 57000, price: 299.99 },
  ];

  // Stripe Checkout - create a checkout session for coin purchase
  app.post("/api/coins/checkout", async (req, res) => {
    try {
      const { userId, packageCoins, priceUsd } = req.body;

      if (!userId || !packageCoins || !priceUsd) {
        return res.status(400).json({ error: "userId, packageCoins, and priceUsd are required" });
      }

      const validPkg = VALID_COIN_PACKAGES.find(p => p.coins === packageCoins && p.price === priceUsd);
      if (!validPkg) {
        return res.status(400).json({ error: "Invalid coin package" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const hasPurchased = await storage.hasUserPurchasedCoins(userId);
      const bonusCoins = !hasPurchased ? Math.floor(validPkg.coins * 0.5) : 0;
      const totalCoins = validPkg.coins + bonusCoins;

      const origin = `${req.protocol}://${req.get("host")}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${validPkg.coins.toLocaleString()} Coins`,
                description: bonusCoins > 0
                  ? `${validPkg.coins.toLocaleString()} coins + ${bonusCoins.toLocaleString()} first-purchase bonus = ${totalCoins.toLocaleString()} total`
                  : `${validPkg.coins.toLocaleString()} coins for your IgnytLIVE account`,
              },
              unit_amount: Math.round(validPkg.price * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin}/coins?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/coins`,
        metadata: {
          userId,
          packageCoins: String(validPkg.coins),
          priceUsd: String(validPkg.price),
        },
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
      console.error("Stripe checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Stripe Webhook - handle payment completion
  app.post("/api/stripe/webhook", async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    try {
      if (webhookSecret) {
        if (!sig) {
          return res.status(400).json({ error: "Missing stripe-signature header" });
        }
        event = stripe.webhooks.constructEvent(
          req.rawBody as Buffer,
          sig,
          webhookSecret
        );
      } else {
        console.warn("STRIPE_WEBHOOK_SECRET not set — webhook signature verification disabled. Set it in production.");
        return res.status(400).json({ error: "Webhook not configured" });
      }
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.payment_status === "paid" && session.metadata) {
        const { userId, packageCoins, priceUsd } = session.metadata;

        const validPkg = VALID_COIN_PACKAGES.find(p => p.coins === parseInt(packageCoins) && p.price === parseFloat(priceUsd));
        if (!validPkg) {
          console.error("Webhook: invalid coin package in session metadata", session.metadata);
          return res.status(400).json({ error: "Invalid package in metadata" });
        }

        try {
          const result = await storage.purchaseCoins(
            userId,
            validPkg.coins,
            validPkg.price,
            session.id
          );
          console.log(`Webhook: Coins credited: ${result.purchase.totalCoins} coins to user ${userId} (session ${session.id})`);
        } catch (error) {
          console.error("Failed to credit coins after payment:", error);
        }
      }
    }

    res.json({ received: true });
  });

  // Stripe - verify checkout session and credit coins (fallback for webhook)
  app.post("/api/coins/verify-session/:sessionId", async (req, res) => {
    try {
      const { userId: requestingUserId } = req.body;
      if (!requestingUserId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);

      if (session.payment_status !== "paid" || !session.metadata) {
        return res.status(400).json({ error: "Payment not completed" });
      }

      const { userId, packageCoins, priceUsd } = session.metadata;

      if (userId !== requestingUserId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const validPkg = VALID_COIN_PACKAGES.find(p => p.coins === parseInt(packageCoins) && p.price === parseFloat(priceUsd));
      if (!validPkg) {
        return res.status(400).json({ error: "Invalid coin package" });
      }

      const existingPurchase = await storage.findPurchaseByStripeSessionId(session.id);
      if (existingPurchase) {
        const user = await storage.getUser(userId);
        return res.json({ alreadyCredited: true, user });
      }

      const result = await storage.purchaseCoins(
        userId,
        validPkg.coins,
        validPkg.price,
        session.id
      );

      res.json({
        alreadyCredited: false,
        purchase: result.purchase,
        user: result.user,
        bonusApplied: result.bonusApplied,
        bonusCoins: result.bonusCoins,
      });
    } catch (error) {
      console.error("Session verification error:", error);
      res.status(500).json({ error: "Failed to verify payment session" });
    }
  });

  // Legacy direct purchase endpoint (kept for testing)
  app.post("/api/coins/purchase", async (req, res) => {
    try {
      const { userId, packageCoins, priceUsd } = req.body;

      if (!userId || !packageCoins || !priceUsd) {
        return res.status(400).json({ error: "userId, packageCoins, and priceUsd are required" });
      }

      const validPkg = VALID_COIN_PACKAGES.find(p => p.coins === packageCoins && p.price === priceUsd);
      if (!validPkg) {
        return res.status(400).json({ error: "Invalid coin package" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const result = await storage.purchaseCoins(userId, validPkg.coins, validPkg.price);

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to process purchase" });
    }
  });

  // Coin Purchase - history
  app.get("/api/coins/purchases/:userId", async (req, res) => {
    try {
      const purchases = await storage.getCoinPurchaseHistory(req.params.userId);
      res.json(purchases);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchase history" });
    }
  });

  app.get("/api/store/items", async (req, res) => {
    try {
      const type = req.query.type as string | undefined;
      const items = await storage.getStoreItems(type);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch store items" });
    }
  });

  // Get single store item
  app.get("/api/store/items/:id", async (req, res) => {
    try {
      const item = await storage.getStoreItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch item" });
    }
  });

  // Purchase item
  app.post("/api/store/purchase", async (req, res) => {
    try {
      const { userId, itemId } = req.body;
      
      if (!userId || !itemId) {
        return res.status(400).json({ error: "userId and itemId are required" });
      }
      
      const userItem = await storage.purchaseItem(userId, itemId);
      res.json(userItem);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to purchase item" });
    }
  });

  // Get user's inventory
  app.get("/api/users/:id/items", async (req, res) => {
    try {
      const items = await storage.getUserItems(req.params.id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user items" });
    }
  });

  // Get user's equipped items
  app.get("/api/users/:id/equipped-items", async (req, res) => {
    try {
      const items = await storage.getEquippedItems(req.params.id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch equipped items" });
    }
  });

  // Equip item
  app.patch("/api/user-items/:id/equip", async (req, res) => {
    try {
      const userItem = await storage.equipItem(req.params.id);
      if (!userItem) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(userItem);
    } catch (error) {
      res.status(400).json({ error: "Failed to equip item" });
    }
  });

  // Unequip item
  app.patch("/api/user-items/:id/unequip", async (req, res) => {
    try {
      const userItem = await storage.unequipItem(req.params.id);
      if (!userItem) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(userItem);
    } catch (error) {
      res.status(400).json({ error: "Failed to unequip item" });
    }
  });

  // ========== FAMILIES ==========
  
  // Get all families (leaderboard)
  app.get("/api/families", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const families = await storage.getFamilies(limit);
      res.json(families);
    } catch (error) {
      res.status(500).json({ error: "Failed to get families" });
    }
  });

  // Search families
  app.get("/api/families/search", async (req, res) => {
    try {
      const query = req.query.q as string || "";
      const families = await storage.searchFamilies(query);
      res.json(families);
    } catch (error) {
      res.status(500).json({ error: "Failed to search families" });
    }
  });

  // Get current user's family
  app.get("/api/families/my", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }
      const membership = await storage.getUserFamily(userId);
      res.json(membership || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user family" });
    }
  });

  // Get specific family
  app.get("/api/families/:id", async (req, res) => {
    try {
      const family = await storage.getFamily(req.params.id);
      if (!family) {
        return res.status(404).json({ error: "Family not found" });
      }
      res.json(family);
    } catch (error) {
      res.status(500).json({ error: "Failed to get family" });
    }
  });

  // Create family
  app.post("/api/families", async (req, res) => {
    try {
      const { name, description, ownerId, isPublic, minLevel } = req.body;
      
      if (!name || !ownerId) {
        return res.status(400).json({ error: "Name and owner required" });
      }

      // Check if user already has a family
      const existingMembership = await storage.getUserFamily(ownerId);
      if (existingMembership) {
        return res.status(400).json({ error: "You must leave your current family first" });
      }

      const family = await storage.createFamily({
        name,
        description: description || null,
        ownerId,
        isPublic: isPublic !== false,
        minLevel: minLevel || 1,
        maxMembers: 20,
      });

      // Add owner as first member (don't increment count since family starts with memberCount: 1)
      await storage.addFamilyMember({
        familyId: family.id,
        userId: ownerId,
        role: "owner",
      }, true); // skipIncrement = true

      res.status(201).json(family);
    } catch (error: any) {
      if (error.code === "23505") {
        return res.status(400).json({ error: "Family name already taken" });
      }
      res.status(400).json({ error: "Failed to create family" });
    }
  });

  // Update family
  app.patch("/api/families/:id", async (req, res) => {
    try {
      const { userId, name, description, isPublic, minLevel, maxMembers } = req.body;
      
      const family = await storage.getFamily(req.params.id);
      if (!family) {
        return res.status(404).json({ error: "Family not found" });
      }

      // Check if user is owner or admin
      const members = await storage.getFamilyMembers(family.id);
      const member = members.find(m => m.userId === userId);
      if (!member || (member.role !== "owner" && member.role !== "admin")) {
        return res.status(403).json({ error: "Only owners and admins can edit family" });
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (isPublic !== undefined) updates.isPublic = isPublic;
      if (minLevel !== undefined) updates.minLevel = minLevel;
      if (maxMembers !== undefined && member.role === "owner") updates.maxMembers = maxMembers;

      const updated = await storage.updateFamily(family.id, updates);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: "Failed to update family" });
    }
  });

  // Delete family
  app.delete("/api/families/:id", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const family = await storage.getFamily(req.params.id);
      
      if (!family) {
        return res.status(404).json({ error: "Family not found" });
      }

      if (family.ownerId !== userId) {
        return res.status(403).json({ error: "Only the owner can delete the family" });
      }

      await storage.deleteFamily(family.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to delete family" });
    }
  });

  // Get family members
  app.get("/api/families/:id/members", async (req, res) => {
    try {
      const members = await storage.getFamilyMembers(req.params.id);
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to get family members" });
    }
  });

  // Join family
  app.post("/api/families/:id/join", async (req, res) => {
    try {
      const { userId } = req.body;
      const familyId = req.params.id;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }

      // Check if user already has a family
      const existingMembership = await storage.getUserFamily(userId);
      if (existingMembership) {
        return res.status(400).json({ error: "You must leave your current family first" });
      }

      const family = await storage.getFamily(familyId);
      if (!family) {
        return res.status(404).json({ error: "Family not found" });
      }

      if (!family.isPublic) {
        return res.status(403).json({ error: "This family is private" });
      }

      if (family.memberCount >= family.maxMembers) {
        return res.status(400).json({ error: "Family is full" });
      }

      // Check user level requirement
      const user = await storage.getUser(userId);
      if (!user || user.level < family.minLevel) {
        return res.status(403).json({ error: `Requires level ${family.minLevel} to join` });
      }

      const member = await storage.addFamilyMember({
        familyId,
        userId,
        role: "member",
      });

      res.status(201).json(member);
    } catch (error) {
      res.status(400).json({ error: "Failed to join family" });
    }
  });

  // Leave family
  app.post("/api/families/:id/leave", async (req, res) => {
    try {
      const { userId } = req.body;
      const familyId = req.params.id;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }

      const family = await storage.getFamily(familyId);
      if (!family) {
        return res.status(404).json({ error: "Family not found" });
      }

      if (family.ownerId === userId) {
        return res.status(400).json({ error: "Owner cannot leave. Transfer ownership or delete the family." });
      }

      await storage.removeFamilyMember(familyId, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to leave family" });
    }
  });

  // Promote/demote member
  app.patch("/api/families/:id/members/:memberId", async (req, res) => {
    try {
      const { userId, role } = req.body;
      const familyId = req.params.id;
      const memberId = req.params.memberId;
      
      const family = await storage.getFamily(familyId);
      if (!family) {
        return res.status(404).json({ error: "Family not found" });
      }

      // Only owner can promote/demote
      if (family.ownerId !== userId) {
        return res.status(403).json({ error: "Only the owner can change roles" });
      }

      if (role !== "admin" && role !== "member") {
        return res.status(400).json({ error: "Invalid role" });
      }

      const updated = await storage.updateFamilyMember(familyId, memberId, { role });
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: "Failed to update member role" });
    }
  });

  // Kick member
  app.delete("/api/families/:id/members/:memberId", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const familyId = req.params.id;
      const memberId = req.params.memberId;
      
      const family = await storage.getFamily(familyId);
      if (!family) {
        return res.status(404).json({ error: "Family not found" });
      }

      const members = await storage.getFamilyMembers(familyId);
      const actor = members.find(m => m.userId === userId);
      const target = members.find(m => m.userId === memberId);

      if (!actor || !target) {
        return res.status(404).json({ error: "Member not found" });
      }

      if (actor.role !== "owner" && actor.role !== "admin") {
        return res.status(403).json({ error: "Only owners and admins can kick members" });
      }

      if (target.role === "owner") {
        return res.status(403).json({ error: "Cannot kick the owner" });
      }

      if (target.role === "admin" && actor.role !== "owner") {
        return res.status(403).json({ error: "Only owners can kick admins" });
      }

      await storage.removeFamilyMember(familyId, memberId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to kick member" });
    }
  });

  // Get family messages
  app.get("/api/families/:id/messages", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const messages = await storage.getFamilyMessages(req.params.id, limit);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  // Send family message
  app.post("/api/families/:id/messages", async (req, res) => {
    try {
      const { userId, content } = req.body;
      const familyId = req.params.id;
      
      if (!userId || !content) {
        return res.status(400).json({ error: "User ID and content required" });
      }

      // Verify user is a member
      const membership = await storage.getUserFamily(userId);
      if (!membership || membership.familyId !== familyId) {
        return res.status(403).json({ error: "You must be a member to send messages" });
      }

      const message = await storage.createFamilyMessage({
        familyId,
        userId,
        content,
      });

      const user = await storage.getUser(userId);
      res.status(201).json({ ...message, user });
    } catch (error) {
      res.status(400).json({ error: "Failed to send message" });
    }
  });

  // ========== ACHIEVEMENTS ==========

  // Get all achievements
  app.get("/api/achievements", async (req, res) => {
    try {
      const achievementsList = await storage.getAchievements();
      res.json(achievementsList);
    } catch (error) {
      res.status(500).json({ error: "Failed to get achievements" });
    }
  });

  // Get user's unlocked achievements
  app.get("/api/users/:userId/achievements", async (req, res) => {
    try {
      const userAchievements = await storage.getUserAchievements(req.params.userId);
      res.json(userAchievements);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user achievements" });
    }
  });

  // ========== PROFILE VIEWS ==========

  // Record profile visit
  app.post("/api/users/:userId/visit", async (req, res) => {
    try {
      const profileId = req.params.userId;
      const visitorId = req.body.visitorId;
      
      // Don't count self-visits
      if (visitorId !== profileId) {
        await storage.recordProfileVisit(profileId, visitorId);
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to record visit" });
    }
  });

  // Get profile visitors
  app.get("/api/users/:userId/visitors", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const visitors = await storage.getProfileVisitors(req.params.userId, limit);
      res.json(visitors);
    } catch (error) {
      res.status(500).json({ error: "Failed to get visitors" });
    }
  });

  // Generate referral code for user
  app.post("/api/users/:userId/referral-code", async (req, res) => {
    try {
      const userId = req.params.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (user.referralCode) {
        return res.json({ referralCode: user.referralCode });
      }
      
      // Generate unique referral code
      const code = user.username.toUpperCase().slice(0, 4) + Math.random().toString(36).substring(2, 6).toUpperCase();
      
      await storage.updateUser(userId, { referralCode: code });
      res.json({ referralCode: code });
    } catch (error) {
      res.status(400).json({ error: "Failed to generate referral code" });
    }
  });

  // Apply referral code
  app.post("/api/users/:userId/apply-referral", async (req, res) => {
    try {
      const userId = req.params.userId;
      const { referralCode } = req.body;
      
      if (!referralCode) {
        return res.status(400).json({ error: "Referral code required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (user.referredBy) {
        return res.status(400).json({ error: "You have already used a referral code" });
      }
      
      // Find referrer
      const allUsers = await storage.getAllUsers();
      const referrer = allUsers.find(u => u.referralCode === referralCode);
      
      if (!referrer) {
        return res.status(404).json({ error: "Invalid referral code" });
      }
      
      if (referrer.id === userId) {
        return res.status(400).json({ error: "Cannot use your own referral code" });
      }
      
      // Apply referral - give both users bonus coins
      await storage.updateUser(userId, { referredBy: referrer.id, coins: user.coins + 100 });
      await storage.updateUser(referrer.id, { coins: referrer.coins + 200 });
      
      res.json({ success: true, bonusCoins: 100 });
    } catch (error) {
      res.status(400).json({ error: "Failed to apply referral code" });
    }
  });

  return httpServer;
}
