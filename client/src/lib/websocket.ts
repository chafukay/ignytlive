import { getAuthToken } from "./auth-context";

export async function createStreamWebSocket(streamId: string, options: { isPreview?: boolean; userId?: string } = {}) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  const params = new URLSearchParams({ streamId });
  if (options.isPreview) params.set("preview", "true");

  if (options.userId) {
    const authToken = getAuthToken();
    if (authToken) {
      try {
        const res = await fetch("/api/auth/ws-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`,
          },
        });
        if (res.ok) {
          const { token } = await res.json();
          params.set("wsToken", token);
        }
      } catch {
      }
    }
  }

  const ws = new WebSocket(`${protocol}//${host}/ws?${params.toString()}`);
  return ws;
}

export interface StreamMessage {
  type: "comment" | "gift" | "viewer_count";
  data: any;
}
