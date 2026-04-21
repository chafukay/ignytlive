import { parsePhoneNumberFromString } from "libphonenumber-js";

const DEFAULT_BLOCKED = new Set<string>(["CU", "IR", "KP", "SY", "SD"]);

let regionNames: Intl.DisplayNames | null = null;
try {
  regionNames = new Intl.DisplayNames(["en"], { type: "region" });
} catch {
  regionNames = null;
}

export interface ClientCountryInfo {
  valid: boolean;
  supported: boolean;
  country?: string;       // ISO alpha-2
  countryName?: string;
  callingCode?: string;
  reason?: string;
  errorCode?: "INVALID_NUMBER" | "COUNTRY_NOT_SUPPORTED";
}

export function countryToFlag(iso?: string): string {
  if (!iso || iso.length !== 2) return "";
  const A = 0x1f1e6;
  const upper = iso.toUpperCase();
  return String.fromCodePoint(A + upper.charCodeAt(0) - 65, A + upper.charCodeAt(1) - 65);
}

export function inspectPhoneClient(raw: string): ClientCountryInfo | null {
  const trimmed = (raw || "").trim();
  if (!trimmed || trimmed.length < 6) return null;
  const candidate = trimmed.startsWith("+") ? trimmed : "+" + trimmed.replace(/[^\d]/g, "");
  const parsed = parsePhoneNumberFromString(candidate);
  if (!parsed || !parsed.isValid()) {
    return { valid: false, supported: false, errorCode: "INVALID_NUMBER", reason: "Please enter a valid phone number with country code." };
  }
  const country = parsed.country;
  const callingCode = parsed.countryCallingCode;
  const countryName = country && regionNames ? (regionNames.of(country) || country) : country;
  if (country && DEFAULT_BLOCKED.has(country)) {
    return {
      valid: true, supported: false, country, countryName, callingCode,
      errorCode: "COUNTRY_NOT_SUPPORTED",
      reason: `We can't currently send SMS to ${countryName}. Try email instead.`,
    };
  }
  return { valid: true, supported: true, country, countryName, callingCode };
}

// Heuristic: identifier is a phone (vs email/username) if it starts with + or
// is mostly digits and at least 10 long. Avoids false positives for numeric usernames.
export function looksLikePhoneIdentifier(s: string): boolean {
  const t = (s || "").trim();
  if (!t) return false;
  if (t.startsWith("+")) return true;
  const digits = t.replace(/[^\d]/g, "");
  // Require ≥10 digits AND no letters / @ to qualify as a phone number
  if (/[a-zA-Z@]/.test(t)) return false;
  return digits.length >= 10 && /^[\d\s().-]+$/.test(t);
}
