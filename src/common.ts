type PromiseFunction<T> = () => Promise<T>;

export function retryPromise<T>(
    fn: PromiseFunction<T>,
    retries: number = 3,
    delay: number = 1000
): Promise<T> {
    return new Promise((resolve, reject) => {
        const attempt = (n: number) => {
            fn()
                .then(resolve)
                .catch((error) => {
                    console.error(error);

                    if (n === 1) {
                        console.error(`Exhausted all retries`);
                        reject(error);
                        return;
                    }

                    console.warn(`Retrying ${n}/${retries} in ${delay}ms`);

                    setTimeout(() => {
                        console.warn(`Retrying ${n}/${retries}`);
                        attempt(n - 1);
                    }, delay);
                });
        };

        attempt(retries);
    });
}