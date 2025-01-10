export type FulfilledPromise<T> = { status: 'fulfilled', value: T };
export type RejectedPromise = { status: 'rejected', reason: Error };
export type PromiseResult<T> = FulfilledPromise<T> | RejectedPromise;