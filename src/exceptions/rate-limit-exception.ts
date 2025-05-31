export class RateLimitException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RateLimitException';
    }
}
