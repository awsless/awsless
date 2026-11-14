/** A function url or http api event, the fields read here. */
export type FunctionUrlEvent = {
    version?: string;
    routeKey?: string;
    rawPath?: string;
    rawQueryString?: string;
    body?: string;
    isBase64Encoded?: boolean;
    headers?: Record<string, string>;
    cookies?: string[];
    pathParameters?: Record<string, string>;
    requestContext: {
        domainName?: string;
        requestId?: string;
        http: {
            method: string;
            path?: string;
            sourceIp: string;
            userAgent?: string;
            protocol?: string;
        };
        [key: string]: unknown;
    };
    [key: string]: unknown;
};
/** What a handler answers through a function url. */
export type FunctionUrlResult = {
    statusCode: number;
    headers?: Record<string, string>;
    cookies?: string[];
    body?: string;
    isBase64Encoded?: boolean;
};
/**
 * A function url or http api event as a web Request, with what only the
 * event knows: the lambda's source ip and a rest api's path parameters.
 */
export declare const toWebRequest: (input: unknown) => {
    request: Request;
    sourceIp: string;
    pathParameters: {
        [x: string]: string;
    } | undefined;
};
/** A web Request as the function url event a handler without a web entry takes, its body read whole. */
export declare const toFunctionUrlEvent: (request: Request, props?: {
    sourceIp?: string;
}) => Promise<FunctionUrlEvent>;
/** A handler's answer as a web Response: a result with a status code is the response, anything else a 200 json body. */
export declare const toWebResponse: (result: unknown) => Response;
/** A web Response read to its end, as the result a function url answers. */
export declare const toFunctionUrlResult: (response: Response) => Promise<FunctionUrlResult>;
/** A url's query, a repeated name's values joined with commas like a function url's. */
export declare const getQuery: (url: URL) => Record<string, string>;
/** The caller behind CloudFront: its viewer address ("ip:port", also for ipv6), which CloudFront writes over any a client sends. */
export declare const getViewerIp: (headers: Headers) => string | undefined;
