import { InvokeOptions } from '@awsless/lambda';
export declare const ROUTE_PROPERTY = "$awsless-route";
export declare const ROUTE_HEADER = "x-awsless-route";
export declare const LIVE_BUNDLE_ALIAS = "live";
export declare const getBundleName: () => string;
export declare const formatRouteKey: (stackName: string, resourceType: string, resourceName: string) => string;
export declare const formatRoutePayload: (routeKey: string, event: unknown) => {
    "$awsless-route": string;
    event: unknown;
};
export declare const captureInvokedQualifier: (context: {
    invokedFunctionArn?: string;
}) => void;
export declare const getInvokedQualifier: () => string | undefined;
type InvokeBundleProps = Omit<InvokeOptions, 'name' | 'payload'> & {
    routeKey: string;
    payload?: unknown;
};
export declare const invokeBundle: ({ routeKey, payload, ...options }: InvokeBundleProps) => Promise<unknown>;
export type InternalInvoke = (routeKey: string, payload: unknown) => Promise<unknown>;
export type BundleRouteOptions = {
    throwExpectedErrors?: boolean;
};
export declare const isInsideBundle: () => boolean;
export declare const getCurrentRoute: () => string | undefined;
export declare const shouldThrowExpectedErrors: () => boolean;
export declare const withBundleRouteContext: <T>(routeKey: string, internalInvoke: InternalInvoke, callback: () => T, options?: BundleRouteOptions) => T;
export declare const internalInvoke: (routeKey: string, payload: unknown) => Promise<unknown>;
export declare const setBundleRoutes: (routes: string[]) => void;
export declare const hasBundleRoute: (routeKey: string) => boolean;
export declare const getStandaloneFunctionName: (routeKey: string) => string;
export declare const formatRouteEnvName: (routeKey: string, name: string) => string;
export declare const getRouteEnv: (name: string) => string | undefined;
export {};
