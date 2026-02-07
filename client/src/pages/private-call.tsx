import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { GuestGate } from "@/components/guest-gate";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";

const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID;

export default function PrivateCallPage() {
  const { id: callId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const billingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: call, refetch: refetchCall } = useQuery({
    queryKey: ['privateCall', callId],
    queryFn: () => api.getPrivateCall(callId!),
    enabled: !!callId,
    refetchInterval: isConnected ? false : 2000,
  });

  const isHost = call?.hostId === user?.id;
  const isViewer = call?.viewerId === user?.id;

  const endCallMutation = useMutation({
    mutationFn: (endReason: string) => api.endPrivateCall(callId!, user!.id, endReason),
    onSuccess: () => {
      cleanup();
      setLocation('/');
    },
  });

  const billMinuteMutation = useMutation({
    mutationFn: () => api.billPrivateCallMinute(callId!, user!.id),
    onError: (error: any) => {
      if (error.message.includes("Insufficient funds")) {
        toast({
          title: "Call Ended",
          description: "Insufficient coins to continue the call",
          variant: "destructive",
        });
        cleanup();
        setLocation('/');
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  const cleanup = async () => {
    if (billingIntervalRef.current) {
      clearInterval(billingIntervalRef.current);
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    if (localVideoTrack) {
      localVideoTrack.stop();
      localVideoTrack.close();
    }
    if (localAudioTrack) {
      localAudioTrack.stop();
      localAudioTrack.close();
    }
    if (client) {
      await client.leave();
    }
  };

  const initializeAgora = async () => {
    if (!call?.agoraChannel || !AGORA_APP_ID) return;

    try {
      const agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      setClient(agoraClient);

      agoraClient.on("user-published", async (remoteUser, mediaType) => {
        await agoraClient.subscribe(remoteUser, mediaType);
        if (mediaType === "video" && remoteVideoRef.current) {
          remoteUser.videoTrack?.play(remoteVideoRef.current);
        }
        if (mediaType === "audio") {
          remoteUser.audioTrack?.play();
        }
      });

      agoraClient.on("user-left", () => {
        toast({
          title: "Call Ended",
          description: "The other user left the call",
        });
        endCallMutation.mutate(isHost ? "viewer_ended" : "host_ended");
      });

      await agoraClient.join(AGORA_APP_ID, call.agoraChannel, null, user?.id);

      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      setLocalAudioTrack(audioTrack);
      setLocalVideoTrack(videoTrack);

      if (localVideoRef.current) {
        videoTrack.play(localVideoRef.current);
      }

      await agoraClient.publish([audioTrack, videoTrack]);
      setIsConnected(true);

      durationIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      if (!isHost && call.billingMode === "per_minute") {
        billingIntervalRef.current = setInterval(() => {
          billMinuteMutation.mutate();
        }, 60000);
      }

    } catch (error) {
      console.error("Agora error:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to video call",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (call?.status === "active" && !isConnected) {
      initializeAgora();
    }
    if (call?.status === "ended" || call?.status === "declined" || call?.status === "cancelled") {
      cleanup();
      setLocation('/');
    }
  }, [call?.status]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const toggleMute = () => {
    if (localAudioTrack) {
      localAudioTrack.setEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localVideoTrack) {
      localVideoTrack.setEnabled(isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleEndCall = () => {
    endCallMutation.mutate(isHost ? "host_ended" : "viewer_ended");
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!call) {
    return (
      <GuestGate>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-white">Loading call...</div>
        </div>
      </GuestGate>
    );
  }

  if (call.status === "pending" && isHost) {
    return (
      <GuestGate>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex flex-col items-center justify-center p-6">
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-white mb-2">Incoming Private Call</h2>
          <p className="text-gray-400">Someone wants to video chat with you</p>
          <div className="mt-4 flex items-center justify-center gap-2 text-yellow-400">
            <Coins className="w-4 h-4" />
            <span>
              {call.billingMode === "per_minute" 
                ? `${call.ratePerMinute} coins/min`
                : `${call.sessionPrice} coins/session`
              }
            </span>
          </div>
        </div>
        <div className="flex gap-4">
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-16 h-16"
            onClick={() => api.declinePrivateCall(callId!, user!.id).then(() => setLocation('/'))}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
          <Button
            size="lg"
            className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600"
            onClick={() => api.acceptPrivateCall(callId!, user!.id).then(() => refetchCall())}
          >
            <Phone className="w-6 h-6" />
          </Button>
        </div>
      </div>
      </GuestGate>
    );
  }

  if (call.status === "pending" && isViewer) {
    return (
      <GuestGate>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-white mb-2">Calling...</h2>
          <p className="text-gray-400">Waiting for host to accept</p>
          <div className="mt-4 flex items-center justify-center gap-2 text-yellow-400">
            <Coins className="w-4 h-4" />
            <span>
              {call.billingMode === "per_minute" 
                ? `${call.ratePerMinute} coins/min`
                : `${call.sessionPrice} coins/session`
              }
            </span>
          </div>
        </div>
        <Button
          variant="destructive"
          size="lg"
          className="mt-8 rounded-full w-16 h-16"
          onClick={() => api.endPrivateCall(callId!, user!.id, "viewer_ended").then(() => setLocation('/'))}
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
      </GuestGate>
    );
  }

  return (
    <GuestGate>
    <div className="min-h-screen bg-black relative">
      <div ref={remoteVideoRef} className="absolute inset-0 bg-gray-900" data-testid="remote-video" />
      
      <div 
        ref={localVideoRef} 
        className="absolute top-4 right-4 w-32 h-44 bg-gray-800 rounded-lg overflow-hidden border-2 border-white/20"
        data-testid="local-video"
      />
      
      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
        <div className="text-white font-mono text-lg">{formatDuration(callDuration)}</div>
        {call.billingMode === "per_minute" && (
          <div className="text-yellow-400 text-sm flex items-center gap-1">
            <Coins className="w-3 h-3" />
            {call.totalCharged} charged
          </div>
        )}
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
        <Button
          variant="outline"
          size="lg"
          className={`rounded-full w-14 h-14 ${isMuted ? 'bg-red-500 border-red-500' : 'bg-white/10 border-white/20'}`}
          onClick={toggleMute}
          data-testid="btn-toggle-mute"
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>
        
        <Button
          variant="destructive"
          size="lg"
          className="rounded-full w-14 h-14"
          onClick={handleEndCall}
          data-testid="btn-end-call"
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
        
        <Button
          variant="outline"
          size="lg"
          className={`rounded-full w-14 h-14 ${isVideoOff ? 'bg-red-500 border-red-500' : 'bg-white/10 border-white/20'}`}
          onClick={toggleVideo}
          data-testid="btn-toggle-video"
        >
          {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </Button>
      </div>
    </div>
    </GuestGate>
  );
}
