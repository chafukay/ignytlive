import Layout from "@/components/layout";
import { GuestGate } from "@/components/guest-gate";
import { Users, ChevronLeft, Plus, Search, Crown, Shield, User, Trophy, LogOut, Settings, Loader2 } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { Link, useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface Family {
  id: string;
  name: string;
  description: string | null;
  avatar: string | null;
  ownerId: string;
  memberCount: number;
  maxMembers: number;
  totalGifts: number;
  weeklyGifts: number;
  isPublic: boolean;
  minLevel: number;
  owner: {
    id: string;
    username: string;
    avatar: string | null;
  };
}

interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  role: string;
  contributedGifts: number;
  family: Family;
}

export default function Families() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFamily, setNewFamily] = useState({
    name: "",
    description: "",
    isPublic: true,
    minLevel: 1,
  });

  const { data: families, isLoading } = useQuery<Family[]>({
    queryKey: ["families"],
    queryFn: async () => {
      const res = await fetch("/api/families");
      return res.json();
    },
  });

  const { data: searchResults } = useQuery<Family[]>({
    queryKey: ["families", "search", searchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/families/search?q=${encodeURIComponent(searchQuery)}`);
      return res.json();
    },
    enabled: searchQuery.length > 0,
  });

  const { data: myFamily } = useQuery<FamilyMember | null>({
    queryKey: ["my-family", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/families/my?userId=${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });

  const createFamilyMutation = useMutation({
    mutationFn: async (data: typeof newFamily) => {
      const res = await fetch("/api/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, ownerId: user?.id }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: (family) => {
      toast({ title: "Family created!" });
      setShowCreateDialog(false);
      setNewFamily({ name: "", description: "", isPublic: true, minLevel: 1 });
      queryClient.invalidateQueries({ queryKey: ["families"] });
      queryClient.invalidateQueries({ queryKey: ["my-family"] });
      navigate(`/families/${family.id}`);
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const joinFamilyMutation = useMutation({
    mutationFn: async (familyId: string) => {
      const res = await fetch(`/api/families/${familyId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Joined family!" });
      queryClient.invalidateQueries({ queryKey: ["families"] });
      queryClient.invalidateQueries({ queryKey: ["my-family"] });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const displayFamilies = searchQuery.length > 0 ? searchResults : families;

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getRoleIcon = (role: string) => {
    if (role === "owner") return <Crown className="w-4 h-4 text-yellow-400" />;
    if (role === "admin") return <Shield className="w-4 h-4 text-blue-400" />;
    return <User className="w-4 h-4 text-white/50" />;
  };

  return (
    <GuestGate>
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10" data-testid="button-back">
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
            </Link>
            <h1 className="text-xl font-bold text-white">Families</h1>
          </div>
          {user && !myFamily && (
            <button
              onClick={() => setShowCreateDialog(true)}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center hover:bg-primary/80"
              data-testid="button-create-family"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          )}
        </div>

        {myFamily && (
          <Link href={`/families/${myFamily.familyId}`}>
            <div className="m-4 p-4 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl border border-primary/30 cursor-pointer hover:border-primary/50" data-testid="card-my-family">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-2xl">
                  {myFamily.family.avatar || "👨‍👩‍👧‍👦"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-bold">{myFamily.family.name}</h3>
                    {getRoleIcon(myFamily.role)}
                  </div>
                  <p className="text-white/50 text-sm">
                    {myFamily.family.memberCount}/{myFamily.family.maxMembers} members • Your family
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-yellow-400 font-bold">{formatNumber(myFamily.family.totalGifts)}</div>
                  <div className="text-white/50 text-xs">Total gifts</div>
                </div>
              </div>
            </div>
          </Link>
        )}

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="text"
              placeholder="Search families..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-10 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary"
              data-testid="input-search-families"
            />
          </div>
        </div>

        <div className="px-4 mb-2">
          <h2 className="text-white/70 text-sm font-medium flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            {searchQuery ? "Search Results" : "Top Families"}
          </h2>
        </div>

        <div className="space-y-2 px-4 pb-24">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl animate-pulse">
                <div className="w-12 h-12 rounded-full bg-white/10" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-white/10 rounded mb-2" />
                  <div className="h-3 w-32 bg-white/10 rounded" />
                </div>
              </div>
            ))
          ) : displayFamilies && displayFamilies.length > 0 ? (
            displayFamilies.map((family, index) => (
              <div
                key={family.id}
                className="flex items-center gap-4 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                data-testid={`card-family-${family.id}`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-xl">
                    {family.avatar || "👨‍👩‍👧‍👦"}
                  </div>
                  {index < 3 && (
                    <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? "bg-yellow-400 text-yellow-900" :
                      index === 1 ? "bg-gray-300 text-gray-900" :
                      "bg-amber-600 text-amber-100"
                    }`}>
                      {index + 1}
                    </span>
                  )}
                </div>
                <Link href={`/families/${family.id}`} className="flex-1">
                  <h3 className="text-white font-semibold">{family.name}</h3>
                  <p className="text-white/50 text-sm">
                    {family.memberCount}/{family.maxMembers} members • Owner: {family.owner.username}
                  </p>
                </Link>
                <div className="text-right">
                  <div className="text-yellow-400 font-bold text-sm">{formatNumber(family.totalGifts)}</div>
                  <div className="text-white/50 text-xs">gifts</div>
                </div>
                {user && !myFamily && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      joinFamilyMutation.mutate(family.id);
                    }}
                    disabled={joinFamilyMutation.isPending || !family.isPublic || (user.level || 1) < family.minLevel}
                    className="ml-2"
                    data-testid={`button-join-family-${family.id}`}
                  >
                    {joinFamilyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : !family.isPublic ? "Private" : (user.level || 1) < family.minLevel ? `Lv ${family.minLevel}+` : "Join"}
                  </Button>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-white/50">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{searchQuery ? "No families found" : "No families yet"}</p>
              {!myFamily && (
                <Button
                  className="mt-4"
                  onClick={() => setShowCreateDialog(true)}
                  data-testid="button-create-first-family"
                >
                  Create the first family
                </Button>
              )}
            </div>
          )}
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="bg-zinc-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Create a Family</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-white/70">Family Name</Label>
                <Input
                  value={newFamily.name}
                  onChange={(e) => setNewFamily({ ...newFamily, name: e.target.value })}
                  placeholder="Enter family name"
                  className="bg-white/5 border-white/10 text-white"
                  data-testid="input-family-name"
                />
              </div>
              <div>
                <Label className="text-white/70">Description</Label>
                <Textarea
                  value={newFamily.description}
                  onChange={(e) => setNewFamily({ ...newFamily, description: e.target.value })}
                  placeholder="Describe your family..."
                  className="bg-white/5 border-white/10 text-white"
                  data-testid="input-family-description"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-white/70">Public Family</Label>
                <Switch
                  checked={newFamily.isPublic}
                  onCheckedChange={(checked) => setNewFamily({ ...newFamily, isPublic: checked })}
                  data-testid="switch-family-public"
                />
              </div>
              <div>
                <Label className="text-white/70">Minimum Level to Join</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={newFamily.minLevel}
                  onChange={(e) => setNewFamily({ ...newFamily, minLevel: parseInt(e.target.value) || 1 })}
                  className="bg-white/5 border-white/10 text-white"
                  data-testid="input-family-min-level"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => createFamilyMutation.mutate(newFamily)}
                disabled={!newFamily.name.trim() || createFamilyMutation.isPending}
                data-testid="button-submit-create-family"
              >
                {createFamilyMutation.isPending ? "Creating..." : "Create Family"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
    </GuestGate>
  );
}
