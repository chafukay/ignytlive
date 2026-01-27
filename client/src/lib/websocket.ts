export function createStreamWebSocket(streamId: string) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  const ws = new WebSocket(`${protocol}//${host}/ws?streamId=${streamId}`);
  
  return ws;
}

export interface StreamMessage {
  type: "comment" | "gift" | "viewer_count";
  data: any;
}
