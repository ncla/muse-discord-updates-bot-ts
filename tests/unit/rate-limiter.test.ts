import {expect, test} from 'vitest'
import {RateLimiterMemory} from "@/src/rate-limiter";

test('consume 1 point', async () => {
    const rateLimiter = new RateLimiterMemory({points: 2, durationSeconds: 5});
    await rateLimiter.consume('consume1');
    const result = await rateLimiter.get('consume1');
    expect(result!.consumedPoints).toBe(1);
});

test('can not consume more than maximum points', async () => {
    const rateLimiter = new RateLimiterMemory({points: 1, durationSeconds: 5});
    await expect(rateLimiter.consume('consume2', 2)).rejects.toSatisfy((rejection: unknown) => {
        return rejection instanceof Object && 'msBeforeNext' in rejection && (rejection.msBeforeNext as number) >= 0;
    });
});

test('get by key', async () => {
    const rateLimiter = new RateLimiterMemory({points: 2, durationSeconds: 5});
    await rateLimiter.consume('get');
    const result = await rateLimiter.get('get');
    expect(result!.remainingPoints).toBe(1);
});

test('get resolves null if key is not set', async () => {
    const rateLimiter = new RateLimiterMemory({points: 2, durationSeconds: 5});
    const result = await rateLimiter.get('nonexistent');
    expect(result).toBeNull();
});

test('delete resolves true if key is set', async () => {
    const rateLimiter = new RateLimiterMemory({points: 2, durationSeconds: 5});
    await rateLimiter.consume('deletekey');
    const deleted = await rateLimiter.delete('deletekey');
    expect(deleted).toBe(true);
});

test('delete resolves false if key is not set', async () => {
    const rateLimiter = new RateLimiterMemory({points: 2, durationSeconds: 5});
    const deleted = await rateLimiter.delete('nonexistent');
    expect(deleted).toBe(false);
});

test('does not expire key if duration set to 0', async () => {
    const rateLimiter = new RateLimiterMemory({points: 2, durationSeconds: 0});
    await rateLimiter.consume('neverexpire');
    await rateLimiter.consume('neverexpire');
    const result = await rateLimiter.get('neverexpire');
    expect(result!.consumedPoints).toBe(2);
    expect(result!.msBeforeNext).toBe(-1);
});

test('rejects with consumed and remaining points when over limit', async () => {
    const rateLimiter = new RateLimiterMemory({points: 1, durationSeconds: 5});
    await rateLimiter.consume('overlimit');
    try {
        await rateLimiter.consume('overlimit');
        expect.unreachable('should have rejected');
    } catch (rejection) {
        expect(rejection).toHaveProperty('consumedPoints', 2);
        expect(rejection).toHaveProperty('remainingPoints', 0);
    }
});
