/**
 * Cache types
 */
export interface CacheEntry<T> {
    key: string;
    value: T;
    expiresAt: Date;
    createdAt: Date;
}
