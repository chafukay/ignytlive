import { isNative } from "./capacitor";

const BIOMETRIC_ENABLED_KEY = "biometricEnabled";
const BIOMETRIC_TOKEN_KEY = "biometricAuthToken";
const BIOMETRIC_USER_KEY = "biometricUser";

export async function isBiometricAvailable(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    const result = await BiometricAuth.checkBiometry();
    return result.isAvailable;
  } catch {
    return false;
  }
}

export async function getBiometryType(): Promise<string> {
  if (!isNative()) return "none";
  try {
    const { BiometricAuth, BiometryType } = await import("@aparajita/capacitor-biometric-auth");
    const result = await BiometricAuth.checkBiometry();
    if (!result.isAvailable) return "none";
    switch (result.biometryType) {
      case BiometryType.faceAuthentication:
      case BiometryType.faceId:
        return "face";
      case BiometryType.fingerprintAuthentication:
      case BiometryType.touchId:
        return "fingerprint";
      default:
        return "biometric";
    }
  } catch {
    return "none";
  }
}

export function isBiometricEnabled(): boolean {
  return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === "true";
}

export function saveBiometricCredentials(token: string, user: any): void {
  localStorage.setItem(BIOMETRIC_TOKEN_KEY, token);
  localStorage.setItem(BIOMETRIC_USER_KEY, JSON.stringify(user));
  localStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
}

export function clearBiometricCredentials(): void {
  localStorage.removeItem(BIOMETRIC_TOKEN_KEY);
  localStorage.removeItem(BIOMETRIC_USER_KEY);
  localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
}

export function getSavedCredentials(): { token: string; user: any } | null {
  const token = localStorage.getItem(BIOMETRIC_TOKEN_KEY);
  const userStr = localStorage.getItem(BIOMETRIC_USER_KEY);
  if (!token || !userStr) return null;
  try {
    return { token, user: JSON.parse(userStr) };
  } catch {
    return null;
  }
}

export async function authenticateWithBiometric(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    await BiometricAuth.authenticate({
      reason: "Log in to IgnytLIVE",
      androidTitle: "IgnytLIVE Login",
      androidSubtitle: "Use your fingerprint or PIN to sign in",
      allowDeviceCredential: true,
    });
    return true;
  } catch {
    return false;
  }
}
