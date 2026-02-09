import { LRUCache } from 'lru-cache';

type RateLimitConfig = {
    uniqueTokenPerInterval: number; // Max number of unique users per interval
    interval: number; // Interval in milliseconds
    limit: number; // Max requests per interval
};

export function rateLimit(options: RateLimitConfig) {
    const tokenCache = new LRUCache<string, number[]>({
        max: options.uniqueTokenPerInterval || 500,
        ttl: options.interval || 60000,
    });

    return {
        check: (res: Response | null, limit: number, token: string) =>
            new Promise<void>((resolve, reject) => {
                const tokenCount = tokenCache.get(token) || [0];
                if (tokenCount[0] === 0) {
                    tokenCache.set(token, [1]);
                } else {
                    tokenCount[0] += 1;
                    tokenCache.set(token, tokenCount);
                }
                const currentUsage = tokenCount[0];
                const isRateLimited = currentUsage > limit;
                // console.log(`Rate limit check for ${token}: ${currentUsage}/${limit}`);

                if (isRateLimited) {
                    reject();
                } else {
                    resolve();
                }
            }),
    };
}
