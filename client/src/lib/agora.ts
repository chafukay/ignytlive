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

export function isAgoraConfigured(): boolean {
  return !!APP_ID;
}

export function getAgoraClient(): IAgoraRTCClient {
  if (!client) {
    client = AgoraRTC.createClient({ 
      mode: "live", 
      codec: "vp8" 
    });
  }
  return client;
}

export async function joinAsHost(
  channelName: string, 
  videoContainer: HTMLElement | string | null
): Promise<{ audioTrack: IMicrophoneAudioTrack; videoTrack: ICameraVideoTrack }> {
  if (!APP_ID) {
    throw new Error("Agora App ID not configured");
  }

  const agoraClient = getAgoraClient();
  
  await agoraClient.setClientRole("host");
  await agoraClient.join(APP_ID, channelName, null, null);

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
  
  console.log("Joined as host and published stream");
  
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

  const agoraClient = getAgoraClient();
  
  await agoraClient.setClientRole("audience");
  await agoraClient.join(APP_ID, channelName, null, null);

  agoraClient.on("user-published", async (user, mediaType) => {
    if (mediaType === "audio" || mediaType === "video") {
      await agoraClient.subscribe(user, mediaType);
      onUserPublished(user, mediaType);
    }
  });

  agoraClient.on("user-unpublished", (user, mediaType) => {
    if (mediaType === "audio" || mediaType === "video") {
      onUserUnpublished(user, mediaType);
    }
  });

  console.log("Joined as audience");
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
    await client.leave();
  }
  
  console.log("Left channel");
}

export function getLocalTracks() {
  return { audioTrack: localAudioTrack, videoTrack: localVideoTrack };
}
