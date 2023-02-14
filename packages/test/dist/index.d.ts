import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Mock } from 'vitest';
import * as vitest_dist_index_5aad25c1 from 'vitest/dist/index-5aad25c1';

type SeedData = {
    [key: string]: object[];
};

declare class DynamoDBServer {
    private region;
    private client?;
    private documentClient?;
    private endpoint;
    private process;
    constructor(region?: string);
    listen(port: number): Promise<void>;
    /** Kill the DynamoDB server. */
    kill(): Promise<void>;
    /** Ping the DynamoDB server if its ready. */
    ping(): Promise<boolean>;
    /** Ping the DynamoDB server untill its ready. */
    wait(times?: number): Promise<void>;
    /** Migrate table's from a awsless dynamodb resource file. */
    migrate(path: string): Promise<void>;
    /** Seed data. */
    seed(data: SeedData): Promise<void>;
    /** Get DynamoDBClient connected to dynamodb local. */
    getClient(): DynamoDBClient;
    /** Get DynamoDBDocumentClient connected to dynamodb local. */
    getDocumentClient(): DynamoDBDocumentClient;
}

interface StartDynamoDBOptions {
    path: string;
    timeout?: number;
    port?: number;
    seed?: SeedData;
}
declare const startDynamoDB: ({ path, timeout, seed }: StartDynamoDBOptions) => DynamoDBServer;

declare const mockDynamoDB: (configOrServer: StartDynamoDBOptions | DynamoDBServer) => DynamoDBServer;

type Func = (...args: unknown[]) => unknown;
type Result<T extends string | number | symbol> = Record<T, Mock<any, Func>>;

type Lambdas$1 = {
    [key: string]: (payload: any) => any;
};
declare const mockLambda: <T extends Lambdas$1>(lambdas: T) => Result<keyof T>;

declare const mockIoT: (fn?: Func) => vitest_dist_index_5aad25c1.x<any, any>;

type Lambdas = {
    [key: string]: (payload: any) => any;
};
declare const mockScheduler: <T extends Lambdas>(lambdas: T) => Result<keyof T>;

type Topics = {
    [key: string]: (payload: unknown) => unknown;
};
declare const mockSNS: <T extends Topics>(topics: T) => Result<keyof T>;

type Queues = {
    [key: string]: (payload: any) => any;
};
declare const mockSQS: <T extends Queues>(queues: T) => Result<keyof T>;

declare const mockSSM: (values: Record<string, string>) => vitest_dist_index_5aad25c1.x<any, any>;

declare const mockSES: (fn?: Func) => vitest_dist_index_5aad25c1.x<any, any>;

export { DynamoDBServer, mockDynamoDB, mockIoT, mockLambda, mockSES, mockSNS, mockSQS, mockSSM, mockScheduler, startDynamoDB };
