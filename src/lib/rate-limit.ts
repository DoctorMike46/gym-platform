import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type LimiterResult = { success: boolean; reset: number; remaining: number };

interface Limiter {
    limit: (key: string) => Promise<LimiterResult>;
}

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const noopLimiter: Limiter = {
    async limit() {
        return { success: true, reset: 0, remaining: 999 };
    },
};

function build(prefix: string, limit: number, windowSec: number): Limiter {
    if (!url || !token) {
        if (process.env.NODE_ENV === "production") {
            console.warn(`[rate-limit] Upstash env not set — '${prefix}' running without limits.`);
        }
        return noopLimiter;
    }

    const redis = new Redis({ url, token });
    const rl = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
        prefix: `gym:${prefix}`,
        analytics: false,
    });

    return {
        async limit(key: string) {
            const r = await rl.limit(key);
            return { success: r.success, reset: r.reset, remaining: r.remaining };
        },
    };
}

export const loginLimiter = build("login", 5, 60);
export const passwordResetLimiter = build("pwreset", 3, 3600);
export const uploadLimiter = build("upload", 20, 60);

export function retryAfterSeconds(reset: number): number {
    if (!reset) return 60;
    return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}
