# Ignyt Live - Live Social Video Platform

## Overview

Ignyt Live is a real-time live streaming and social video platform designed for mobile-first user experiences, drawing inspiration from TikTok's interface. It enables users to broadcast and watch live streams, send virtual gifts, participate in live chat, view short-form videos, and engage in competitive PK battles. The platform aims to foster a dynamic social video community.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query (server state), React Context (auth state)
- **Styling**: Tailwind CSS with shadcn/ui (New York style)
- **Animations**: Framer Motion
- **Build Tool**: Vite
- **Design**: Mobile-first with responsive desktop support, featuring a TikTok-inspired interface with bottom/side navigation.

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Design**: RESTful
- **Real-time**: WebSocket server (`ws` library) for live interactions.
- **Caching**: In-memory service (`server/cache.ts`) designed for Redis integration, caching user profiles, stream data, moderation checks, and leaderboard queries with specific TTLs.
- **Build**: esbuild for production.

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM.
- **Schema**: Shared between frontend and backend (`shared/schema.ts`).
- **Models**: Users, Streams, Shorts, Follows, Gifts, Gift Transactions, Messages, Stream Comments, User Blocks, User Reports, User Muted Calls, Notifications, Scheduled Events, Event RSVPs.

### Authentication
- **Methods**: Email/username + password (bcrypt hashed), phone with SMS, Replit Auth (social logins), Guest browsing.
- **Password Security**: All user passwords hashed with bcrypt (cost factor 10). Migration runs on startup to hash any remaining plain text passwords.
- **Features**: Age gating (18+), guest mode with restricted access, client-side auth state in localStorage.

### Core Features
- **Real-time Interactions**: Live chat, gift animations, viewer count updates via WebSockets.
- **Moderation**: Room moderators, user bans (permanent/temporary), mutes (duration-based), slow mode, enforced via REST API and WebSockets.
- **User Control**: Block, report, and mute specific users.
- **Private Video Calls**: Agora integration for 1:1 video/audio calls with per-minute or per-session billing.
- **Families (Social Groups)**: User-creatable groups with roles (Owner, Admin, Member), membership management, group chat, and leaderboards.
- **Coin Purchase System**: Stripe Checkout integration for purchasing virtual currency with first-purchase bonuses and webhook verification.
- **Notification System**: In-app notifications for follows, gifts, call requests, and system messages, with unread counts and read/unread management.
- **Admin Panel**: Separate application (`/admin`) with its own authentication (`admin_users` table), for managing users, viewing reports, and monitoring platform statistics.
- **Event Scheduling**: Users can create, manage, and RSVP to scheduled events with categories, calendar views, and integrated authorization.
- **Legal Pages**: Public (no auth required) Terms of Service (`/terms`), Privacy Policy (`/privacy-policy`), and Community Guidelines (`/community-guidelines`) pages. Linked from About, Help, and Register pages. Contact emails: support@ignytlive.com, privacy@ignytlive.com, safety@ignytlive.com.

## External Dependencies

### Database
- **PostgreSQL**
- **Drizzle ORM**
- **@neondatabase/serverless** (for Neon compatibility)

### UI/UX Libraries
- **Radix UI**
- **shadcn/ui**
- **Lucide React** (Icons)
- **Framer Motion** (Animations)
- **Embla Carousel**

### Development Tools
- **Vite**
- **esbuild**
- **TypeScript**
- **Drizzle Kit**

### Form Handling & Validation
- **React Hook Form**
- **Zod**
- **@hookform/resolvers**

### Fonts
- **DM Sans**
- **Outfit**

### Services
- **Agora**: For private video/audio calls.
- **Stripe**: For processing coin purchases.
- **Twilio**: For SMS verification (phone number login).
- **MyMemory API**: For message translation.
- **bcryptjs**: For admin password hashing.
- **jsonwebtoken**: For admin JWT session tokens.

### Security
- **Global API Rate Limiting**: All `/api` endpoints are limited to 100 requests per minute per IP. Returns 429 with `Retry-After` header when exceeded. Stale entries cleaned every 5 minutes.
- **Brute Force Protection**: Both login endpoints (`/api/auth/login` and `/api/admin/auth/login`) have additional stricter rate limiting - 5 attempts per 15-minute window per IP, with 15-minute lockout after exceeding.
- **Registration Rate Limiting**: Registration endpoint uses same brute force limiter (5 per 15 min per IP).
- **SMS Rate Limiting**: Phone verification limited to 3 codes per phone number per hour.
- **Password Hashing**: All user passwords hashed with bcrypt (cost factor 10). Startup migration auto-hashes any remaining plain text passwords.
- **Admin Auth**: JWT Bearer tokens with 8-hour expiry, bcrypt-hashed passwords, server-side token invalidation on logout.
- **Admin Panel**: Fully isolated from main app - separate `admin_users` table, own `AdminAuthProvider` context, independent localStorage key (`adminToken`), no main app providers (no DailyLoginModal, IncomingCallBanner, etc.). Default admin: username `admin`, password `admin123`.