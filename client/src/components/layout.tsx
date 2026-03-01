import { Link, useLocation } from "wouter";
import { Home, Clapperboard, Compass, Coins, MessageCircle, User, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import PullToRefresh from "./pull-to-refresh";

export default function Layout({ children, hideNav = false }: { children: React.ReactNode; hideNav?: boolean }) {
  const [location] = useLocation();
  const { user } = useAuth();

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

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-0 md:pl-20 overflow-hidden">
      <main className="h-screen w-full overflow-y-auto no-scrollbar">
        <PullToRefresh>{children}</PullToRefresh>
      </main>

      {/* Floating Go Live Button - only on Home and Shorts */}
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

      {/* Bottom Nav (Mobile) / Side Nav (Desktop) */}
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
                  <Icon className={cn("w-6 h-6", isActive && "fill-current")} />
                  <span className="text-[9px] font-medium md:hidden">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
