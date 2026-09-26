/**
 * SWR (Stale-While-Revalidate) In-Memory Cache Manager for QMS
 * - LRU eviction with max size limit
 * - Time-To-Live (TTL) support
 * - Prefix-based batch invalidation
 * - Revalidation event listeners for seamless UI state updates
 */

class SwrCache {
    constructor(maxEntries = 120) {
        this.cache = new Map();
        this.maxEntries = maxEntries;
        this.listeners = new Map();
    }

    /**
     * Cache entry format:
     * {
     *   data: any,
     *   timestamp: number,
     *   ttl: number,
     *   isRevalidating: boolean
     * }
     */

    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // Re-insert to maintain LRU order
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry;
    }

    set(key, data, ttl = 30000) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxEntries) {
            // Evict oldest (first inserted key in Map)
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }

        const entry = {
            data,
            timestamp: Date.now(),
            ttl,
            isRevalidating: false
        };
        this.cache.set(key, entry);
        return entry;
    }

    isStale(entry) {
        if (!entry) return true;
        return Date.now() - entry.timestamp > entry.ttl;
    }

    setRevalidating(key, isRevalidating) {
        const entry = this.cache.get(key);
        if (entry) {
            entry.isRevalidating = isRevalidating;
        }
    }

    invalidate(key) {
        this.cache.delete(key);
    }

    /**
     * Invalidate all cache keys matching a prefix or URL pattern
     * e.g., invalidateByPrefix('/api/products') removes '/api/products', '/api/products?page=0', '/api/products/123'
     */
    invalidateByPrefix(prefix) {
        if (!prefix) return;
        let count = 0;
        for (const key of Array.from(this.cache.keys())) {
            if (key === prefix || key.startsWith(prefix + '?') || key.startsWith(prefix + '/')) {
                this.cache.delete(key);
                count++;
            }
        }
        if (count > 0) {
            console.debug(`[SWR] Invalidated ${count} cache entries for prefix: ${prefix}`);
        }
    }

    invalidateAll() {
        this.cache.clear();
        console.debug('[SWR] Cleared all in-memory cache');
    }

    has(key) {
        return this.cache.has(key);
    }

    size() {
        return this.cache.size;
    }
}

export const swrCache = new SwrCache();
export default swrCache;
