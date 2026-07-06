import * as _awsless_mqtt from '@awsless/mqtt';
import { DebugCallback, QoS } from '@awsless/mqtt';

interface AuthResources {
}
declare const Auth: AuthResources;
declare const getAuthProps: (name: string) => {
    readonly userPoolId: string;
    readonly clientId: string;
};

interface HTTP {
}
type Method = 'GET' | 'POST';
type Path = string;
type Params = Record<string, string | number>;
type Query = Record<string, string>;
type Body = unknown;
type Route = {
    param?: Params;
    query?: Query;
    body?: Body;
    response: unknown;
};
type Routes = Record<Path, Route>;
type Schema = Partial<Record<Method, Routes>>;
type GetRoute<S extends Schema, M extends keyof S, P extends keyof S[M]> = S[M] extends Routes ? S[M][P] : never;
type Props<R extends Route> = {
    headers?: Record<string, string>;
} & (Params extends R['param'] ? {
    params?: Params;
} : {
    params: R['param'];
}) & (Query extends R['query'] ? {
    query?: Query;
} : {
    query: R['query'];
}) & (undefined extends R['body'] ? {
    body?: Body;
} : {
    body: R['body'];
});
type HttpFetcher = (props: {
    method: Method;
    path: Path;
    headers: Headers;
    query?: Query;
    body?: Body;
}) => unknown;
declare const createHttpFetcher: (host: string) => HttpFetcher;
declare const createHttpClient: <S extends Schema>(fetcher: HttpFetcher) => {
    fetch: <M extends keyof S, P extends keyof S[M]>(method: M, routeKey: Extract<P, string>, props?: Props<GetRoute<S, M, P>>) => Promise<GetRoute<S, M, P>["response"]>;
    get<P_1 extends keyof S["GET"]>(routeKey: Extract<P_1, string>, props?: Props<GetRoute<S, "GET", P_1>>): Promise<GetRoute<S, "GET", P_1>["response"]>;
    post<P_1 extends keyof S["POST"]>(routeKey: Extract<P_1, string>, props?: Props<GetRoute<S, "POST", P_1>>): Promise<GetRoute<S, "POST", P_1>["response"]>;
};

type MessageCallback = (payload: any) => void;
type ClientProps = {
    endpoint: string;
    authorizer: string;
    token?: string;
};
type ClientPropsProvider = () => Promise<ClientProps> | ClientProps;
declare const createPubSubClient: (app: string | (() => string), props: ClientProps | ClientPropsProvider, debug?: DebugCallback) => {
    connected: boolean;
    topics: string[];
    publish(topic: string, event: string, payload: unknown, qos: QoS): Promise<void>;
    subscribe(topic: string, event: string, callback: MessageCallback): Promise<_awsless_mqtt.Unsubscribe>;
    destroy(): Promise<void>;
};

interface RpcSchema {
}

export { Auth, type AuthResources, type HTTP, type HttpFetcher, type RpcSchema, createHttpClient, createHttpFetcher, createPubSubClient, getAuthProps };
