import { storage } from "./storage";

const DEFAULT_PROFANITY_LIST = [
  "fuck", "shit", "ass", "bitch", "dick", "pussy", "cock", "cunt",
  "damn", "bastard", "whore", "slut", "piss", "fag", "faggot",
  "nigger", "nigga", "retard", "retarded", "kike", "chink", "spic",
  "wetback", "beaner", "gook", "tranny", "dyke",
  "motherfucker", "fucker", "asshole", "bullshit", "horseshit",
  "dumbass", "jackass", "dipshit", "shithead", "dickhead",
  "twat", "wanker", "prick", "skank", "hoe"
];

const URL_REGEX = /(?:https?:\/\/|www\.)[^\s]+|[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi;

let customWords: Set<string> = new Set();
let lastRefresh = 0;
const REFRESH_INTERVAL = 60 * 1000;

async function refreshCustomWords(): Promise<void> {
  const now = Date.now();
  if (now - lastRefresh < REFRESH_INTERVAL) return;
  try {
    const words = await storage.getActiveFilterWords();
    customWords = new Set(words.map(w => w.word.toLowerCase()));
    lastRefresh = now;
  } catch (e) {
    console.error("[ContentFilter] Failed to refresh custom words:", e);
  }
}

function getAllFilterWords(): string[] {
  const combined = new Set([
    ...DEFAULT_PROFANITY_LIST.map(w => w.toLowerCase()),
    ...customWords,
  ]);
  return Array.from(combined);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildFilterRegex(words: string[]): RegExp {
  if (words.length === 0) return /(?!)/;
  const sorted = [...words].sort((a, b) => b.length - a.length);
  const pattern = sorted.map(w => `\\b${escapeRegex(w)}\\b`).join("|");
  return new RegExp(pattern, "gi");
}

export interface FilterResult {
  filtered: string;
  wasFiltered: boolean;
  matchedWords: string[];
  containsLinks: boolean;
}

export async function filterContent(text: string, blockLinks = false): Promise<FilterResult> {
  await refreshCustomWords();

  const matchedWords: string[] = [];
  let containsLinks = false;

  const linkMatches = text.match(URL_REGEX);
  if (linkMatches && linkMatches.length > 0) {
    containsLinks = true;
  }

  let filtered = text;

  if (blockLinks && containsLinks) {
    filtered = filtered.replace(URL_REGEX, (match) => {
      matchedWords.push(`[link:${match}]`);
      return "*".repeat(match.length);
    });
  }

  const words = getAllFilterWords();
  const regex = buildFilterRegex(words);

  filtered = filtered.replace(regex, (match) => {
    matchedWords.push(match.toLowerCase());
    return "*".repeat(match.length);
  });

  return {
    filtered,
    wasFiltered: matchedWords.length > 0,
    matchedWords: [...new Set(matchedWords)],
    containsLinks,
  };
}

export async function logFlaggedContent(
  userId: string,
  contentType: string,
  originalContent: string,
  filteredContent: string,
  matchedWords: string[],
  context?: string
): Promise<void> {
  try {
    await storage.createFlaggedContent({
      userId,
      contentType,
      originalContent,
      filteredContent,
      matchedWords: JSON.stringify(matchedWords),
      context: context || null,
      reviewed: false,
    });
  } catch (e) {
    console.error("[ContentFilter] Failed to log flagged content:", e);
  }
}

export function forceRefreshFilterWords(): void {
  lastRefresh = 0;
}
