type Bucket = { count: number; firstAt: number };

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const buckets = new Map<string, Bucket>();

setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) {
    const ttl = k.includes(":h:") || k.endsWith(":h") ? HOUR_MS : DAY_MS;
    if (now - b.firstAt > ttl) buckets.delete(k);
  }
}, 5 * 60 * 1000).unref?.();

function checkBucket(key: string, max: number, windowMs: number): { allowed: boolean; retryAfterMs?: number; remaining: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (b && now - b.firstAt > windowMs) {
    buckets.delete(key);
  }
  const cur = buckets.get(key);
  if (!cur) return { allowed: true, remaining: max };
  if (cur.count >= max) {
    return { allowed: false, retryAfterMs: windowMs - (now - cur.firstAt), remaining: 0 };
  }
  return { allowed: true, remaining: max - cur.count };
}

function recordBucket(key: string, windowMs: number): void {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.firstAt > windowMs) {
    buckets.set(key, { count: 1, firstAt: now });
  } else {
    b.count++;
  }
}

import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export function normalizePhone(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  // Try libphonenumber first for accurate normalization
  const parsed = parsePhoneNumberFromString(trimmed.startsWith("+") ? trimmed : "+" + trimmed.replace(/[^\d]/g, ""));
  if (parsed && parsed.isValid()) return parsed.number;
  // Fall back to digits-only with + (preserves prior behavior for partial numbers)
  const s = trimmed.replace(/[^\d]/g, "");
  if (s.length < 8 || s.length > 15) return null;
  return "+" + s;
}

export function getCountryCode(normalizedPhone: string): string | null {
  const info = inspectPhoneCountry(normalizedPhone);
  return info.callingCode || null;
}

const PREMIUM_RATE_PREFIXES = [
  "1900", "1976",
  "44906", "44908", "44909", "4470", "4484",
  "353151", "353153", "353155",
  "39144", "39166", "39199",
  "4990", "49118",
  "61190", "61195", "61199",
];

export function isPremiumRateNumber(normalizedPhone: string): boolean {
  if (!normalizedPhone.startsWith("+")) return false;
  const digits = normalizedPhone.slice(1);
  return PREMIUM_RATE_PREFIXES.some((p) => digits.startsWith(p));
}

// Countries Twilio disables by default (sanctioned / high-fraud regions).
// Even if SMS_COUNTRY_ALLOWLIST isn't set, these are blocked so users get a
// clear message instead of a Twilio 21408 race.
const DEFAULT_BLOCKED_COUNTRIES = new Set<string>([
  "CU", // Cuba
  "IR", // Iran
  "KP", // North Korea
  "SY", // Syria
  "SD", // Sudan
]);

// Allowlist parsing supports both ISO 3166 alpha-2 codes (US, IN) and
// dialing codes (1, 91) for backwards compatibility.
const allowlistIso = new Set<string>();
const allowlistDialing = new Set<string>();
{
  const raw = (process.env.SMS_COUNTRY_ALLOWLIST || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  for (const item of raw) {
    if (/^\d+$/.test(item)) allowlistDialing.add(item);
    else allowlistIso.add(item.toUpperCase());
  }
}
const HAS_ALLOWLIST = allowlistIso.size > 0 || allowlistDialing.size > 0;

let regionNames: Intl.DisplayNames | null = null;
try {
  regionNames = new Intl.DisplayNames(["en"], { type: "region" });
} catch {
  regionNames = null;
}

export interface CountryInspection {
  valid: boolean;
  country?: string;        // ISO alpha-2, e.g. "US"
  countryName?: string;    // Display name, e.g. "United States"
  callingCode?: string;    // Dialing code, e.g. "1"
  e164?: string;           // Normalized E.164 form
  supported: boolean;
  reason?: string;         // Human-readable reason when not supported
  errorCode?: string;      // Machine-readable: INVALID_NUMBER | PREMIUM_RATE | COUNTRY_NOT_SUPPORTED
}

export function inspectPhoneCountry(rawPhone: string): CountryInspection {
  if (!rawPhone || typeof rawPhone !== "string") {
    return { valid: false, supported: false, reason: "Phone number is required.", errorCode: "INVALID_NUMBER" };
  }
  const trimmed = rawPhone.trim();
  const candidate = trimmed.startsWith("+") ? trimmed : "+" + trimmed.replace(/[^\d]/g, "");
  const parsed = parsePhoneNumberFromString(candidate);
  if (!parsed || !parsed.isValid()) {
    return { valid: false, supported: false, reason: "Please enter a valid phone number with country code.", errorCode: "INVALID_NUMBER" };
  }
  const country = parsed.country;
  const callingCode = parsed.countryCallingCode;
  const countryName = country && regionNames ? (regionNames.of(country) || country) : country;
  const e164 = parsed.number;

  if (isPremiumRateNumber(e164)) {
    return { valid: true, country, countryName, callingCode, e164, supported: false, reason: "This phone number type (premium rate) is not supported.", errorCode: "PREMIUM_RATE" };
  }

  if (country && DEFAULT_BLOCKED_COUNTRIES.has(country)) {
    return {
      valid: true, country, countryName, callingCode, e164,
      supported: false,
      reason: `We can't currently send SMS to ${countryName ?? "this country"}. Try signing up with email instead.`,
      errorCode: "COUNTRY_NOT_SUPPORTED",
    };
  }

  if (HAS_ALLOWLIST) {
    const isoOk = !!country && allowlistIso.has(country);
    const dialOk = !!callingCode && allowlistDialing.has(callingCode);
    if (!isoOk && !dialOk) {
      return {
        valid: true, country, countryName, callingCode, e164,
        supported: false,
        reason: `We can't currently send SMS to ${countryName ?? "this country"}. Try signing up with email instead.`,
        errorCode: "COUNTRY_NOT_SUPPORTED",
      };
    }
  }

  return { valid: true, country, countryName, callingCode, e164, supported: true };
}

export function isCountryAllowed(normalizedPhone: string): boolean {
  return inspectPhoneCountry(normalizedPhone).supported;
}

export function getSmsCountrySettings() {
  return {
    allowlistIso: Array.from(allowlistIso).sort(),
    allowlistDialing: Array.from(allowlistDialing).sort(),
    blocklist: Array.from(DEFAULT_BLOCKED_COUNTRIES).sort(),
    source: HAS_ALLOWLIST ? "env" as const : "default" as const,
    hasAllowlist: HAS_ALLOWLIST,
  };
}

const SMS_LIMITS = {
  perPhoneHour: { max: 3, windowMs: HOUR_MS },
  perPhoneDay: { max: 5, windowMs: DAY_MS },
  perIpHour: { max: 5, windowMs: HOUR_MS },
  perIpDay: { max: 15, windowMs: DAY_MS },
  globalHour: { max: parseInt(process.env.SMS_GLOBAL_HOURLY_CAP || "100"), windowMs: HOUR_MS },
  globalDay: { max: parseInt(process.env.SMS_GLOBAL_DAILY_CAP || "500"), windowMs: DAY_MS },
};

export interface SmsCheckResult {
  allowed: boolean;
  reason?: string;
  retryAfterMs?: number;
  status?: number;
  errorCode?: string;
  country?: string;
  countryName?: string;
  suggestedAction?: "use_email" | "different_number" | "wait";
}

export function checkSmsAbuse(phone: string, ip: string): SmsCheckResult {
  const inspection = inspectPhoneCountry(phone);
  if (!inspection.supported) {
    return {
      allowed: false,
      reason: inspection.reason || "SMS to this country is not currently supported.",
      status: 400,
      errorCode: inspection.errorCode || "COUNTRY_NOT_SUPPORTED",
      country: inspection.country,
      countryName: inspection.countryName,
      suggestedAction: inspection.errorCode === "COUNTRY_NOT_SUPPORTED" ? "use_email" : "different_number",
    };
  }

  const checks = [
    { key: `sms:phone:h:${phone}`, ...SMS_LIMITS.perPhoneHour, msg: "Too many codes for this phone number. Try again later." },
    { key: `sms:phone:d:${phone}`, ...SMS_LIMITS.perPhoneDay, msg: "Daily SMS limit reached for this phone number." },
    { key: `sms:ip:h:${ip}`, ...SMS_LIMITS.perIpHour, msg: "Too many SMS requests from your network. Try again later." },
    { key: `sms:ip:d:${ip}`, ...SMS_LIMITS.perIpDay, msg: "Daily SMS request limit reached." },
    { key: `sms:global:h`, ...SMS_LIMITS.globalHour, msg: "SMS service is temporarily busy. Please try again shortly." },
    { key: `sms:global:d`, ...SMS_LIMITS.globalDay, msg: "SMS service is at capacity for today. Please try again tomorrow." },
  ];

  for (const c of checks) {
    const r = checkBucket(c.key, c.max, c.windowMs);
    if (!r.allowed) {
      return { allowed: false, reason: c.msg, retryAfterMs: r.retryAfterMs, status: 429 };
    }
  }
  return { allowed: true };
}

export function recordSmsSent(phone: string, ip: string): void {
  recordBucket(`sms:phone:h:${phone}`, SMS_LIMITS.perPhoneHour.windowMs);
  recordBucket(`sms:phone:d:${phone}`, SMS_LIMITS.perPhoneDay.windowMs);
  recordBucket(`sms:ip:h:${ip}`, SMS_LIMITS.perIpHour.windowMs);
  recordBucket(`sms:ip:d:${ip}`, SMS_LIMITS.perIpDay.windowMs);
  recordBucket(`sms:global:h`, SMS_LIMITS.globalHour.windowMs);
  recordBucket(`sms:global:d`, SMS_LIMITS.globalDay.windowMs);
}

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org",
  "tempmail.com", "temp-mail.org", "10minutemail.com", "10minutemail.net",
  "throwawaymail.com", "trashmail.com", "yopmail.com", "fakeinbox.com",
  "getnada.com", "maildrop.cc", "sharklasers.com", "guerrillamailblock.com",
  "dispostable.com", "mintemail.com", "mohmal.com", "spambox.us",
  "spam4.me", "tempinbox.com", "tempmailaddress.com", "tempr.email",
  "discard.email", "burnermail.io", "mailnesia.com", "mailcatch.com",
  "nada.email", "anonbox.net", "trbvm.com", "instaddr.win",
  "moakt.com", "emailondeck.com", "harakirimail.com", "tempemail.com",
  "tempmailo.com", "minutemail.com", "throwam.com", "mytemp.email",
]);

export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const domain = email.slice(at + 1).toLowerCase().trim();
  return DISPOSABLE_DOMAINS.has(domain);
}

const EMAIL_LIMITS = {
  perEmailHour: { max: 3, windowMs: HOUR_MS },
  perEmailDay: { max: 10, windowMs: DAY_MS },
  perIpHour: { max: 10, windowMs: HOUR_MS },
  perIpDay: { max: 30, windowMs: DAY_MS },
  perUserHour: { max: 5, windowMs: HOUR_MS },
  perUserDay: { max: 15, windowMs: DAY_MS },
};

export interface EmailCheckResult {
  allowed: boolean;
  reason?: string;
  retryAfterMs?: number;
  status?: number;
}

export function checkEmailAbuse(email: string | null, userId: string, ip: string): EmailCheckResult {
  if (email && isDisposableEmail(email)) {
    return { allowed: false, reason: "Disposable email addresses are not supported. Please use a permanent email.", status: 400 };
  }

  const normalizedEmail = email?.toLowerCase().trim() || null;
  const checks: Array<{ key: string; max: number; windowMs: number; msg: string }> = [
    { key: `email:user:h:${userId}`, ...EMAIL_LIMITS.perUserHour, msg: "Too many email requests. Try again later." },
    { key: `email:user:d:${userId}`, ...EMAIL_LIMITS.perUserDay, msg: "Daily email request limit reached." },
    { key: `email:ip:h:${ip}`, ...EMAIL_LIMITS.perIpHour, msg: "Too many email requests from your network. Try again later." },
    { key: `email:ip:d:${ip}`, ...EMAIL_LIMITS.perIpDay, msg: "Daily email request limit reached." },
  ];
  if (normalizedEmail) {
    checks.push(
      { key: `email:addr:h:${normalizedEmail}`, ...EMAIL_LIMITS.perEmailHour, msg: "Too many requests for this email address. Try again later." },
      { key: `email:addr:d:${normalizedEmail}`, ...EMAIL_LIMITS.perEmailDay, msg: "Daily limit reached for this email address." }
    );
  }

  for (const c of checks) {
    const r = checkBucket(c.key, c.max, c.windowMs);
    if (!r.allowed) {
      return { allowed: false, reason: c.msg, retryAfterMs: r.retryAfterMs, status: 429 };
    }
  }
  return { allowed: true };
}

export function recordEmailSent(email: string | null, userId: string, ip: string): void {
  recordBucket(`email:user:h:${userId}`, EMAIL_LIMITS.perUserHour.windowMs);
  recordBucket(`email:user:d:${userId}`, EMAIL_LIMITS.perUserDay.windowMs);
  recordBucket(`email:ip:h:${ip}`, EMAIL_LIMITS.perIpHour.windowMs);
  recordBucket(`email:ip:d:${ip}`, EMAIL_LIMITS.perIpDay.windowMs);
  if (email) {
    const normalized = email.toLowerCase().trim();
    recordBucket(`email:addr:h:${normalized}`, EMAIL_LIMITS.perEmailHour.windowMs);
    recordBucket(`email:addr:d:${normalized}`, EMAIL_LIMITS.perEmailDay.windowMs);
  }
}
