import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./lib/auth-context";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import LiveRoom from "@/pages/live";
import Explore from "@/pages/explore";
import GoLive from "@/pages/go-live";
import Chat from "@/pages/chat";
import Conversation from "@/pages/conversation";
import Profile from "@/pages/profile";
import Leaderboard from "@/pages/leaderboard";
import Shorts from "@/pages/shorts";
import Groups from "@/pages/groups";
import Following from "@/pages/following";
import Coins from "@/pages/coins";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/following" component={Following} />
      <Route path="/explore" component={Explore} />
      <Route path="/coins" component={Coins} />
      <Route path="/go-live" component={GoLive} />
      <Route path="/chat" component={Chat} />
      <Route path="/chat/:userId" component={Conversation} />
      <Route path="/shorts" component={Shorts} />
      <Route path="/groups" component={Groups} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/profile" component={Profile} />
      <Route path="/live/:id" component={LiveRoom} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
