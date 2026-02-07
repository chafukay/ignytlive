import Layout from "@/components/layout";
import { GuestGate } from "@/components/guest-gate";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, Copy, Gift, Share2, CheckCircle } from "lucide-react";
import { useState } from "react";

export default function Referrals() {
  const { user, setUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [applyCode, setApplyCode] = useState("");

  const { data: referralData, refetch: refetchCode } = useQuery({
    queryKey: ['referral-code', user?.id],
    queryFn: () => api.generateReferralCode(user!.id),
    enabled: !!user,
  });

  const applyMutation = useMutation({
    mutationFn: (code: string) => api.applyReferralCode(user!.id, code),
    onSuccess: (data) => {
      if (user) {
        setUser({ ...user, coins: user.coins + data.bonusCoins, referredBy: "applied" });
      }
      toast({ title: `Referral applied! You earned ${data.bonusCoins} coins` });
      setApplyCode("");
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to apply referral code", variant: "destructive" });
    },
  });

  const copyCode = () => {
    if (referralData?.referralCode) {
      navigator.clipboard.writeText(referralData.referralCode);
      toast({ title: "Referral code copied!" });
    }
  };

  const shareCode = () => {
    if (referralData?.referralCode && navigator.share) {
      navigator.share({
        title: "Join me on IgnytLIVE!",
        text: `Use my referral code ${referralData.referralCode} to get 100 free coins when you sign up on IgnytLIVE!`,
      }).catch(() => {});
    } else {
      copyCode();
    }
  };

  if (!user) return null;

  const alreadyReferred = !!user.referredBy;

  return (
    <GuestGate>
    <Layout>
      <div className="min-h-screen bg-background p-4 pb-24 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setLocation("/profile")} className="text-foreground" data-testid="button-back">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Invite Friends</h1>
        </div>

        <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-2xl p-6 mb-6 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Earn Free Coins!</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Share your referral code with friends. When they sign up and use your code, you both get bonus coins!
          </p>
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">200</div>
              <div className="text-xs text-muted-foreground">You earn</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">100</div>
              <div className="text-xs text-muted-foreground">Friend earns</div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Your Referral Code</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-muted rounded-xl px-4 py-3 text-center">
              <span className="text-xl font-bold tracking-widest text-foreground" data-testid="text-referral-code">
                {referralData?.referralCode || "Generating..."}
              </span>
            </div>
            <button
              onClick={copyCode}
              className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
              data-testid="button-copy-code"
            >
              <Copy className="w-5 h-5 text-primary" />
            </button>
          </div>
          <button
            onClick={shareCode}
            className="w-full mt-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            data-testid="button-share-code"
          >
            <Share2 className="w-5 h-5" />
            Share with Friends
          </button>
        </div>

        {!alreadyReferred && (
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Have a Referral Code?</h3>
            <p className="text-muted-foreground text-xs mb-3">
              Enter a friend's referral code to earn 100 bonus coins!
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={applyCode}
                onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
                placeholder="Enter code"
                className="flex-1 bg-muted rounded-xl px-4 py-3 text-foreground text-center tracking-widest font-bold uppercase placeholder:font-normal placeholder:tracking-normal"
                data-testid="input-apply-code"
              />
              <button
                onClick={() => applyCode && applyMutation.mutate(applyCode)}
                disabled={!applyCode || applyMutation.isPending}
                className="px-6 py-3 bg-primary text-white font-bold rounded-xl disabled:opacity-50"
                data-testid="button-apply-code"
              >
                {applyMutation.isPending ? "..." : "Apply"}
              </button>
            </div>
          </div>
        )}

        {alreadyReferred && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <p className="text-foreground text-sm">You've already used a referral code and earned your bonus!</p>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">How It Works</h3>
          <div className="space-y-4">
            {[
              { step: "1", title: "Share Your Code", desc: "Send your unique referral code to friends" },
              { step: "2", title: "Friend Signs Up", desc: "They create an account and enter your code" },
              { step: "3", title: "Both Earn Coins", desc: "You get 200 coins, they get 100 coins!" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold text-sm">{item.step}</span>
                </div>
                <div>
                  <p className="text-foreground font-medium text-sm">{item.title}</p>
                  <p className="text-muted-foreground text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
    </GuestGate>
  );
}
