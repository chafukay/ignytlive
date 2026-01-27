import { Link, useLocation } from "wouter";
import { Home, Compass, Plus, MessageCircle, User, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Compass, label: "Explore", path: "/explore" },
    { icon: Plus, label: "Go Live", path: "/go-live", isPrimary: true },
    { icon: Trophy, label: "Rank", path: "/leaderboard" },
    { icon: MessageCircle, label: "Chat", path: "/chat" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-0 md:pl-20 overflow-hidden">
      <main className="h-screen w-full overflow-y-auto no-scrollbar">
        {children}
      </main>

      {/* Bottom Nav (Mobile) / Side Nav (Desktop) */}
      <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:right-auto md:w-20 md:h-screen bg-black/80 backdrop-blur-lg border-t md:border-t-0 md:border-r border-white/10 z-50">
        <div className="flex md:flex-col justify-around md:justify-center md:gap-8 items-center h-16 md:h-full px-2">
          {navItems.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;

            if (item.isPrimary) {
              return (
                <Link key={item.path} href={item.path}>
                  <div className="relative -top-5 md:top-0 cursor-pointer group">
                    <div className="absolute inset-0 bg-primary rounded-full blur-md opacity-50 group-hover:opacity-80 transition-opacity animate-pulse" />
                    <div className="relative bg-gradient-to-tr from-primary to-accent p-4 rounded-full shadow-lg shadow-primary/30 hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </Link>
              );
            }

            return (
              <Link key={item.path} href={item.path}>
                <div className={cn(
                  "flex flex-col items-center gap-1 cursor-pointer transition-colors p-2 rounded-lg hover:bg-white/5 w-16",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}>
                  <Icon className={cn("w-6 h-6", isActive && "fill-current")} />
                  <span className="text-[10px] font-medium md:hidden">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
