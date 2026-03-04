# Ignyt Live - Live Social Video Platform

## Overview

Ignyt Live is a real-time live streaming and social video platform built with a modern full-stack architecture. The application enables users to broadcast live streams, watch content from other creators, send virtual gifts, participate in live chat, view short-form video content, and compete in PK (Player vs Player) battles. The platform features a mobile-first design with a TikTok-inspired interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React Context for auth state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for smooth UI transitions
- **Build Tool**: Vite with custom plugins for Replit integration

The frontend follows a page-based structure with shared layout components. Key pages include Home, Explore, Shorts, Live Room, Chat, Profile, Leaderboard, and Go Live. The UI is designed for mobile-first with responsive desktop support via a bottom/side navigation pattern.

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful endpoints under `/api/` prefix
- **Real-time**: WebSocket server (ws library) for live stream interactions
- **Caching**: In-memory cache service (`server/cache.ts`) with Redis-swappable interface
- **Build**: esbuild for production bundling with selective dependency bundling for cold start optimization

The server handles API routes, WebSocket connections for real-time features (chat, gifts, viewer counts), and serves the static frontend in production. Development uses Vite's dev server with HMR proxied through Express.

### Caching Layer
- **Module**: `server/cache.ts` — in-memory cache behind `ICacheService` interface (designed for Redis swap)
- **TTLs**: Moderation 30s, User profiles 60s, Streams 30s, Leaderboards 120s
- **Cached Data**: User profiles, stream data, moderation checks (ban/mute/moderator), leaderboard queries
- **Invalidation**: Automatic cache clearing on mutations (updateUser, updateStream, ban/mute/moderator CRUD, gift transactions)
- **WebSocket**: Chat moderation checks (ban, mute, moderator, slow mode) are cached to reduce DB queries per message from 3-4 to 0 on cache hits

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Connection**: Uses `pg` Pool for database connections
- **Schema Location**: `shared/schema.ts` - shared between frontend and backend
- **Migrations**: Drizzle Kit with push-based schema synchronization

Core data models include:
- Users (profiles, virtual currency, levels, VIP tiers)
- Streams (live broadcasts with viewer tracking)
- Shorts (short-form video content)
- Follows (social graph)
- Gifts (virtual gift catalog with coin/diamond values)
- Gift Transactions (gift sending history)
- Messages (direct messaging)
- Stream Comments (live chat)

### Authentication
- **Multiple Login Methods**:
  - Email/Username + password
  - Phone number with SMS verification (Twilio)
  - Social login via Replit Auth (Google, Apple, GitHub, email)
  - Guest browsing (read-only)
- **Age Gating**: 18+ enforcement on registration (birthdate required)
- **Guest Mode**: Temporary accounts with restricted write access
- Client-side auth state persisted in localStorage
- Auth context provider wraps the application for global auth access
- Replit Auth integration via OIDC for social logins

### Real-time Features
- WebSocket connections are stream-scoped (connected via `?streamId=` query param)
- Messages broadcast to all viewers of a specific stream
- Used for live comments, gift animations, and viewer count updates
- **WebSocket Moderation**: All chat messages validated against moderation state (ban/mute/slow mode) before broadcast

### Moderation System
- **Room Moderators**: Hosts can assign/remove moderators for their streams
- **Bans**: Hosts and moderators can permanently or temporarily ban users from streams
- **Mutes**: Duration-based muting (5 min to 24 hours) with automatic expiration
- **Slow Mode**: Configurable rate limiting (0s-5m intervals), hosts and moderators exempt
- **Authorization**: All moderation endpoints verify host/moderator status before execution
- **WebSocket Enforcement**: Moderation rules enforced both in REST API and WebSocket message handling to prevent bypass

### User Block/Report/Mute System
- **User Blocks**: Users can block/unblock others; blocked users cannot send messages in either direction
- **User Reports**: Report users with reason selection (spam, harassment, inappropriate content, fake profile, underage, other) + optional description
- **Muted Calls**: Mute/unmute incoming calls from specific users
- **DB Tables**: `user_blocks`, `user_reports`, `user_muted_calls`
- **Server Enforcement**: Message send route checks block status before allowing delivery

### Conversation View Features
- **Header**: Avatar, username, last seen/level, voice call button, video call button, 3-dot menu
- **Bottom Sheet Menu**: View Profile, Mute/Unmute Calls, Report and Block, Delete Conversation
- **Message Actions**: Long-press/right-click opens WhatsApp-style floating context menu near the message with: Reply, Copy, Translate, Forward (coming soon), Star (coming soon), Edit (own messages only), Delete, Select messages
- **Message Reply**: Reply to any message; reply preview bar above input with cancel; replied messages show quoted original inline
- **Message Editing**: Inline edit input with Save/Cancel, PATCH `/api/messages/:messageId`, shows "edited" label, encrypted at rest
- **Message Selection**: "Select messages" enters multi-select mode with checkboxes; action bar at bottom with Copy/Delete for selected messages
- **Translation**: Server-side proxy via MyMemory API (no key needed), `POST /api/translate`, inline translated text below original
- **Delete Confirmation Dialog**: Centered modal with red delete button and cancel
- **Report Dialog**: Bottom sheet with reason selection, optional description, Report & Block action
- **Input Bar**: Plus button, message input ("Say something..."), gift button, emoji/send toggle
- **Blocked State**: Shows blocked banner with unblock option, hides message input
- **Date Grouping**: Messages grouped by date with emerald date badges
- **Message Styling**: Outgoing messages amber-orange gradient, incoming zinc dark

### Private Video Calls
- Per-minute billing: Charged every 60 seconds during call
- Per-session billing: Flat fee upfront for entire session
- Agora integration for video/audio
- Authorization-protected endpoints for initiating/accepting calls
- Earnings tracking for hosts

### Families (Social Groups)
- **Social Groups**: Users can create and join families (clans/guilds)
- **Membership**: Users can only belong to one family at a time
- **Roles**: Owner, Admin, Member hierarchy with different permissions
- **Leaderboard**: Families ranked by total gifts received
- **Requirements**: Families can set minimum level requirements to join
- **Group Chat**: Real-time messaging for family members
- **Management**: Owners can promote/demote admins, kick members
- **Privacy**: Public or private family options

### Coin Purchase System (Stripe Integration)
- **Stripe Checkout**: Users select a coin package, which creates a Stripe Checkout session
- **Flow**: Select package → Confirm → Redirect to Stripe → Return to /coins with session_id → Verify session → Credit coins
- **Endpoints**: POST `/api/coins/checkout` (create session), GET `/api/coins/verify-session/:sessionId` (verify & credit), POST `/api/stripe/webhook` (webhook handler)
- **First Purchase Bonus**: 50% extra coins on first purchase, detected atomically in DB transaction
- **Webhook**: Optional `STRIPE_WEBHOOK_SECRET` for signature verification; falls back to session verification on redirect
- **Secrets**: `STRIPE_SECRET_KEY` (server), `STRIPE_PUBLISHABLE_KEY` (stored but client uses direct URL redirect)

## External Dependencies

### Database
- **PostgreSQL**: Primary database (configured via `DATABASE_URL` environment variable)
- **Drizzle ORM**: Type-safe database queries and schema management
- **@neondatabase/serverless**: Neon database driver support (available but main connection uses pg)

### UI/UX Libraries
- **Radix UI**: Headless component primitives (dialogs, dropdowns, tooltips, etc.)
- **shadcn/ui**: Pre-built accessible components built on Radix
- **Lucide React**: Icon library
- **Framer Motion**: Animation library
- **Embla Carousel**: Carousel/slider component

### Development Tools
- **Vite**: Frontend build tool with HMR
- **esbuild**: Server bundling for production
- **TypeScript**: Type checking across the stack
- **Drizzle Kit**: Database migration tooling

### Form Handling
- **React Hook Form**: Form state management
- **Zod**: Schema validation (integrated with Drizzle for type generation)
- **@hookform/resolvers**: Zod resolver for React Hook Form

### Fonts
- **DM Sans**: Primary body font
- **Outfit**: Display/heading font

### Private Video Calls (1:1)
- **System**: Unified private calls system via `/api/private-calls/*` endpoints
- **Flow**: Viewer clicks Call button (from chat header, profile, or live room) → `requestPrivateCall` creates pending call → Caller navigates to `/private-call/:id` "Calling..." screen → Host sees incoming call banner with ringtone → Accept navigates both to active call → Agora video connection established
- **Billing**: Per-minute (charged every 60s) or per-session (flat fee upfront)
- **Agora**: App ID fetched from server config endpoint (`/api/agora/config`), both participants join as publishers with token authentication
- **Ringtone**: Web Audio API-generated dual-tone ring (440Hz + 480Hz), plays on incoming call banner and caller "Calling..." screen, stops on accept/decline/cancel
- **Chat Integration**: Both voice and video call buttons in chat conversation header initiate private calls (same flow)
- **Components**: `CallButton` (initiates), `PrivateCallPage` (call UI with controls), `IncomingCallBanner` (global incoming call overlay)

### Notification System
- **Notifications Table**: `notifications` table with types: follow, gift, call_request, system, level_up
- **Auto-triggers**: Notifications created automatically on follow, gift send, and private call request
- **Unread Message Counts**: `GET /api/messages/unread-count/:userId` returns total + per-sender breakdown
- **Mark Messages Read**: `POST /api/messages/mark-read` marks conversation as read on open
- **Notification CRUD**: `GET /api/notifications/:userId`, `GET /api/notifications/:userId/unread-count`, `POST /api/notifications/:userId/mark-read`, `POST /api/notifications/:notifId/read`
- **Nav Badges**: Chats icon shows red count badge for unread messages (15s poll); Profile icon shows red dot for unread notifications (30s poll)
- **Chat Unread Indicators**: Per-conversation unread count badges, bold text for unread conversations, auto-mark-read on open
- **Notifications Page**: Groups by time (Today, Yesterday, This Week, Earlier), type-based icons, marks all read on open
- **Global Incoming Call Banner**: Polls pending private calls every 5s, shows slide-down banner with accept/decline on any page, respects DND setting

### Performance Optimizations
- **Polling**: All `refetchInterval` queries use `refetchIntervalInBackground: false` to stop polling when tab is backgrounded
- **Intervals**: Home page 15s (streams), 30s (following), 60s (suggestions); Live room 10s; Chat 5-15s
- **GPU**: Removed `backdrop-blur` from frequently rendered elements (chat messages, buttons) on live page

## Feature Roadmap (Pending)
- **Event Scheduling System**: Calendar-based feature for Explore page allowing creators to schedule upcoming streams and platform events. Users can browse, RSVP, and get reminders for scheduled streams/events.