import { Context, LambdaContext } from '@awsless/lambda';
import { GenericSchema, InferOutput, ObjectEntries, ObjectSchema } from '@awsless/validate';
import { FunctionUrlResult } from '../server/http.js';
export type RouteSchemaProps = {
    /** The schema the json request body validates against - the parsed result lands on `data`. */
    body?: GenericSchema;
    /** The schema the query string parameters validate against. */
    query?: ObjectSchema<ObjectEntries, undefined> | undefined;
    /** The schema the route path parameters validate against. */
    params?: ObjectSchema<ObjectEntries, undefined> | undefined;
};
type Op<T extends GenericSchema | undefined, D> = T extends GenericSchema ? InferOutput<T> : D;
/** What a route or site handler receives. */
export type RouteEvent<P extends RouteSchemaProps = {}> = {
    /** The web request: its method, url & headers, and a body streamed as it arrives. */
    readonly request: Request;
    /** The request's url, parsed. */
    readonly url: URL;
    /** The validated route path parameters. */
    readonly params: Op<P['params'], Record<string, string>>;
    /** The validated query string parameters, a repeated name's values joined with commas. */
    readonly query: Op<P['query'], Record<string, string>>;
    /** The parsed & validated json body, when a body schema is given; the request's own body stays readable. */
    readonly data: Op<P['body'], undefined>;
    /** The caller's ip address: CloudFront's viewer address behind a router, else the connection's. */
    readonly ip: string;
};
type RouteHandler<P extends RouteSchemaProps> = (event: RouteEvent<P>, context: Context) => Response | Promise<Response>;
/**
 * A route entry: called with a function url (or http api) event it answers
 * the result read whole; its fetch takes a web Request & answers the Response
 * as the handler streams it, on the web function.
 */
export type RouteEntry = {
    (event: unknown, context?: LambdaContext): Promise<FunctionUrlResult>;
    fetch: (request: Request, context?: LambdaContext) => Promise<Response>;
};
/** The route's input as an error logs it, without credentials or personal data (exported for its tests). */
export declare const redactRouteInput: (props: RouteSchemaProps) => (input: unknown) => {
    method: string;
    path: string;
    query: string;
    headers: {
        [k: string]: any;
    } | undefined;
    params: {
        [x: string]: any;
    };
    body: any;
    ip: any;
};
export declare function route(handle: RouteHandler<{}>): RouteEntry;
export declare function route<P extends RouteSchemaProps>(props: P, handle: RouteHandler<P>): RouteEntry;
/** A site ssr handler: a route without schemas. */
export declare const site: (handle: RouteHandler<{}>) => RouteEntry;
export {};
