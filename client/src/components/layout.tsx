import { Link, useLocation } from "wouter";
import { Home, Clapperboard, Compass, Coins, MessageCircle, User, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import PullToRefresh from "./pull-to-refresh";
import EmailVerificationBanner from "./email-verification-banner";
import { CookieConsent } from "./cookie-consent";

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const display = count > 99 ? "99+" : count.toString();
  return (
    <span
      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 shadow-lg shadow-red-500/30 z-10"
      data-testid="badge-count"
    >
      {display}
    </span>
  );
}

function NavDot() {
  return (
    <span
      className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 shadow-lg shadow-red-500/30 z-10"
      data-testid="badge-dot"
    />
  );
}

export default function Layout({ children, hideNav = false }: { children: React.ReactNode; hideNav?: boolean }) {
  const [location] = useLocation();
  const { user } = useAuth();

  const { data: unreadMessages } = useQuery({
    queryKey: ['unreadMessageCount', user?.id],
    queryFn: () => api.getUnreadMessageCount(user!.id),
    enabled: !!user?.id,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  const { data: unreadNotifications } = useQuery({
    queryKey: ['unreadNotificationCount', user?.id],
    queryFn: () => api.getUnreadNotificationCount(user!.id),
    enabled: !!user?.id,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  const navItems = [
    { icon: Home, label: "Live", path: "/" },
    { icon: Clapperboard, label: "Shorts", path: "/shorts" },
    { icon: Compass, label: "Explore", path: "/explore" },
    { icon: Coins, label: "Coins", path: "/coins" },
    { icon: MessageCircle, label: "Chats", path: "/chat" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  if (hideNav || !user) {
    return (
      <div className="min-h-screen bg-background text-foreground overflow-hidden">
        <main className="h-screen w-full overflow-y-auto no-scrollbar">
          <PullToRefresh>{children}</PullToRefresh>
        </main>
      </div>
    );
  }

  const totalUnreadMessages = unreadMessages?.total || 0;
  const totalUnreadNotifs = unreadNotifications?.count || 0;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-0 md:pl-20 overflow-hidden">
      <main className="h-screen w-full overflow-y-auto no-scrollbar">
        <EmailVerificationBanner />
        <PullToRefresh>{children}</PullToRefresh>
      </main>

      {(location === "/" || location === "/shorts") && (
        <Link href="/go-live">
          <button 
            className="fixed bottom-20 left-1/2 -translate-x-1/2 md:bottom-8 md:left-auto md:right-8 md:translate-x-0 w-14 h-14 bg-gradient-to-r from-pink-500 to-primary rounded-full flex items-center justify-center shadow-lg shadow-pink-500/30 z-50 hover:scale-110 active:scale-95 transition-transform"
            data-testid="button-floating-go-live"
          >
            <Video className="w-6 h-6 text-white" />
          </button>
        </Link>
      )}

      <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:right-auto md:w-20 md:h-screen bg-card/95 backdrop-blur-lg border-t md:border-t-0 md:border-r border-border z-50">
        <div className="flex md:flex-col justify-around md:justify-center md:gap-6 items-center h-16 md:h-full px-1">
          {navItems.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;

            return (
              <Link key={item.path} href={item.path}>
                <div className={cn(
                  "flex flex-col items-center gap-0.5 cursor-pointer transition-colors p-1.5 rounded-lg hover:bg-white/5 w-14 relative",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}>
                  {item.path === "/chat" && totalUnreadMessages > 0 && (
                    <NavBadge count={totalUnreadMessages} />
                  )}
                  {item.path === "/profile" && totalUnreadNotifs > 0 && (
                    <NavDot />
                  )}
                  <Icon className={cn("w-6 h-6", isActive && "fill-current")} />
                  <span className="text-[9px] font-medium md:hidden">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
      <CookieConsent />
    </div>
  );
}
