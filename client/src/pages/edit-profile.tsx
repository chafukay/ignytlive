import Layout from "@/components/layout";
import { ChevronRight, Camera, Save } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function EditProfile() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");

  const handleSave = () => {
    toast({ title: "Profile updated successfully!" });
    setLocation("/profile");
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setLocation("/settings")} className="text-white">
              <ChevronRight className="w-6 h-6 rotate-180" />
            </button>
            <h1 className="text-xl font-bold text-white">Edit Profile</h1>
          </div>
          <button onClick={handleSave} className="text-primary font-medium flex items-center gap-1">
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>

        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <img 
              src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`}
              className="w-24 h-24 rounded-full object-cover border-4 border-primary/30"
              alt="Profile"
            />
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Camera className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className="text-primary text-sm mt-2">Change Photo</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-white/50 text-sm mb-2 block">Username</label>
            <input 
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-white/50 text-sm mb-2 block">Bio</label>
            <textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary resize-none"
              placeholder="Tell us about yourself..."
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
