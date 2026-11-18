import { Context, LambdaContext } from '@awsless/lambda';
import { FunctionUrlResult } from '../server/http.js';
/** What a route or site handler receives. */
export type RouteEvent = {
    /** The web request: its method, url & headers, and a body streamed as it arrives. */
    readonly request: Request;
    /** The route path parameters. */
    readonly params: Record<string, string>;
    /** The caller's ip address: CloudFront's viewer address behind a router, else the connection's. */
    readonly ip: string;
};
type RouteHandler = (event: RouteEvent, context: Context) => Response | Promise<Response>;
/**
 * A route entry: called with a function url (or http api) event it answers
 * the result read whole; its fetch takes a web Request & answers the Response
 * as the handler streams it, on the web function.
 */
export type RouteEntry = {
    (event: unknown, context?: LambdaContext): Promise<FunctionUrlResult>;
    fetch: (request: Request, context?: LambdaContext) => Promise<Response>;
};
/** A route handler: a web Request in, a Response out. */
export declare const route: (handle: RouteHandler) => RouteEntry;
/** A site ssr handler: a route. */
export declare const site: typeof route;
export {};
