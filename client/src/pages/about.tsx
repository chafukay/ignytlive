import Layout from "@/components/layout";
import { ChevronRight, Flame, Heart, Shield, Star, Mail, FileText, Scale, Users } from "lucide-react";
import { useLocation } from "wouter";

export default function About() {
  const [, setLocation] = useLocation();

  return (
    <Layout>
      <div className="min-h-screen bg-background p-4 pb-20">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setLocation("/settings")} className="text-foreground" data-testid="button-back">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-foreground">About</h1>
        </div>

        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-primary to-accent rounded-2xl flex items-center justify-center mb-4">
            <Flame className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold"><span className="text-foreground">Ignyt</span><span className="text-pink-500">LIVE</span></h2>
          <p className="text-muted-foreground" data-testid="text-version">Version 1.0.0</p>
        </div>

        <div className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl p-6 mb-6 border border-primary/30 text-center">
          <p className="text-foreground">The next-generation live streaming platform where creators connect with their audience in real-time.</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card rounded-xl p-4 text-center border border-border">
            <Heart className="w-6 h-6 text-pink-400 mx-auto mb-2" />
            <p className="text-foreground font-bold text-lg">Live</p>
            <p className="text-muted-foreground text-xs">Streaming</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center border border-border">
            <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <p className="text-foreground font-bold text-lg">Gifts</p>
            <p className="text-muted-foreground text-xs">& Rewards</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center border border-border">
            <Shield className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <p className="text-foreground font-bold text-lg">Safe</p>
            <p className="text-muted-foreground text-xs">Community</p>
          </div>
        </div>

        <div className="space-y-2 mb-6">
          <div
            onClick={() => setLocation("/terms")}
            className="flex items-center gap-3 py-3 px-2 border-b border-border cursor-pointer hover:bg-muted/30 rounded"
            data-testid="link-terms"
          >
            <Scale className="w-5 h-5 text-muted-foreground" />
            <span className="text-foreground flex-1">Terms of Service</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <div
            onClick={() => setLocation("/privacy")}
            className="flex items-center gap-3 py-3 px-2 border-b border-border cursor-pointer hover:bg-muted/30 rounded"
            data-testid="link-privacy-policy"
          >
            <Shield className="w-5 h-5 text-muted-foreground" />
            <span className="text-foreground flex-1">Privacy Policy</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <div
            onClick={() => setLocation("/community-guidelines")}
            className="flex items-center gap-3 py-3 px-2 border-b border-border cursor-pointer hover:bg-muted/30 rounded"
            data-testid="link-community-guidelines"
          >
            <Users className="w-5 h-5 text-muted-foreground" />
            <span className="text-foreground flex-1">Community Guidelines</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border mb-4">
          <h3 className="text-foreground font-bold mb-2 flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Contact Us
          </h3>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              General Support:{" "}
              <a href="mailto:support@ignytlive.com" className="text-primary hover:underline" data-testid="link-support-email">support@ignytlive.com</a>
            </p>
            <p className="text-muted-foreground">
              Privacy Inquiries:{" "}
              <a href="mailto:privacy@ignytlive.com" className="text-primary hover:underline" data-testid="link-privacy-email">privacy@ignytlive.com</a>
            </p>
            <p className="text-muted-foreground">
              Safety & Reports:{" "}
              <a href="mailto:safety@ignytlive.com" className="text-primary hover:underline" data-testid="link-safety-email">safety@ignytlive.com</a>
            </p>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="text-foreground font-bold mb-2 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Age Rating
          </h3>
          <p className="text-muted-foreground text-sm">
            IgnytLIVE is rated 18+ and is intended for adult users only. Age verification is required during registration. This app is not intended for children under 18 years of age.
          </p>
        </div>

        <p className="text-center text-muted-foreground/50 text-sm mt-8">
          &copy; 2026 IgnytLIVE. All rights reserved.
        </p>
      </div>
    </Layout>
  );
}
