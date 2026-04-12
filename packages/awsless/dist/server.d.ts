import * as vitest from 'vitest';
import * as _awsless_validate from '@awsless/validate';
import { Duration } from '@awsless/duration';
import { QoS } from '@awsless/iot';
export { QoS } from '@awsless/iot';
import { IoTCustomAuthorizerResult } from 'aws-lambda';

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

declare const mockPubSub: () => vitest.Mock;

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

declare const getPubSubTopic: <N extends string>(name: N) => `app/pubsub/${N}`;

type PublishOptions = {
    qos?: QoS;
};
declare const PubSub: {
    publish(topic: string, event: string, payload: unknown, opts?: PublishOptions): Promise<void>;
};
type PubsubAuthorizerResponse = {
    authorized: boolean;
    principalId?: string;
    publish?: string[];
    subscribe?: string[];
    disconnectAfter?: Duration;
    refreshAfter?: Duration;
};
type PubsubAuthorizerEvent = {
    protocolData: {
        mqtt?: {
            password?: string;
        };
    };
};
declare const pubsubAuthorizerHandle: (cb: (token: string) => PubsubAuthorizerResponse | Promise<PubsubAuthorizerResponse>) => Promise<(event: PubsubAuthorizerEvent) => Promise<IoTCustomAuthorizerResult>>;
declare const pubsubAuthorizerResponse: (props: PubsubAuthorizerResponse) => IoTCustomAuthorizerResult;

declare const getQueueName: <N extends string, S extends string = "stack">(resourceName: N, stackName?: S) => `app--${S}--queue--${N}`;
declare const getQueueUrl: (name: string, stack?: string) => string | undefined;
interface QueueResources {
}
declare const Queue: QueueResources;

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

declare const getSiteBucketName: <N extends string, S extends string = "stack">(resourceName: N, stackName?: S) => `app--${S}--site--${N}--app-id`;

declare const getStoreName: <N extends string, S extends string = "stack">(resourceName: N, stackName?: S) => `app--${S}--store--${N}--app-id`;
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
declare const STACK: "stack";

export { APP, Alert, type AlertMock, type AlertMockResponse, type AlertResources, Auth, type AuthResources, Cache, type CacheResources, Config, type ConfigResources, Cron, type CronResources, Fn, type FunctionMock, type FunctionMockResponse, type FunctionResources, Job, type JobMock, type JobMockResponse, type JobResources, Metric, type MetricResources, PubSub, type PublishOptions, Queue, type QueueMock, type QueueMockResponse, type QueueResources, type RpcAuthorizerResponse, STACK, Search, type SearchResources, Store, type StoreResources, Table, type TableResources, Task, type TaskMock, type TaskMockResponse, type TaskResources, Topic, type TopicMock, type TopicMockResponse, type TopicResources, getAlertName, getAuthProps, getCacheProps, getConfigName, getConfigValue, getCronName, getFunctionName, getJobName, getMetricName, getMetricNamespace, getPubSubTopic, getQueueName, getQueueUrl, getSearchName, getSearchProps, getSiteBucketName, getStoreName, getTableName, getTaskName, getTopicName, mockAlert, mockCache, mockFunction, mockJob, mockMetric, mockPubSub, mockQueue, mockTask, mockTopic, onErrorLogSchema, onFailureBucketArn, onFailureBucketName, onFailureQueueArn, onFailureQueueName, pubsubAuthorizerHandle, pubsubAuthorizerResponse, setConfigValue };
