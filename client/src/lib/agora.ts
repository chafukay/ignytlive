import AgoraRTC, { 
  IAgoraRTCClient, 
  ICameraVideoTrack, 
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser
} from "agora-rtc-sdk-ng";

const APP_ID = import.meta.env.VITE_AGORA_APP_ID || "";

let client: IAgoraRTCClient | null = null;
let localAudioTrack: IMicrophoneAudioTrack | null = null;
let localVideoTrack: ICameraVideoTrack | null = null;
let isConnected = false;

export function isAgoraConfigured(): boolean {
  return !!APP_ID;
}

export function getAgoraClient(): IAgoraRTCClient {
  // Always create a fresh client to avoid state issues
  if (!client) {
    client = AgoraRTC.createClient({ 
      mode: "live", 
      codec: "vp8" 
    });
  }
  return client;
}

function createFreshClient(): IAgoraRTCClient {
  // Remove old client and create fresh one
  if (client) {
    client.removeAllListeners();
  }
  client = AgoraRTC.createClient({ 
    mode: "live", 
    codec: "vp8" 
  });
  return client;
}

async function getToken(channelName: string, role: "host" | "audience"): Promise<string> {
  const response = await fetch("/api/agora/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channelName, uid: 0, role }),
  });
  
  if (!response.ok) {
    throw new Error("Failed to get Agora token");
  }
  
  const data = await response.json();
  return data.token;
}

export async function joinAsHost(
  channelName: string, 
  videoContainer: HTMLElement | string | null
): Promise<{ audioTrack: IMicrophoneAudioTrack; videoTrack: ICameraVideoTrack }> {
  if (!APP_ID) {
    throw new Error("Agora App ID not configured");
  }

  // Leave any existing channel first
  if (isConnected) {
    await leaveChannel();
  }

  // Create fresh client to avoid state issues
  const agoraClient = createFreshClient();
  
  const token = await getToken(channelName, "host");
  
  await agoraClient.setClientRole("host");
  await agoraClient.join(APP_ID, channelName, token, null);
  isConnected = true;

  [localAudioTrack, localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
    {},
    {
      encoderConfig: "720p_2",
      facingMode: "user"
    }
  );

  if (videoContainer) {
    localVideoTrack.play(videoContainer);
  }

  await agoraClient.publish([localAudioTrack, localVideoTrack]);
  
  console.log("Joined as host and published stream to channel:", channelName);
  
  return { audioTrack: localAudioTrack, videoTrack: localVideoTrack };
}

export async function joinAsAudience(
  channelName: string,
  onUserPublished: (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => void,
  onUserUnpublished: (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => void
): Promise<void> {
  if (!APP_ID) {
    throw new Error("Agora App ID not configured");
  }

  // Leave any existing channel first
  if (isConnected) {
    await leaveChannel();
  }

  // Create fresh client to avoid state issues
  const agoraClient = createFreshClient();
  
  const token = await getToken(channelName, "audience");
  
  await agoraClient.setClientRole("audience");
  await agoraClient.join(APP_ID, channelName, token, null);
  isConnected = true;

  // Set up event listeners for remote users
  agoraClient.on("user-published", async (user, mediaType) => {
    console.log("Remote user published:", user.uid, mediaType);
    if (mediaType === "audio" || mediaType === "video") {
      await agoraClient.subscribe(user, mediaType);
      onUserPublished(user, mediaType);
    }
  });

  agoraClient.on("user-unpublished", (user, mediaType) => {
    console.log("Remote user unpublished:", user.uid, mediaType);
    if (mediaType === "audio" || mediaType === "video") {
      onUserUnpublished(user, mediaType);
    }
  });

  // Also check for any existing remote users already in the channel
  agoraClient.remoteUsers.forEach(async (user) => {
    if (user.hasVideo) {
      await agoraClient.subscribe(user, "video");
      onUserPublished(user, "video");
    }
    if (user.hasAudio) {
      await agoraClient.subscribe(user, "audio");
      onUserPublished(user, "audio");
    }
  });

  console.log("Joined as audience to channel:", channelName);
}

export async function switchCamera(): Promise<void> {
  if (localVideoTrack) {
    const devices = await AgoraRTC.getCameras();
    if (devices.length > 1) {
      const currentDevice = localVideoTrack.getTrackLabel();
      const currentIndex = devices.findIndex(d => d.label === currentDevice);
      const nextIndex = (currentIndex + 1) % devices.length;
      await localVideoTrack.setDevice(devices[nextIndex].deviceId);
    }
  }
}

export async function toggleMute(mute: boolean): Promise<void> {
  if (localAudioTrack) {
    await localAudioTrack.setEnabled(!mute);
  }
}

export async function toggleVideo(enabled: boolean): Promise<void> {
  if (localVideoTrack) {
    await localVideoTrack.setEnabled(enabled);
  }
}

export async function leaveChannel(): Promise<void> {
  if (localAudioTrack) {
    localAudioTrack.close();
    localAudioTrack = null;
  }
  
  if (localVideoTrack) {
    localVideoTrack.close();
    localVideoTrack = null;
  }
  
  if (client) {
    client.removeAllListeners();
    try {
      await client.leave();
    } catch (e) {
      // Ignore errors when leaving - might already be disconnected
    }
  }
  
  isConnected = false;
  console.log("Left channel");
}

export function getLocalTracks() {
  return { audioTrack: localAudioTrack, videoTrack: localVideoTrack };
}
