export class ConsumeResult {
    remainingPoints: number;
    msBeforeNext: number;
    consumedPoints: number;
    isFirstInDuration: boolean;

    constructor(
        remainingPoints: number = 0,
        msBeforeNext: number = 0,
        consumedPoints: number = 0,
        isFirstInDuration: boolean = false
    ) {
        this.remainingPoints = remainingPoints;
        this.msBeforeNext = msBeforeNext;
        this.consumedPoints = consumedPoints;
        this.isFirstInDuration = isFirstInDuration;
    }
}

interface MemoryRecord {
    value: number;
    expiresAt: Date | null;
    timeoutId: ReturnType<typeof setTimeout> | null;
}

class MemoryStorage {
    private _storage: Map<string, MemoryRecord> = new Map();

    incrementBy(key: string, value: number, durationSeconds: number): ConsumeResult {
        const existing = this._storage.get(key);

        if (existing) {
            const msBeforeExpires = existing.expiresAt
                ? existing.expiresAt.getTime() - Date.now()
                : -1;

            if (!existing.expiresAt || msBeforeExpires > 0) {
                existing.value += value;

                return new ConsumeResult(
                    0,
                    msBeforeExpires,
                    existing.value,
                    false
                );
            }

            return this.set(key, value, durationSeconds);
        }

        return this.set(key, value, durationSeconds);
    }

    set(key: string, value: number, durationSeconds: number): ConsumeResult {
        const durationMs = durationSeconds * 1000;

        const existing = this._storage.get(key);

        if (existing?.timeoutId) {
            clearTimeout(existing.timeoutId);
        }

        const record: MemoryRecord = {
            value: Math.floor(value),
            expiresAt: durationMs > 0 ? new Date(Date.now() + durationMs) : null,
            timeoutId: null,
        };

        if (durationMs > 0) {
            record.timeoutId = setTimeout(() => {
                this._storage.delete(key);
            }, durationMs);

            if (record.timeoutId.unref) {
                record.timeoutId.unref();
            }
        }

        this._storage.set(key, record);

        return new ConsumeResult(
            0,
            durationMs === 0 ? -1 : durationMs,
            record.value,
            true
        );
    }

    get(key: string): ConsumeResult | null {
        const existing = this._storage.get(key);

        if (existing) {
            const msBeforeExpires = existing.expiresAt
                ? existing.expiresAt.getTime() - Date.now()
                : -1;

            return new ConsumeResult(
                0,
                msBeforeExpires,
                existing.value,
                false
            );
        }
        return null;
    }

    delete(key: string): boolean {
        const existing = this._storage.get(key);
        if (existing) {
            if (existing.timeoutId) {
                clearTimeout(existing.timeoutId);
            }

            this._storage.delete(key);

            return true;
        }

        return false;
    }
}

interface RateLimiterMemoryOptions {
    points?: number;
    durationSeconds?: number;
    keyPrefix?: string;
}

export class RateLimiterMemory {
    points: number;
    durationSeconds: number;
    keyPrefix: string;
    private _memoryStorage: MemoryStorage;

    constructor(opts: RateLimiterMemoryOptions = {}) {
        this.points = opts.points !== undefined && opts.points >= 0 ? opts.points : 4;
        this.durationSeconds = opts.durationSeconds !== undefined ? opts.durationSeconds : 1;
        this.keyPrefix = opts.keyPrefix !== undefined ? opts.keyPrefix : 'rlflx';
        this._memoryStorage = new MemoryStorage();
    }

    private getKey(key: string): string {
        return this.keyPrefix.length > 0 ? `${this.keyPrefix}:${key}` : key;
    }

    consume(consumeKey: string, pointsToConsume: number = 1): Promise<ConsumeResult> {
        return new Promise((resolve, reject) => {
            const key = this.getKey(consumeKey);

            const result = this._memoryStorage.incrementBy(
                key,
                pointsToConsume,
                this.durationSeconds
            );

            result.remainingPoints = Math.max(this.points - result.consumedPoints, 0);

            if (result.consumedPoints > this.points) {
                reject(result);
            } else {
                resolve(result);
            }
        });
    }

    get(key: string): Promise<ConsumeResult | null> {
        const result = this._memoryStorage.get(this.getKey(key));
        if (result !== null) {
            result.remainingPoints = Math.max(this.points - result.consumedPoints, 0);
        }
        return Promise.resolve(result);
    }

    delete(key: string): Promise<boolean> {
        return Promise.resolve(this._memoryStorage.delete(this.getKey(key)));
    }
}
