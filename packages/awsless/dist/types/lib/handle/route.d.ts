import { Handler, LambdaContext } from '@awsless/lambda';
import { BaseSchema, GenericIssue, GenericSchema, InferInput, InferOutput, ObjectEntries, ObjectSchema } from '@awsless/validate';
export type RouteSchemaProps = {
    /** The schema the json request body validates against - the parsed result lands on `request.data`. */
    body?: GenericSchema;
    /** The schema the query string parameters validate against. */
    query?: ObjectSchema<ObjectEntries, undefined> | undefined;
    /** The schema the route path parameters validate against. */
    params?: ObjectSchema<ObjectEntries, undefined> | undefined;
};
type Op<T extends GenericSchema | undefined, D> = T extends GenericSchema ? InferOutput<T> : D;
type Method = 'GET' | 'POST' | 'HEAD' | 'OPTIONS' | 'PUT' | 'PATCH' | 'DELETE';
export declare class RouteRequest<Params = Record<string, string>, Query = Record<string, string>, Data = unknown> {
    /** The http method of the request. */
    readonly method: Method;
    /** The full request url. */
    readonly url: URL;
    /** The request headers. */
    readonly headers: Headers;
    /** The validated route path parameters. */
    readonly params: Params;
    /** The validated query string parameters. */
    readonly query: Query;
    /** The parsed & validated request body, when a body schema is given. */
    readonly data: Data;
    /** The ip address of the caller. */
    readonly ip: string;
    /** The user agent header of the caller. */
    readonly userAgent: string;
    /** The raw request body bytes. */
    readonly body?: Buffer;
    constructor(props: {
        method: Method;
        url: string;
        headers: Headers;
        params: Params;
        query: Query;
        data: Data;
        ip: string;
        userAgent: string;
        body?: Buffer;
    });
    /** The body decoded as text. */
    text(): string | undefined;
    /** The body parsed as json. */
    json<T = unknown>(): T;
}
declare const envelopeSchema: ObjectSchema<{
    readonly rawPath: import("valibot").OptionalSchema<import("valibot").StringSchema<undefined>, undefined>;
    readonly rawQueryString: import("valibot").OptionalSchema<import("valibot").StringSchema<undefined>, undefined>;
    readonly body: import("valibot").OptionalSchema<import("valibot").StringSchema<undefined>, undefined>;
    readonly isBase64Encoded: import("valibot").OptionalSchema<import("valibot").BooleanSchema<undefined>, undefined>;
    readonly headers: import("valibot").OptionalSchema<import("valibot").RecordSchema<import("valibot").StringSchema<undefined>, import("valibot").StringSchema<undefined>, undefined>, undefined>;
    readonly pathParameters: import("valibot").OptionalSchema<import("valibot").RecordSchema<import("valibot").StringSchema<undefined>, import("valibot").StringSchema<undefined>, undefined>, undefined>;
    readonly queryStringParameters: import("valibot").OptionalSchema<import("valibot").RecordSchema<import("valibot").StringSchema<undefined>, import("valibot").StringSchema<undefined>, undefined>, undefined>;
    readonly requestContext: ObjectSchema<{
        readonly domainName: import("valibot").StringSchema<undefined>;
        readonly http: ObjectSchema<{
            readonly method: import("valibot").PicklistSchema<["GET", "POST", "HEAD", "OPTIONS", "PUT", "PATCH", "DELETE"], undefined>;
            readonly path: import("valibot").StringSchema<undefined>;
            readonly sourceIp: import("valibot").StringSchema<undefined>;
            readonly userAgent: import("valibot").StringSchema<undefined>;
        }, undefined>;
    }, undefined>;
}, undefined>;
type EnvelopeInput = InferInput<typeof envelopeSchema>;
type RouteRequestOf<P extends RouteSchemaProps> = RouteRequest<Op<P['params'], Record<string, string>>, Op<P['query'], Record<string, string>>, Op<P['body'], undefined>>;
export type RouteSchema<P extends RouteSchemaProps> = BaseSchema<EnvelopeInput, RouteRequestOf<P>, GenericIssue>;
type LambdaUrlResult = {
    statusCode: number;
    [key: string]: unknown;
};
/** The request a route or site handler receives, validated against the route schemas. */
export type RouteEvent<P extends RouteSchemaProps = {}> = RouteRequestOf<P>;
/** What a route or site handler may return: a web Response or a lambda url result object. */
export type RouteResponse = Response | LambdaUrlResult;
type RouteResult = RouteResponse | Promise<RouteResponse>;
/** The lambda url result a route entry resolves to - a returned web Response converts into this shape. */
export type RouteEntryResult = {
    statusCode: number;
    headers?: Record<string, string>;
    cookies?: string[];
    body?: string;
    isBase64Encoded?: boolean;
    [key: string]: unknown;
};
type HandlerContext = Parameters<Handler>[1];
type RouteHandler<P extends RouteSchemaProps> = (request: RouteRequestOf<P>, context: HandlerContext) => RouteResult;
type RouteEntry = (event: unknown, context?: LambdaContext) => Promise<RouteEntryResult>;
export declare function route<H extends RouteHandler<{}>>(handle: H): RouteEntry;
export declare function route<P extends RouteSchemaProps>(props: P, handle: RouteHandler<P>): RouteEntry;
export declare const site: <H extends RouteHandler<{}>>(handle: H) => (event: {
    rawPath?: string | undefined;
    rawQueryString?: string | undefined;
    body?: string | undefined;
    isBase64Encoded?: boolean | undefined;
    headers?: {
        [x: string]: string;
    } | undefined;
    pathParameters?: {
        [x: string]: string;
    } | undefined;
    queryStringParameters?: {
        [x: string]: string;
    } | undefined;
    requestContext: {
        domainName: string;
        http: {
            method: "GET" | "POST" | "HEAD" | "OPTIONS" | "PUT" | "PATCH" | "DELETE";
            path: string;
            sourceIp: string;
            userAgent: string;
        };
    };
}, context?: LambdaContext) => Promise<LambdaUrlResult | {
    statusCode: number;
    headers: Record<string, string>;
    cookies: string[] | undefined;
    body: string | undefined;
    isBase64Encoded: boolean;
}>;
export {};
