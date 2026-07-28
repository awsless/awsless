import * as _awsless_validate from '@awsless/validate';
import { Duration } from '@awsless/duration';
import { UUID } from 'node:crypto';
import { LambdaFunctionURLEvent, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

interface JobMock {
}
interface JobMockResponse {
}
declare const mockJob: (cb: (mock: JobMock) => void) => JobMockResponse;

interface AlertMock {
}
interface AlertMockResponse {
}
declare const mockAlert: (cb: (mock: AlertMock) => void) => AlertMockResponse;

declare const mockCache: () => void;

interface FunctionMock {
}
interface FunctionMockResponse {
}
declare const mockFunction: (cb: (mock: FunctionMock) => void) => FunctionMockResponse;

declare const mockMetric: () => void;

interface InstanceMock {
}
interface InstanceMockResponse {
}
declare const mockInstance: (cb: (mock: InstanceMock) => void) => InstanceMockResponse;

interface PubSubMock {
}
interface PubSubMockResponse {
}
declare const mockPubSub: (cb: (mock: PubSubMock) => void) => PubSubMockResponse;

interface QueueMock {
}
interface QueueMockResponse {
}
declare const mockQueue: (cb: (mock: QueueMock) => void) => QueueMockResponse;

interface TaskMock {
}
interface TaskMockResponse {
}
declare const mockTask: (cb: (mock: TaskMock) => void) => TaskMockResponse;

interface TopicMock {
}
interface TopicMockResponse {
}
declare const mockTopic: (cb: (mock: TopicMock) => void) => TopicMockResponse;

declare const ROUTE_PROPERTY = "$awsless-route";
declare const BUNDLE_QUALIFIER = "live";
declare const getBundleName: () => string;
type RouteInvoker = (routeKey: string, payload: unknown) => Promise<unknown>;
declare const getCurrentRoute: () => string | undefined;
declare const withRoute: <T>(routeKey: string, invoke: RouteInvoker, callback: () => T) => T;
declare const invokeRoute: (routeKey: string, payload: unknown) => Promise<unknown>;
declare const formatRouteKey: (stackName: string, resourceType: string, resourceName: string) => string;
declare const formatRoutePayload: (routeKey: string, event: unknown) => {
    "$awsless-route": string;
    event: unknown;
};
declare const formatRouteEnvName: (routeKey: string, name: string) => string;
declare const getRouteEnv: (name: string) => string | undefined;

declare const getJobName: <N extends string, S extends string = "stack">(resourceName: N, stackName?: S) => `app--${S}--job--${N}`;
interface JobResources {
}
declare const Job: JobResources;

declare const getAlertName: <N extends string>(resourceName: N) => `app--alert--${N}`;
interface AlertResources {
}
declare const Alert: AlertResources;

declare const getAuthProps: (name: string) => {
    readonly userPoolId: string | undefined;
    readonly clientId: string | undefined;
};
interface AuthResources {
}
declare const Auth: AuthResources;

declare const getCacheProps: (name: string, stack?: string) => {
    readonly host: string;
    readonly port: number;
};
interface CacheResources {
}
declare const Cache: CacheResources;

declare const getConfigName: (name: string) => string;
declare const getConfigValue: (name: string) => string;
declare const setConfigValue: (name: string, value: string) => void;
interface ConfigResources {
}
declare const Config: ConfigResources;

declare const getCronName: <N extends string, S extends string = "stack">(resourceName: N, stackName?: S) => `app--${S}--cron--${N}`;
interface CronResources {
}
declare const Cron: CronResources;

declare const getFunctionName: <N extends string, S extends string = "stack">(resourceName: N, stackName?: S) => `app--${S}--function--${N}`;
interface FunctionResources {
}
declare const Fn: FunctionResources;

declare const getInstanceQueueName: <N extends string, S extends string = "stack">(resourceName: N, stackName?: S) => `app--${S}--instance--${N}`;
declare const getInstanceQueueUrl: (name: string, stack?: string) => string | undefined;
interface InstanceResources {
}
declare const Instance: InstanceResources;

declare const getMetricName: (name: string) => string;
declare const getMetricNamespace: (stack?: string, app?: string) => string;
interface MetricResources {
}
declare const Metric: MetricResources;

declare const onErrorLogSchema: _awsless_validate.ObjectSchema<{
    readonly hash: _awsless_validate.StringSchema<undefined>;
    readonly requestId: _awsless_validate.StringSchema<undefined>;
    readonly origin: _awsless_validate.StringSchema<undefined>;
    readonly level: _awsless_validate.PicklistSchema<["warn", "error", "fatal"], undefined>;
    readonly type: _awsless_validate.StringSchema<undefined>;
    readonly message: _awsless_validate.StringSchema<undefined>;
    readonly stackTrace: _awsless_validate.OptionalSchema<_awsless_validate.ArraySchema<_awsless_validate.StringSchema<undefined>, undefined>, undefined>;
    readonly data: _awsless_validate.OptionalSchema<_awsless_validate.UnknownSchema, undefined>;
    readonly date: _awsless_validate.UnionSchema<[_awsless_validate.DateSchema<undefined>, _awsless_validate.SchemaWithPipe<readonly [_awsless_validate.StringSchema<undefined>, _awsless_validate.IsoTimestampAction<string, undefined>, _awsless_validate.TransformAction<string, Date>]>], undefined>;
}, undefined>;

declare const onFailureBucketName: string;
declare const onFailureQueueName: string;
declare const onFailureBucketArn: string;
declare const onFailureQueueArn: string;

declare const getPubSubPublisherName: <N extends string>(resourceName: N) => `app--pubsub-publisher--${N}`;
interface PubSubResources {
}
declare const PubSub: PubSubResources;
type PubSubAuthorizerResponse = {
    authorized: true;
    allowed: string[];
    context?: Record<string, unknown>;
    ttl?: Duration;
    disconnectAfter?: Duration;
} | {
    authorized: false;
};
type PubSubAuthorizerEvent = {
    token?: string;
};
type PubSubConnectedEvent = {
    event: 'connected';
    socketId: UUID;
    ip: string;
    context?: Record<string, unknown>;
    date: Date;
};
type PubSubDisconnectedEvent = {
    event: 'disconnected';
    socketId: UUID;
    ip: string;
    context?: Record<string, unknown>;
    date: Date;
};
type PubSubSubscribedEvent = {
    event: 'subscribed';
    socketId: UUID;
    ip: string;
    context?: Record<string, unknown>;
    topics: string[];
    date: Date;
};
type PubSubUnsubscribedEvent = {
    event: 'unsubscribed';
    socketId: UUID;
    ip: string;
    context?: Record<string, unknown>;
    topics: string[];
    date: Date;
};

declare const getQueueName: (name: string, stack?: string) => string;
declare const getQueueUrl: (name: string, stack?: string) => string | undefined;
interface QueueResources {
}
declare const Queue: QueueResources;

type RouteParams<Pattern extends string> = Pattern extends `${string}{${infer Param}}${infer Rest}` ? Param | RouteParams<Rest> : never;
type RouteParamHeaders<Pattern extends string> = [RouteParams<Pattern>] extends [never] ? {} : {
    [Param in RouteParams<Pattern> as `x-param-${Lowercase<Param>}`]: string;
};
/**
 * The request that a route function receives.
 *
 * Passing the route pattern will type the params that are
 * passed as "x-param-[NAME]" request headers.
 * Param values are URI encoded.
 *
 * @example
 * export default async (event: RouteInput<'/sitemap/{locale}/{page}.xml'>) => {
 *   const locale = decodeURIComponent(event.headers['x-param-locale'])
 *   ...
 * }
 */
type RouteEvent<Pattern extends string = string> = LambdaFunctionURLEvent & {
    headers: LambdaFunctionURLEvent['headers'] & RouteParamHeaders<Pattern>;
};
/**
 * The response that a route function can return.
 *
 * The statusCode is required because Lambda function urls only treat
 * the returned object as an HTTP response when it contains a statusCode.
 * Without it, the whole return value is serialized as a JSON body.
 */
type RouteResponse = string | (APIGatewayProxyStructuredResultV2 & {
    statusCode: number;
});

type RpcAuthorizerResponse = {
    authorized: false;
} | {
    authorized: true;
    context?: unknown;
    lockKey?: string;
    allowedFunctions?: string[];
    ttl: Duration;
};

declare const getSearchName: <N extends string, S extends string = "stack">(resourceName: N, stackName?: S) => `app--${S}--search--${N}`;
declare const getSearchProps: (name: string, stack?: string) => {
    readonly domain: string | undefined;
};
interface SearchResources {
}
declare const Search: SearchResources;

interface StoreResources {
}
declare const Store: StoreResources;

declare const getTableName: <N extends string, S extends string = "stack">(resourceName: N, stackName?: S) => `app--${S}--table--${N}`;
interface TableResources {
}
declare const Table: TableResources;

declare const getTaskName: <N extends string, S extends string = "stack">(resourceName: N, stackName?: S) => `app--${S}--task--${N}`;
interface TaskResources {
}
declare const Task: TaskResources;

declare const getTopicName: <N extends string>(resourceName: N) => `app--topic--${N}`;
interface TopicResources {
}
declare const Topic: TopicResources;

declare const APP: "app";
declare const getStack: () => "stack";

export { APP, Alert, type AlertMock, type AlertMockResponse, type AlertResources, Auth, type AuthResources, BUNDLE_QUALIFIER, Cache, type CacheResources, Config, type ConfigResources, Cron, type CronResources, Fn, type FunctionMock, type FunctionMockResponse, type FunctionResources, Instance, type InstanceMock, type InstanceMockResponse, type InstanceResources, Job, type JobMock, type JobMockResponse, type JobResources, Metric, type MetricResources, PubSub, type PubSubAuthorizerEvent, type PubSubAuthorizerResponse, type PubSubConnectedEvent, type PubSubDisconnectedEvent, type PubSubMock, type PubSubMockResponse, type PubSubResources, type PubSubSubscribedEvent, type PubSubUnsubscribedEvent, Queue, type QueueMock, type QueueMockResponse, type QueueResources, ROUTE_PROPERTY, type RouteEvent, type RouteInvoker, type RouteResponse, type RpcAuthorizerResponse, Search, type SearchResources, Store, type StoreResources, Table, type TableResources, Task, type TaskMock, type TaskMockResponse, type TaskResources, Topic, type TopicMock, type TopicMockResponse, type TopicResources, formatRouteEnvName, formatRouteKey, formatRoutePayload, getAlertName, getAuthProps, getBundleName, getCacheProps, getConfigName, getConfigValue, getCronName, getCurrentRoute, getFunctionName, getInstanceQueueName, getInstanceQueueUrl, getJobName, getMetricName, getMetricNamespace, getPubSubPublisherName, getQueueName, getQueueUrl, getRouteEnv, getSearchName, getSearchProps, getStack, getTableName, getTaskName, getTopicName, invokeRoute, mockAlert, mockCache, mockFunction, mockInstance, mockJob, mockMetric, mockPubSub, mockQueue, mockTask, mockTopic, onErrorLogSchema, onFailureBucketArn, onFailureBucketName, onFailureQueueArn, onFailureQueueName, setConfigValue, withRoute };
