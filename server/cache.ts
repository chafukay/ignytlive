interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  stats(): { size: number; hitRate: number };
}

class InMemoryCacheService implements ICacheService {
  private store = new Map<string, CacheEntry<any>>();
  private cleanupInterval: ReturnType<typeof setInterval>;
  private hits = 0;
  private misses = 0;

  constructor(cleanupIntervalSeconds = 60) {
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalSeconds * 1000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const prefix = pattern.replace(/\*$/, '');
    const keys = Array.from(this.store.keys());
    for (const key of keys) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  async has(key: string): Promise<boolean> {
    const val = await this.get(key);
    return val !== null;
  }

  async clear(): Promise<void> {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  stats() {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hitRate: total === 0 ? 0 : Math.round((this.hits / total) * 100),
    };
  }

  private cleanup() {
    const now = Date.now();
    const entries = Array.from(this.store.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

export const TTL = {
  MODERATION: 30,
  USER_PROFILE: 60,
  STREAM: 30,
  LEADERBOARD: 120,
} as const;

export const CACHE_KEYS = {
  userBan: (streamId: string, userId: string) => `mod:ban:${streamId}:${userId}`,
  userMute: (streamId: string, userId: string) => `mod:mute:${streamId}:${userId}`,
  roomModerator: (streamId: string, userId: string) => `mod:mod:${streamId}:${userId}`,
  userProfile: (userId: string) => `user:${userId}`,
  userByUsername: (username: string) => `user:name:${username}`,
  stream: (streamId: string) => `stream:${streamId}`,
  leaderboard: (type: string) => `lb:${type}`,
  streamModerationPrefix: (streamId: string) => `mod:*${streamId}*`,
};

export const cache: ICacheService = new InMemoryCacheService();

export type { ICacheService };
