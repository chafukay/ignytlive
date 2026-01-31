export function createStreamWebSocket(streamId: string, isPreview: boolean = false) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  const previewParam = isPreview ? "&preview=true" : "";
  const ws = new WebSocket(`${protocol}//${host}/ws?streamId=${streamId}${previewParam}`);
  
  return ws;
}

export interface StreamMessage {
  type: "comment" | "gift" | "viewer_count";
  data: any;
}
