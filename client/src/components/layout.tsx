import { Link, useLocation } from "wouter";
import { Home, Users, Compass, Coins, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

export default function Layout({ children, hideNav = false }: { children: React.ReactNode; hideNav?: boolean }) {
  const [location] = useLocation();
  const { user } = useAuth();

  const navItems = [
    { icon: Home, label: "For You", path: "/" },
    { icon: Users, label: "Following", path: "/following" },
    { icon: Compass, label: "Explore", path: "/explore" },
    { icon: Coins, label: "Coins", path: "/coins" },
    { icon: MessageCircle, label: "Chats", path: "/chat", badge: 99 },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  if (hideNav) {
    return (
      <div className="min-h-screen bg-background text-foreground overflow-hidden">
        <main className="h-screen w-full overflow-y-auto no-scrollbar">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-0 md:pl-20 overflow-hidden">
      <main className="h-screen w-full overflow-y-auto no-scrollbar">
        {children}
      </main>

      {/* Bottom Nav (Mobile) / Side Nav (Desktop) */}
      <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:right-auto md:w-20 md:h-screen bg-black/80 backdrop-blur-lg border-t md:border-t-0 md:border-r border-white/10 z-50">
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
                  <div className="relative">
                    <Icon className={cn("w-6 h-6", isActive && "fill-current")} />
                    {item.badge && (
                      <span className="absolute -top-2 -right-3 bg-pink-500 text-white text-[9px] font-bold px-1 rounded-full min-w-[16px] text-center">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </div>
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
