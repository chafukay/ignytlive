# IgnytLIVE

A real-time live streaming and social video platform built for mobile-first experiences. Broadcast live, send gifts, chat in real time, watch short-form videos, and compete in PK battles.

## Features

### Live Streaming
- Go live with real-time video broadcasting (Agora SDK)
- Live chat with emoji support and message translation
- Virtual gift animations with coin-based economy
- PK battles between streamers with live scoring and countdown timer
- Viewer count tracking and stream categories

### Short-Form Videos
- Upload, browse, and interact with short videos
- Like, comment, and share functionality
- TikTok-style vertical scrolling feed

### Social Features
- Follow/unfollow users
- Private 1:1 video/audio calls (Agora)
- Direct messaging with real-time delivery
- User profiles with levels, XP, and achievements
- Families (social groups) with roles, group chat, and leaderboards
- Agencies for managing creator networks
- Referral system

### Virtual Economy
- Coin purchase system via Stripe Checkout
- Virtual gifts with animated effects
- VIP tiers with exclusive benefits
- Leaderboards for top gifters and streamers
- First-purchase bonuses and configurable coin packages

### Events
- Schedule and manage live events
- RSVP system with calendar views
- Event categories and discovery

### Notifications
- In-app notifications for follows, gifts, calls, achievements, and level-ups
- Unread badge counts
- Push notification support (native via FCM, web via VAPID)

### Admin Panel
- Separate admin authentication system
- User management (view, edit, deactivate/reactivate, verify)
- Report management with resolve/dismiss actions
- Automated content moderation with configurable filter words
- Platform statistics and monitoring
- Coin package and VIP tier configuration

### Security
- Bcrypt password hashing
- JWT authentication with configurable secrets
- Rate limiting on all API endpoints
- Brute force protection on login
- WebSocket token authentication (single-use, 30-second TTL)
- Content filtering for chat, titles, and captions
- User blocking, reporting, and muting
- Email verification with 6-digit codes
- Account deletion with data anonymization
- HTTP security headers via Helmet
- Cookie consent banner

### Legal & Compliance
- Terms of Service
- Privacy Policy
- Community Guidelines
- Age gating (18+)
- Guest browsing mode

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui (Radix UI)
- Framer Motion (animations)
- TanStack React Query (server state)
- Wouter (routing)

### Backend
- Node.js + Express + TypeScript
- WebSocket server (ws library)
- esbuild (production build)
- In-memory caching layer (Redis-ready)

### Database
- PostgreSQL + Drizzle ORM
- Shared schema between frontend and backend

### Native Mobile
- Capacitor v7 (Android + iOS)
- Native plugins: Push Notifications, Share, Camera, StatusBar, SplashScreen, Keyboard, Haptics
- Bundle ID: `com.ignytlive.app`

### External Services
- **Agora** - Real-time video/audio streaming and calls
- **Stripe** - Payment processing for coin purchases
- **Twilio** - SMS verification for phone login
- **MyMemory API** - Chat message translation

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your PostgreSQL database and configure `DATABASE_URL`
4. Push the database schema:
   ```bash
   npm run db:push
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5000`

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `USER_JWT_SECRET` | Recommended | Secret for user JWT tokens (random fallback) |
| `ADMIN_JWT_SECRET` | Recommended | Secret for admin JWT tokens (random fallback) |
| `STRIPE_SECRET_KEY` | For payments | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | For payments | Stripe publishable key |
| `VITE_AGORA_APP_ID` | For streaming | Agora App ID |
| `AGORA_APP_CERTIFICATE` | For streaming | Agora App Certificate |
| `TWILIO_ACCOUNT_SID` | For SMS | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | For SMS | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | For SMS | Twilio sender phone number |
| `SMTP_HOST` | For email | SMTP server host |
| `SMTP_PORT` | For email | SMTP server port |
| `SMTP_USER` | For email | SMTP username |
| `SMTP_PASS` | For email | SMTP password |
| `FROM_EMAIL` | For email | Sender email address |
| `FCM_SERVER_KEY` | For push | Firebase Cloud Messaging key |
| `VITE_SERVER_URL` | For native | Server URL for Capacitor native builds |

### Build for Production

```bash
npm run build
npm start
```

### Build Native Apps

```bash
npm run cap:build
npm run cap:open:android
npm run cap:open:ios
```

## Project Structure

```
client/               # Frontend React application
  src/
    components/       # Reusable UI components
    hooks/            # Custom React hooks
    lib/              # Utilities and helpers
    pages/            # Page components (routes)
server/               # Backend Express server
  routes.ts           # API route definitions
  storage.ts          # Database operations (Drizzle)
  index.ts            # Server entry point
  content-filter.ts   # Automated content moderation
  xp-service.ts       # XP and leveling system
  achievement-service.ts  # Achievement tracking
  cache.ts            # In-memory caching layer
shared/
  schema.ts           # Shared database schema (Drizzle + Zod)
android/              # Capacitor Android project
ios/                  # Capacitor iOS project
scripts/              # Build and deployment scripts
```

## Default Credentials

**Admin Panel** (`/admin/login`):
- Username: `admin`
- Password: `admin123`

> Change the default admin password immediately in production.

## License

MIT
