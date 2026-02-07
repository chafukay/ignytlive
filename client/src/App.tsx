import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./lib/auth-context";
import { ThemeProvider } from "./lib/theme-context";
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
import PrivateCall from "@/pages/private-call";
import UserProfile from "@/pages/user-profile";
import PostShort from "@/pages/post-short";
import MyPosts from "@/pages/my-posts";
import VIPPlans from "@/pages/vip-plans";
import Families from "@/pages/families";
import FamilyDetail from "@/pages/family-detail";
import Achievements from "@/pages/achievements";
import LinkAccount from "@/pages/link-account";
import Referrals from "@/pages/referrals";
import ProfileVisitors from "@/pages/profile-visitors";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user } = useAuth();
  if (!user) {
    return <Redirect to="/login" />;
  }
  return <Component />;
}

function Router() {
  const { user } = useAuth();
  
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/">{user ? <Home /> : <Redirect to="/login" />}</Route>
      <Route path="/admin">{() => <ProtectedRoute component={Admin} />}</Route>
      <Route path="/notifications">{() => <ProtectedRoute component={Notifications} />}</Route>
      <Route path="/following">{() => <ProtectedRoute component={Following} />}</Route>
      <Route path="/explore">{() => <ProtectedRoute component={Explore} />}</Route>
      <Route path="/coins">{() => <ProtectedRoute component={Coins} />}</Route>
      <Route path="/go-live">{() => <ProtectedRoute component={GoLive} />}</Route>
      <Route path="/chat">{() => <ProtectedRoute component={Chat} />}</Route>
      <Route path="/chat/:userId">{() => <ProtectedRoute component={Conversation} />}</Route>
      <Route path="/shorts">{() => <ProtectedRoute component={Shorts} />}</Route>
      <Route path="/post-short">{() => <ProtectedRoute component={PostShort} />}</Route>
      <Route path="/my-posts">{() => <ProtectedRoute component={MyPosts} />}</Route>
      <Route path="/groups">{() => <ProtectedRoute component={Groups} />}</Route>
      <Route path="/leaderboard">{() => <ProtectedRoute component={Leaderboard} />}</Route>
      <Route path="/profile/:userId">{() => <ProtectedRoute component={UserProfile} />}</Route>
      <Route path="/profile">{() => <ProtectedRoute component={Profile} />}</Route>
      <Route path="/live/:id" component={LiveRoom} />
      <Route path="/private-call/:id">{() => <ProtectedRoute component={PrivateCall} />}</Route>
      <Route path="/settings">{() => <ProtectedRoute component={Settings} />}</Route>
      <Route path="/store">{() => <ProtectedRoute component={Store} />}</Route>
      <Route path="/user-level">{() => <ProtectedRoute component={UserLevel} />}</Route>
      <Route path="/top-gifters">{() => <ProtectedRoute component={TopGifters} />}</Route>
      <Route path="/item-bag">{() => <ProtectedRoute component={ItemBag} />}</Route>
      <Route path="/vip-plans">{() => <ProtectedRoute component={VIPPlans} />}</Route>
      <Route path="/edit-profile">{() => <ProtectedRoute component={EditProfile} />}</Route>
      <Route path="/privacy">{() => <ProtectedRoute component={Privacy} />}</Route>
      <Route path="/help">{() => <ProtectedRoute component={Help} />}</Route>
      <Route path="/about">{() => <ProtectedRoute component={About} />}</Route>
      <Route path="/families">{() => <ProtectedRoute component={Families} />}</Route>
      <Route path="/families/:id">{() => <ProtectedRoute component={FamilyDetail} />}</Route>
      <Route path="/achievements">{() => <ProtectedRoute component={Achievements} />}</Route>
      <Route path="/link-account">{() => <ProtectedRoute component={LinkAccount} />}</Route>
      <Route path="/referrals">{() => <ProtectedRoute component={Referrals} />}</Route>
      <Route path="/profile-visitors">{() => <ProtectedRoute component={ProfileVisitors} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
