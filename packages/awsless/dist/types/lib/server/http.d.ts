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
/** A web Response read to its end, as the result a function url answers. */
export declare const toFunctionUrlResult: (response: Response) => Promise<FunctionUrlResult>;
/** The caller behind CloudFront: its viewer address ("ip:port", also for ipv6), which CloudFront writes over any a client sends. */
export declare const getViewerIp: (headers: Headers) => string | undefined;
