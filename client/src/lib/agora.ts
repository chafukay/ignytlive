import AgoraRTC, { 
  IAgoraRTCClient, 
  ICameraVideoTrack, 
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser
} from "agora-rtc-sdk-ng";

// App ID loaded from server (not environment variable)
let APP_ID: string = "";
let configLoaded = false;
let configPromise: Promise<void> | null = null;

// Load Agora config from server
async function loadAgoraConfig(): Promise<void> {
  if (configLoaded) return;
  
  try {
    const { getServerUrl } = await import("./capacitor");
    const response = await fetch(`${getServerUrl()}/api/agora/config`);
    const data = await response.json();
    if (data.configured && data.appId) {
      APP_ID = data.appId;
      console.log("[Agora] App ID loaded from server:", APP_ID.substring(0, 8) + "...");
    } else {
      console.log("[Agora] Not configured on server");
    }
  } catch (error) {
    console.error("[Agora] Failed to load config:", error);
  }
  configLoaded = true;
}

// Initialize config on module load
configPromise = loadAgoraConfig();

let client: IAgoraRTCClient | null = null;
let localAudioTrack: IMicrophoneAudioTrack | null = null;
let localVideoTrack: ICameraVideoTrack | null = null;
let isConnected = false;
let currentChannelName = "";

export function isAgoraConfigured(): boolean {
  return !!APP_ID;
}

// Async version that waits for config to load
export async function ensureAgoraConfigured(): Promise<boolean> {
  await configPromise;
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
  const { getServerUrl } = await import("./capacitor");
  const response = await fetch(`${getServerUrl()}/api/agora/token`, {
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
  videoContainer: HTMLElement | string | null,
  facingMode: "user" | "environment" = "user"
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
  currentChannelName = channelName;

  [localAudioTrack, localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
    {},
    {
      encoderConfig: "720p_2",
      facingMode,
      optimizationMode: "detail"
    }
  );

  try {
    const videoTrack = localVideoTrack.getMediaStreamTrack();
    if (videoTrack && typeof videoTrack.getCapabilities === "function") {
      const caps: any = videoTrack.getCapabilities();
      const advanced: any[] = [];
      if (caps.exposureMode?.includes?.("continuous")) advanced.push({ exposureMode: "continuous" });
      if (caps.whiteBalanceMode?.includes?.("continuous")) advanced.push({ whiteBalanceMode: "continuous" });
      if (caps.brightness && typeof caps.brightness.max === "number") {
        const mid = ((caps.brightness.max ?? 0) + (caps.brightness.min ?? 0)) / 2;
        advanced.push({ brightness: Math.min(caps.brightness.max, mid + ((caps.brightness.max - mid) * 0.4)) });
      }
      if (advanced.length > 0) {
        await videoTrack.applyConstraints({ advanced });
      }
    }
  } catch (capErr) {
    console.debug("[Agora] Camera capability tuning skipped:", capErr);
  }

  if (videoContainer) {
    localVideoTrack.play(videoContainer);
  }

  await agoraClient.publish([localAudioTrack, localVideoTrack]);
  
  console.log("Joined as host and published stream to channel:", channelName, "facingMode:", facingMode);
  
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
  currentChannelName = channelName;

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

export async function promoteToHost(
  videoContainer?: HTMLElement | string | null
): Promise<{ audioTrack: IMicrophoneAudioTrack; videoTrack: ICameraVideoTrack }> {
  if (!client || !isConnected) {
    throw new Error("Not connected to a channel");
  }

  const channelName = currentChannelName;
  if (!channelName) {
    throw new Error("No channel name - not in a channel");
  }

  await client.leave();

  const token = await getToken(channelName, "host");
  await client.setClientRole("host");
  await client.join(APP_ID, channelName, token, null);

  [localAudioTrack, localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
    {},
    {
      encoderConfig: "480p_1",
      facingMode: "user"
    }
  );

  if (videoContainer) {
    localVideoTrack.play(videoContainer);
  }

  await client.publish([localAudioTrack, localVideoTrack]);

  console.log("[Agora] Promoted to host and published tracks");

  return { audioTrack: localAudioTrack, videoTrack: localVideoTrack };
}

export async function demoteToAudience(): Promise<void> {
  if (!client || !isConnected) return;

  const channelName = currentChannelName;

  if (localAudioTrack) {
    await client.unpublish(localAudioTrack);
    localAudioTrack.close();
    localAudioTrack = null;
  }

  if (localVideoTrack) {
    await client.unpublish(localVideoTrack);
    localVideoTrack.close();
    localVideoTrack = null;
  }

  await client.leave();

  const token = await getToken(channelName, "audience");
  await client.setClientRole("audience");
  await client.join(APP_ID, channelName, token, null);

  console.log("[Agora] Demoted back to audience");
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
  currentChannelName = "";
  console.log("Left channel");
}

export function getLocalTracks() {
  return { audioTrack: localAudioTrack, videoTrack: localVideoTrack };
}
