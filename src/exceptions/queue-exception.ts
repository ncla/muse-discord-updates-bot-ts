export class QueueException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'QueueException';
    }
}
