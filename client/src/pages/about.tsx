import Layout from "@/components/layout";
import { ChevronRight, Flame, Heart, Shield, Star } from "lucide-react";
import { useLocation } from "wouter";

export default function About() {
  const [, setLocation] = useLocation();

  return (
    <Layout>
      <div className="min-h-screen bg-background p-4">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setLocation("/settings")} className="text-foreground">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-foreground">About</h1>
        </div>

        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-primary to-accent rounded-2xl flex items-center justify-center mb-4">
            <Flame className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold"><span className="text-foreground">Ignyt</span><span className="text-pink-500">LIVE</span></h2>
          <p className="text-muted-foreground">Version 1.0.0</p>
        </div>

        <div className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl p-6 mb-6 border border-primary/30 text-center">
          <p className="text-foreground">The next-generation live streaming platform where creators connect with their audience in real-time.</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card rounded-xl p-4 text-center border border-border">
            <Heart className="w-6 h-6 text-pink-400 mx-auto mb-2" />
            <p className="text-foreground font-bold text-lg">10M+</p>
            <p className="text-muted-foreground text-xs">Users</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center border border-border">
            <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <p className="text-foreground font-bold text-lg">50K+</p>
            <p className="text-muted-foreground text-xs">Creators</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center border border-border">
            <Shield className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <p className="text-foreground font-bold text-lg">24/7</p>
            <p className="text-muted-foreground text-xs">Support</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between py-3 border-b border-border cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded">
            <span className="text-muted-foreground">Terms of Service</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <div className="flex justify-between py-3 border-b border-border cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded">
            <span className="text-muted-foreground">Privacy Policy</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <div className="flex justify-between py-3 border-b border-border cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded">
            <span className="text-muted-foreground">Open Source Licenses</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
          </div>
        </div>

        <p className="text-center text-muted-foreground/50 text-sm mt-8">
          Made with ❤️ by the Ignyt Team
        </p>
      </div>
    </Layout>
  );
}
