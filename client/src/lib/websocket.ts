export function createStreamWebSocket(streamId: string, options: { isPreview?: boolean; userId?: string } = {}) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  const params = new URLSearchParams({ streamId });
  if (options.isPreview) params.set("preview", "true");
  if (options.userId) params.set("userId", options.userId);
  const ws = new WebSocket(`${protocol}//${host}/ws?${params.toString()}`);
  
  return ws;
}

export interface StreamMessage {
  type: "comment" | "gift" | "viewer_count";
  data: any;
}
