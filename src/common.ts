type PromiseFunction<T> = () => Promise<T>;

export function retryPromise<T>(
    fn: PromiseFunction<T>,
    maxTries: number = 3,
    delay: number = 1000
): Promise<T> {
    return new Promise((resolve, reject) => {
        const attempt = (totalTries: number) => {
            function handleFailure(error: any) {
                if (totalTries === maxTries) {
                    reject(error);
                    return;
                }

                setTimeout(() => {
                    attempt(totalTries + 1);
                }, delay);
            }

            try {
                const result = fn(); // Call the function here

                // If it's a promise, wait for resolution/rejection.
                if (result instanceof Promise) {
                    result.then(resolve).catch(handleFailure);
                } else {
                    // If it's not a promise, resolve directly.
                    resolve(result);
                }
            } catch (error) {
                handleFailure(error); // Handle synchronous errors.
            }
        };

        attempt(1);
    });
}