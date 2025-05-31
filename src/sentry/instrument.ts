import * as Sentry from "@sentry/node";
import config from '@/src/config';

if (config.app.errorReporting.sentry.dsn) {
    Sentry.init({
        dsn: config.app.errorReporting.sentry.dsn,
        tracesSampleRate: 1.0
    });
}
