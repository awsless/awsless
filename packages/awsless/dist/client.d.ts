import { Duration } from "@awsless/duration";
//#region src/lib/client/http.d.ts
interface HTTP {}
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
declare class HttpError extends Error {
  readonly status: number;
  readonly body: string;
  readonly url: string;
  constructor(status: number, body: string, url: string);
}
type HttpFetcherOptions = {
  timeout?: Duration;
};
declare const createHttpFetcher: (host: string, options?: HttpFetcherOptions) => HttpFetcher;
declare const createHttpClient: <S extends Schema>(fetcher: HttpFetcher) => {
  fetch: <M extends keyof S, P extends keyof S[M]>(method: M, routeKey: Extract<P, string>, props?: Props<GetRoute<S, M, P>>) => Promise<GetRoute<S, M, P>['response']>;
  get<P extends keyof S['GET']>(routeKey: Extract<P, string>, props?: Props<GetRoute<S, 'GET', P>>): Promise<GetRoute<S, "GET", P>["response"]>;
  post<P extends keyof S['POST']>(routeKey: Extract<P, string>, props?: Props<GetRoute<S, 'POST', P>>): Promise<GetRoute<S, "POST", P>["response"]>;
};
//#endregion
//#region src/lib/client/auth.d.ts
interface AuthResources {}
declare const Auth: AuthResources;
declare const getAuthProps: (name: string) => {
  readonly userPoolId: string;
  readonly clientId: string;
};
//#endregion
//#region src/lib/client/rpc.d.ts
interface RpcSchema {}
//#endregion
export { Auth, AuthResources, HTTP, HttpError, HttpFetcher, HttpFetcherOptions, RpcSchema, createHttpClient, createHttpFetcher, getAuthProps };