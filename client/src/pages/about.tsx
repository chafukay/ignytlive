import Layout from "@/components/layout";
import { ChevronRight, Flame, Heart, Shield, Star } from "lucide-react";
import { useLocation } from "wouter";

export default function About() {
  const [, setLocation] = useLocation();

  return (
    <Layout>
      <div className="min-h-screen bg-background p-4">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setLocation("/settings")} className="text-white">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-white">About</h1>
        </div>

        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-primary to-accent rounded-2xl flex items-center justify-center mb-4">
            <Flame className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold"><span className="text-white">Ignyt</span><span className="text-pink-500">LIVE</span></h2>
          <p className="text-white/50">Version 1.0.0</p>
        </div>

        <div className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl p-6 mb-6 border border-primary/30 text-center">
          <p className="text-white">The next-generation live streaming platform where creators connect with their audience in real-time.</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
            <Heart className="w-6 h-6 text-pink-400 mx-auto mb-2" />
            <p className="text-white font-bold text-lg">10M+</p>
            <p className="text-white/50 text-xs">Users</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
            <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <p className="text-white font-bold text-lg">50K+</p>
            <p className="text-white/50 text-xs">Creators</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
            <Shield className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <p className="text-white font-bold text-lg">24/7</p>
            <p className="text-white/50 text-xs">Support</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between py-3 border-b border-white/10">
            <span className="text-white/70">Terms of Service</span>
            <ChevronRight className="w-5 h-5 text-white/30" />
          </div>
          <div className="flex justify-between py-3 border-b border-white/10">
            <span className="text-white/70">Privacy Policy</span>
            <ChevronRight className="w-5 h-5 text-white/30" />
          </div>
          <div className="flex justify-between py-3 border-b border-white/10">
            <span className="text-white/70">Open Source Licenses</span>
            <ChevronRight className="w-5 h-5 text-white/30" />
          </div>
        </div>

        <p className="text-center text-white/30 text-sm mt-8">
          Made with ❤️ by the Ignyt Team
        </p>
      </div>
    </Layout>
  );
}
