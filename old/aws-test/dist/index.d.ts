import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import * as vitest_dist_index_5aad25c1 from 'vitest/dist/index-5aad25c1';

type SeedData = {
    [key: string]: object[];
};

declare class DynamoDBServer {
    private region;
    private client;
    private documentClient;
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

type Lambdas$1 = {
    [key: string]: (payload: any) => any;
};
declare const mockLambda: <T extends Lambdas$1>(lambdas: T) => { [P in keyof T]: vitest_dist_index_5aad25c1.x<any, (...args: any[]) => any>; };

declare const mockIoT: () => vitest_dist_index_5aad25c1.x<any[], any>;

type Lambdas = {
    [key: string]: (payload: any) => any;
};
declare const mockScheduler: <T extends Lambdas>(lambdas: T) => { [P in keyof T]: vitest_dist_index_5aad25c1.x<any, (...args: any[]) => any>; };

type Topics = {
    [key: string]: (payload: any) => any;
};
declare const mockSNS: <T extends Topics>(topics: T) => { [P in keyof T]: vitest_dist_index_5aad25c1.x<any, (...args: any[]) => any>; };

type Queues = {
    [key: string]: (payload: any) => any;
};
declare const mockSQS: <T extends Queues>(queues: T) => { [P in keyof T]: vitest_dist_index_5aad25c1.x<any, (...args: any[]) => any>; };

declare const mockSSM: (values: Record<string, string>) => void;

declare const mockSES: () => vitest_dist_index_5aad25c1.x<any[], any>;

export { DynamoDBServer, mockDynamoDB, mockIoT, mockLambda, mockSES, mockSNS, mockSQS, mockSSM, mockScheduler, startDynamoDB };
