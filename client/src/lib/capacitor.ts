import { Capacitor } from '@capacitor/core';

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function getPlatform(): 'ios' | 'android' | 'web' {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
}

export function isIOS(): boolean {
  return getPlatform() === 'ios';
}

export function isAndroid(): boolean {
  return getPlatform() === 'android';
}

export function getServerUrl(): string {
  if (isNative()) {
    const url = import.meta.env.VITE_SERVER_URL;
    if (url) return url;
    return 'https://ignyt.replit.app';
  }
  return '';
}

export function getWebSocketUrl(params: URLSearchParams): string {
  if (isNative()) {
    const serverUrl = getServerUrl();
    const wsUrl = serverUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
    return `${wsUrl}/ws?${params.toString()}`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/ws?${params.toString()}`;
}
