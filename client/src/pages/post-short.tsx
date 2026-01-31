import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { X, Video, Upload, Camera, Square, Check, RefreshCw } from "lucide-react";

const MAX_DURATION_SECONDS = 60; // Configurable max duration

export default function PostShort() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [mode, setMode] = useState<"select" | "record" | "preview">("select");
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isUploading, setIsUploading] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start camera for recording
  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 720 }, height: { ideal: 1280 } },
        audio: true
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive"
      });
      setMode("select");
    }
  };

  useEffect(() => {
    if (mode === "record") {
      startCamera();
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [mode, facingMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, []);

  const startRecording = () => {
    if (!stream) return;
    
    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setVideoBlob(blob);
      setVideoUrl(URL.createObjectURL(blob));
      setMode("preview");
      
      // Stop camera
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    };
    
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);
    
    // Timer
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= MAX_DURATION_SECONDS - 1) {
          stopRecording();
          return MAX_DURATION_SECONDS;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('video/')) {
      toast({
        title: "Invalid File",
        description: "Please select a video file.",
        variant: "destructive"
      });
      return;
    }
    
    // Check duration
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      if (video.duration > MAX_DURATION_SECONDS) {
        toast({
          title: "Video Too Long",
          description: `Maximum duration is ${MAX_DURATION_SECONDS} seconds. Your video is ${Math.round(video.duration)} seconds.`,
          variant: "destructive"
        });
        return;
      }
      
      setVideoBlob(file);
      setVideoUrl(URL.createObjectURL(file));
      setRecordingTime(Math.round(video.duration));
      setMode("preview");
    };
    video.src = URL.createObjectURL(file);
  };

  const flipCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  const resetRecording = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoBlob(null);
    setVideoUrl(null);
    setRecordingTime(0);
    setMode("select");
  };

  const postShortMutation = useMutation({
    mutationFn: async () => {
      if (!videoBlob || !user) throw new Error("No video to upload");
      
      setIsUploading(true);
      
      // Convert blob to base64 for storage (in production, use object storage)
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(videoBlob);
      });
      
      const videoDataUrl = await base64Promise;
      
      return api.createShort({
        userId: user.id,
        videoUrl: videoDataUrl,
        description: description || undefined,
        duration: recordingTime,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shorts'] });
      toast({
        title: "Short Posted!",
        description: "Your short has been uploaded successfully.",
      });
      setLocation("/shorts");
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload short.",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <p>Please log in to post shorts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black relative overflow-hidden">
      {/* Close Button */}
      <button 
        onClick={() => {
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          setLocation("/shorts");
        }}
        className="absolute top-4 left-4 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
        data-testid="button-close"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Mode Selection */}
      {mode === "select" && (
        <div className="h-full flex flex-col items-center justify-center gap-8 px-6">
          <h1 className="text-2xl font-bold text-white mb-4">Create Short</h1>
          <p className="text-white/60 text-center mb-8">
            Record a new video or upload an existing one<br />
            (Max {MAX_DURATION_SECONDS} seconds)
          </p>
          
          <button
            onClick={() => setMode("record")}
            className="w-full max-w-xs flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-2xl hover:opacity-90 transition-opacity"
            data-testid="button-record"
          >
            <Camera className="w-6 h-6" />
            Record Video
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full max-w-xs flex items-center justify-center gap-3 px-6 py-4 bg-white/10 text-white font-bold rounded-2xl hover:bg-white/20 transition-colors"
            data-testid="button-upload"
          >
            <Upload className="w-6 h-6" />
            Upload Video
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileUpload}
            className="hidden"
            data-testid="input-file"
          />
        </div>
      )}

      {/* Recording Mode */}
      {mode === "record" && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
          />
          
          {/* Recording Timer */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
            <div className={`px-4 py-2 rounded-full ${isRecording ? 'bg-red-500' : 'bg-black/50'} text-white font-bold flex items-center gap-2`}>
              {isRecording && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
              <span>{formatTime(recordingTime)} / {formatTime(MAX_DURATION_SECONDS)}</span>
            </div>
          </div>
          
          {/* Flip Camera */}
          <button
            onClick={flipCamera}
            className="absolute top-4 right-4 z-50 p-3 rounded-full bg-black/50 text-white hover:bg-black/70"
            data-testid="button-flip"
          >
            <RefreshCw className="w-6 h-6" />
          </button>
          
          {/* Record Button */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center z-50">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="w-20 h-20 rounded-full bg-red-500 border-4 border-white flex items-center justify-center hover:bg-red-600 transition-colors"
                data-testid="button-start-record"
              >
                <div className="w-8 h-8 rounded-full bg-white" />
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="w-20 h-20 rounded-full bg-red-500 border-4 border-white flex items-center justify-center hover:bg-red-600 transition-colors"
                data-testid="button-stop-record"
              >
                <Square className="w-8 h-8 text-white fill-white" />
              </button>
            )}
          </div>
        </>
      )}

      {/* Preview Mode */}
      {mode === "preview" && videoUrl && (
        <>
          <video
            ref={previewRef}
            src={videoUrl}
            autoPlay
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
          
          {/* Duration Badge */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
            <div className="px-4 py-2 rounded-full bg-black/50 text-white font-bold">
              {formatTime(recordingTime)}
            </div>
          </div>
          
          {/* Description Input */}
          <div className="absolute bottom-32 left-4 right-4 z-50">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              className="w-full bg-black/50 text-white placeholder:text-white/50 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
              rows={3}
              maxLength={200}
              data-testid="input-description"
            />
            <p className="text-white/40 text-xs mt-1 text-right">{description.length}/200</p>
          </div>
          
          {/* Action Buttons */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6 z-50">
            <button
              onClick={resetRecording}
              className="px-6 py-3 rounded-full bg-white/20 text-white font-bold hover:bg-white/30 transition-colors"
              data-testid="button-retake"
            >
              Retake
            </button>
            <button
              onClick={() => postShortMutation.mutate()}
              disabled={isUploading || postShortMutation.isPending}
              className="px-8 py-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              data-testid="button-post"
            >
              {isUploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Post Short
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
