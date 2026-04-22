import { Capacitor } from '@capacitor/core';
import { PrivacyScreen } from '@capacitor-community/privacy-screen';

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

/**
 * Enable native screenshot blocking (Android FLAG_SECURE) and screen-recording protection (iOS).
 * Safe no-op on web. Idempotent.
 */
export async function enablePrivacyScreen(): Promise<void> {
  if (!isNative()) return;
  try {
    await PrivacyScreen.enable();
  } catch (err) {
    console.debug('[PrivacyScreen] enable failed:', err);
  }
}

/**
 * Disable native screenshot blocking. Call when leaving a privacy-sensitive page.
 */
export async function disablePrivacyScreen(): Promise<void> {
  if (!isNative()) return;
  try {
    await PrivacyScreen.disable();
  } catch (err) {
    console.debug('[PrivacyScreen] disable failed:', err);
  }
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
