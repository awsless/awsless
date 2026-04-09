import { Logger } from '@awsless/lambda';

interface BugsnagOptions {
    apiKey?: string;
}
/**
 * Logging errors into Bugsnag
 * @param apiKey - The bugsnag api key. Default is `process.env.BUGSNAG_API_KEY`
 */
declare const bugsnag: ({ apiKey }?: BugsnagOptions) => Logger;

export { bugsnag };
