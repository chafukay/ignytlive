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

export function normalizePhone(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim().replace(/[^\d]/g, "");
  if (s.length < 8 || s.length > 15) return null;
  return "+" + s;
}

export function getCountryCode(normalizedPhone: string): string | null {
  if (!normalizedPhone.startsWith("+")) return null;
  const digits = normalizedPhone.slice(1);
  if (digits.startsWith("1")) return "1";
  if (digits.length >= 2) {
    const two = digits.slice(0, 2);
    if (["44", "33", "49", "39", "34", "31", "32", "41", "43", "45", "46", "47", "48", "51", "52", "53", "54", "55", "56", "57", "58", "60", "61", "62", "63", "64", "65", "66", "81", "82", "84", "86", "90", "91", "92", "93", "94", "95", "98"].includes(two)) return two;
  }
  if (digits.length >= 3) return digits.slice(0, 3);
  return null;
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

const SMS_COUNTRY_ALLOWLIST = (process.env.SMS_COUNTRY_ALLOWLIST || "")
  .split(",")
  .map((c) => c.trim())
  .filter(Boolean);

export function isCountryAllowed(normalizedPhone: string): boolean {
  if (SMS_COUNTRY_ALLOWLIST.length === 0) return true;
  const cc = getCountryCode(normalizedPhone);
  if (!cc) return false;
  return SMS_COUNTRY_ALLOWLIST.includes(cc);
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
}

export function checkSmsAbuse(phone: string, ip: string): SmsCheckResult {
  if (isPremiumRateNumber(phone)) {
    return { allowed: false, reason: "This phone number type is not supported.", status: 400 };
  }
  if (!isCountryAllowed(phone)) {
    return { allowed: false, reason: "SMS to this country is not currently supported.", status: 400 };
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
