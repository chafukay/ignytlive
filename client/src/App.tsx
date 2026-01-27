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
import Login from "@/pages/login";
import Register from "@/pages/register";
import Admin from "@/pages/admin";
import Notifications from "@/pages/notifications";
import Settings from "@/pages/settings";
import Store from "@/pages/store";
import UserLevel from "@/pages/user-level";
import TopGifters from "@/pages/top-gifters";
import ItemBag from "@/pages/item-bag";
import EditProfile from "@/pages/edit-profile";
import Privacy from "@/pages/privacy";
import Help from "@/pages/help";
import About from "@/pages/about";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/admin" component={Admin} />
      <Route path="/notifications" component={Notifications} />
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
      <Route path="/settings" component={Settings} />
      <Route path="/store" component={Store} />
      <Route path="/user-level" component={UserLevel} />
      <Route path="/top-gifters" component={TopGifters} />
      <Route path="/item-bag" component={ItemBag} />
      <Route path="/edit-profile" component={EditProfile} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/help" component={Help} />
      <Route path="/about" component={About} />
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
