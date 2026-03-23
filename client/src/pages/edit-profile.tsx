import Layout from "@/components/layout";
import { GuestGate } from "@/components/guest-gate";
import { ChevronRight, Camera, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function EditProfile() {
  const [, setLocation] = useLocation();
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [gender, setGender] = useState(user?.gender || "");
  const [birthdate, setBirthdate] = useState(
    user?.birthdate ? new Date(user.birthdate).toISOString().split('T')[0] : ""
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max size is 2MB", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setAvatarPreview(dataUrl);
      setPendingAvatar(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const updateMutation = useMutation({
    mutationFn: (data: { username?: string; bio?: string; gender?: string; birthdate?: Date }) => 
      api.updateUser(user!.id, data),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      toast({ title: "Profile updated successfully!" });
      setLocation("/profile");
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update profile", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const handleSave = () => {
    const updates: any = {};
    if (username !== user?.username) updates.username = username;
    if (bio !== user?.bio) updates.bio = bio;
    if (gender !== user?.gender) updates.gender = gender;
    if (birthdate && birthdate !== (user?.birthdate ? new Date(user.birthdate).toISOString().split('T')[0] : "")) {
      updates.birthdate = new Date(birthdate);
    }
    if (pendingAvatar) updates.avatar = pendingAvatar;
    
    if (Object.keys(updates).length === 0) {
      toast({ title: "No changes to save" });
      return;
    }
    
    updateMutation.mutate(updates);
  };

  return (
    <GuestGate>
    <Layout>
      <div className="min-h-screen bg-background p-4">
        <div className="flex items-center mb-6">
          <button onClick={() => setLocation("/settings")} className="text-foreground">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-foreground ml-4">Edit Profile</h1>
        </div>

        <div className="flex flex-col items-center mb-8">
          <div className="relative cursor-pointer" onClick={() => fileInputRef.current?.click()} data-testid="avatar-upload">
            <img 
              src={avatarPreview || user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`}
              className="w-24 h-24 rounded-full object-cover border-4 border-primary/30"
              alt="Profile"
            />
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
              data-testid="avatar-file-input"
            />
          </div>
          <p className="text-primary text-sm mt-2 cursor-pointer" onClick={() => fileInputRef.current?.click()}>Change Photo</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-muted-foreground text-sm mb-2 block">Username</label>
            <input 
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-muted/50 border border-border rounded-xl p-4 text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-muted-foreground text-sm mb-2 block">Bio</label>
            <textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full bg-muted/50 border border-border rounded-xl p-4 text-foreground focus:outline-none focus:border-primary resize-none"
              placeholder="Tell us about yourself..."
              data-testid="input-bio"
            />
          </div>
          <div>
            <label className="text-muted-foreground text-sm mb-2 block">Gender</label>
            <select 
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full bg-muted/50 border border-border rounded-xl p-4 text-foreground focus:outline-none focus:border-primary"
              data-testid="select-gender"
            >
              <option value="" className="bg-card">Select gender</option>
              <option value="male" className="bg-card">Male</option>
              <option value="female" className="bg-card">Female</option>
              <option value="non-binary" className="bg-card">Non-binary</option>
              <option value="other" className="bg-card">Other</option>
            </select>
          </div>
          <div>
            <label className="text-muted-foreground text-sm mb-2 block">Date of Birth</label>
            <input 
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              className="w-full bg-muted/50 border border-border rounded-xl p-4 text-foreground focus:outline-none focus:border-primary"
              data-testid="input-birthdate"
            />
            <p className="text-muted-foreground/60 text-xs mt-1">Must be 18 years or older</p>
          </div>

          <button 
            onClick={handleSave} 
            disabled={updateMutation.isPending}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold py-4 rounded-full mt-8 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            data-testid="button-save"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </Layout>
    </GuestGate>
  );
}
