import { InvokeOptions } from '@awsless/lambda';
export declare const ROUTE_PROPERTY = "$awsless-route";
export declare const LIVE_BUNDLE_ALIAS = "live";
export declare const getBundleName: () => string;
export declare const formatRouteKey: (stackName: string, resourceType: string, resourceName: string) => string;
export declare const formatRoutePayload: (routeKey: string, event: unknown) => {
    "$awsless-route": string;
    event: unknown;
};
type InvokeBundleProps = Omit<InvokeOptions, 'name' | 'payload'> & {
    routeKey: string;
    payload?: unknown;
};
export declare const invokeBundle: ({ routeKey, payload, ...options }: InvokeBundleProps) => Promise<unknown>;
export type InternalInvoke = (routeKey: string, payload: unknown) => Promise<unknown>;
export declare const isInsideBundle: () => boolean;
export declare const getCurrentRoute: () => string | undefined;
export declare const withBundleRoute: <T>(routeKey: string, internalInvoke: InternalInvoke, callback: () => T) => T;
export declare const internalInvoke: (routeKey: string, payload: unknown) => Promise<unknown>;
export declare const formatRouteEnvName: (routeKey: string, name: string) => string;
export declare const getRouteEnv: (name: string) => string | undefined;
export {};
