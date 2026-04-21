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
- **Native Mobile**: Capacitor integration for Android and iOS builds. Platform detection via `client/src/lib/capacitor.ts`. Native plugins: Push Notifications, Share, Camera, StatusBar, SplashScreen, Keyboard, Haptics, App (back button), Biometric Auth.
- **Biometric Login**: `@aparajita/capacitor-biometric-auth` for fingerprint/Face ID/PIN login on native. Utility in `client/src/lib/biometric-auth.ts`. After first successful login, user is prompted to enable quick login. Credentials stored in localStorage (token + user). Settings page has toggle to enable/disable. On login page, biometric button auto-appears if enabled. Auto-triggers biometric prompt on app open if previously enabled.

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
- **Methods**: Email/username + password (bcrypt hashed), phone with SMS, Google Sign-In (OAuth 2.0 via `@react-oauth/google` + `google-auth-library`), Replit Auth (social logins), Guest browsing.
- **Google Sign-In**: Frontend uses `@react-oauth/google` `GoogleLogin` component wrapped in `GoogleOAuthProvider`. Backend verifies Google ID token via `google-auth-library` `OAuth2Client.verifyIdToken()` at `POST /api/auth/google`. Auto-creates user account from Google profile (name, email, avatar) or links to existing account by email. Env vars: `GOOGLE_CLIENT_ID` (server), `VITE_GOOGLE_CLIENT_ID` (client). Users table `socialProvider`/`socialProviderId` columns store Google linkage. New Google users prompted to verify age (18+) via `needsAge` response flag.
- **Password Security**: All user passwords hashed with bcrypt (cost factor 10). Migration runs on startup to hash any remaining plain text passwords.
- **Email Verification**: 6-digit code generated with `crypto.randomInt()` on registration, stored in DB with 24h expiry. Email sent via nodemailer when SMTP configured (env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`). Endpoints: `POST /api/auth/send-email-verification`, `POST /api/auth/verify-email`. Both endpoints have dual rate limiting (IP + userId, 5 per 15min with lockout). Profile shows persistent email verification status badge (green verified / amber unverified) plus dismissible banner. Admin panel shows verification status per user. All API responses sanitized via `toSafeUser()` and `stripPasswords()` to strip `password`, `emailVerificationToken`, `emailVerificationExpiry`.
- **Password Reset**: `POST /api/auth/forgot-password` accepts email/phone/username, auto-detects channel (SMS preferred when phone-typed identifier provided, otherwise email), generates 6-digit code with 15min expiry stored in `passwordResetToken`/`passwordResetExpiry`/`passwordResetChannel` columns. `POST /api/auth/reset-password` verifies code, hashes new password (min 8 chars, bcrypt), clears token. Generic response prevents user enumeration. Wired through `checkSmsAbuse`/`checkEmailAbuse` and `checkLoginRateLimit` (5 attempts per 15min per IP). Frontend page at `/forgot-password`, link from login.
- **Account Deletion**: Soft-delete via `DELETE /api/auth/delete-account` with password re-entry. Sets `isDeleted=true`, `deletedAt` timestamp, anonymizes username/email, clears PII (avatar, bio, phone, location, social links), removes follows. Deleted accounts blocked from login (both password and phone). Settings page has "Delete Account" with confirmation dialog requiring password + typing "DELETE". Admin panel shows Active/Deleted status column.
- **Features**: Age gating (18+), guest mode with restricted access, client-side auth state in localStorage.

### Core Features
- **Real-time Interactions**: Live chat, gift animations, viewer count updates via WebSockets.
- **Moderation**: Room moderators, user bans (permanent/temporary), mutes (duration-based), slow mode, enforced via REST API and WebSockets.
- **Automated Content Moderation**: Text filtering service (`server/content-filter.ts`) with default profanity/slur list plus admin-configurable custom words. Filters chat messages (WebSocket), stream titles, and short captions. Filtered words replaced with asterisks. Link detection with optional per-stream blocking (`blockLinks` column on streams). Flagged content logged to DB for admin review. Admin panel "Moderation" tab for managing filter words (CRUD) and reviewing flagged content.
- **User Control**: Block, report, and mute specific users.
- **Private Video Calls**: Agora integration for 1:1 video/audio calls with per-minute or per-session billing.
- **Families (Social Groups)**: User-creatable groups with roles (Owner, Admin, Member), membership management, group chat, and leaderboards.
- **Coin Purchase System**: Platform-aware purchasing — Stripe Checkout on web, RevenueCat native IAP on Android/iOS. First-purchase 50% bonus applies on all platforms. DB-driven coin packages with admin-configurable pricing.
- **Notification System**: In-app notifications for follows, gifts, call requests, and system messages, with unread counts and read/unread management.
- **Admin Panel**: Separate application (`/admin`) with its own authentication (`admin_users` table), for managing users, viewing reports, and monitoring platform statistics.
- **Event Scheduling**: Users can create, manage, and RSVP to scheduled events with categories, calendar views, and integrated authorization.
- **Legal Pages**: Public (no auth required) Terms of Service (`/terms`), Privacy Policy (`/privacy` and `/privacy-policy`), and Community Guidelines (`/community-guidelines`) pages. Linked from About, Help, and Register pages. Contact emails: support@ignytlive.com, privacy@ignytlive.com, safety@ignytlive.com. Privacy settings page moved to `/privacy-settings`.

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

### Native Mobile (Capacitor)
- **@capacitor/core, @capacitor/cli**: Core framework for wrapping web app in native shell.
- **@capacitor/android, @capacitor/ios**: Native platform projects (`android/`, `ios/` directories).
- **@capacitor/app**: Android back button handling, app lifecycle.
- **@capacitor/push-notifications**: Native push notifications (replaces web push on native).
- **@capacitor/share**: Native share sheet (replaces `navigator.share` on native).
- **@capacitor/camera**: Camera access on native devices.
- **@capacitor/status-bar**: Native status bar styling (dark style, black background).
- **@capacitor/splash-screen**: Native splash screen with auto-hide.
- **@capacitor/keyboard**: Keyboard management and resize behavior.
- **@capacitor/haptics**: Haptic feedback on native devices.
- **Bundle ID**: `com.ignytlive.app`
- **Web Dir**: `dist/public`
- **Config**: `capacitor.config.ts`
- **Platform Detection**: `client/src/lib/capacitor.ts` — `isNative()`, `getPlatform()`, `getServerUrl()`, `getWebSocketUrl()`.
- **API URL**: On native, all API calls use `getServerUrl()` which returns `VITE_SERVER_URL` env var or falls back to `https://ignytlive.replit.app`. On web, returns empty string (relative paths).
- **Build**: Run `./scripts/cap-build.sh` or `npm run build && npx cap sync` to build web and sync native projects.

### Services
- **Firebase Cloud Messaging (FCM)**: Push notifications for web and native. Client SDK (`firebase`) for token acquisition, Firebase Admin SDK (`firebase-admin`) for server-side delivery. Service worker: `client/public/firebase-messaging-sw.js`. Client config: `client/src/lib/firebase.ts`. Server: `server/push-service.ts`. FCM tokens stored in `native_push_tokens` table. Env vars: `VITE_FIREBASE_*` (client config), `FIREBASE_SERVICE_ACCOUNT_KEY` (server, JSON string of service account). Also retains Web Push (VAPID) as fallback.
- **Agora**: For private video/audio calls.
- **Stripe**: For processing coin purchases (web).
- **RevenueCat** (`@revenuecat/purchases-capacitor`): Native in-app purchases for Android (Google Play Billing) and iOS (Apple IAP). Client lib: `client/src/lib/revenuecat.ts`. Initialized on native app startup after login. SDK configured with platform-specific API keys (`VITE_REVENUECAT_IOS_KEY`, `VITE_REVENUECAT_ANDROID_KEY`). Server-side validation via `POST /api/coins/native-purchase` with optional RevenueCat REST API verification (`REVENUECAT_API_KEY`). Webhook endpoint: `POST /api/revenuecat/webhook` (secured with `REVENUECAT_WEBHOOK_SECRET`). Product identifiers follow `{coins}_coins` pattern (e.g., `500_coins`, `1000_coins`). Purchases stored in `coin_purchases` table with `rc_` prefixed transaction IDs.
- **Twilio**: For SMS verification (phone number login).
- **MyMemory API**: For message translation.
- **bcryptjs**: For admin password hashing.
- **jsonwebtoken**: For admin JWT session tokens.

### Security
- **HTTP Security Headers**: Helmet middleware with configured CSP (allows Stripe, Google Fonts, dicebear, Agora, WebSockets).
- **JSON Body Limit**: 5MB max request body size.
- **Global API Rate Limiting**: All `/api` endpoints are limited to 100 requests per minute per IP. Returns 429 with `Retry-After` header when exceeded. Stale entries cleaned every 5 minutes.
- **Brute Force Protection**: Both login endpoints (`/api/auth/login` and `/api/admin/auth/login`) have additional stricter rate limiting - 5 attempts per 15-minute window per IP, with 15-minute lockout after exceeding.
- **Registration Rate Limiting**: Registration endpoint uses same brute force limiter (5 per 15 min per IP).
- **SMS Rate Limiting**: Phone verification limited to 3 codes per phone number per hour.
- **SMS Country Validation**: `libphonenumber-js`-based parsing in `server/abuse-protection.ts` (`inspectPhoneCountry`). Default blocklist (CU/IR/KP/SY/SD) always enforced. `SMS_COUNTRY_ALLOWLIST` env var supports both ISO codes (US, IN) and dialing codes (1, 91). Public `POST /api/sms/check-country` returns `{supported, valid, country, countryName, callingCode, errorCode, reason, suggestedAction}` for inline form validation. Unsupported country errors carry `errorCode: "COUNTRY_NOT_SUPPORTED"` + `suggestedAction: "use_email"`. Login phone form and forgot-password form show debounced flag + country name and disable submit when blocked. Admin Moderation tab has read-only "SMS Country Settings" panel showing allowlist/blocklist (`GET /api/admin/sms-country-settings`).
- **Password Hashing**: All user passwords hashed with bcrypt (cost factor 10). Startup migration auto-hashes any remaining plain text passwords.
- **Admin Auth**: JWT Bearer tokens with 8-hour expiry, bcrypt-hashed passwords, server-side token invalidation on logout. Single `requireAdmin` middleware defined early and shared by all admin routes. `ADMIN_JWT_SECRET` env var recommended; falls back to random secret with startup warning.
- **Admin Panel**: Fully isolated from main app - separate `admin_users` table, own `AdminAuthProvider` context, independent localStorage key (`adminToken`), no main app providers (no DailyLoginModal, IncomingCallBanner, etc.). Default admin: username `admin`, password `admin123`. Admin user update schema restricted to vipTier/coins/diamonds/level — no role escalation via update endpoint.
- **Route Ownership Validation**: `validateUserAccess()` checks on sensitive user-mutating routes (profile updates, block/unblock, report, mute, messaging, coin checkout, notifications). Validates user exists and is not deleted.
- **WebSocket Auth**: Token-based WebSocket authentication via `POST /api/auth/ws-token`. Tokens are single-use, 30-second TTL. Server-validated userId bound to WebSocket connection and overrides client-supplied userId in messages.
- **Cookie Consent**: Banner component (`client/src/components/cookie-consent.tsx`) in Layout. Shows on first visit, stores preference in localStorage. Links to Privacy Policy.
- **CSRF**: Not applicable — app uses localStorage JWT tokens (not cookies) for auth, so no CSRF surface on API endpoints.