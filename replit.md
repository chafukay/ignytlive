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
- **Build**: esbuild for production bundling with selective dependency bundling for cold start optimization

The server handles API routes, WebSocket connections for real-time features (chat, gifts, viewer counts), and serves the static frontend in production. Development uses Vite's dev server with HMR proxied through Express.

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

### Private Video Calls
- Per-minute billing: Charged every 60 seconds during call
- Per-session billing: Flat fee upfront for entire session
- Agora integration for video/audio
- Authorization-protected endpoints for initiating/accepting calls
- Earnings tracking for hosts

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