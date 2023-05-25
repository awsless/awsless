import { SSMClient } from '@aws-sdk/client-ssm';
export { SSMClient } from '@aws-sdk/client-ssm';
import { Mock } from 'vitest';

declare const ssmClient: {
    (): SSMClient;
    set(client: SSMClient): void;
};

type Paths = Record<string, string | Transformer>;
type Options = {
    client?: SSMClient;
    ttl?: number;
};
type Transformer = {
    path: string;
    transform: (value: string) => unknown;
};
type Output<T> = {
    [key in keyof T]: T[key] extends Transformer ? ReturnType<T[key]['transform']> : string;
};

/** Fetch the provided ssm paths */
declare const ssm: <T extends Paths>(paths: T, { client, ttl }?: Options) => Promise<Output<T>>;

declare const string: (path: string) => string;
declare const float: (path: string) => {
    path: string;
    transform(value: string): number;
};
declare const integer: (path: string, radix?: number) => {
    path: string;
    transform(value: string): number;
};
declare const array: (path: string, seperator?: string) => {
    path: string;
    transform(value: string): string[];
};
declare const json: <T = unknown>(path: string) => {
    path: string;
    transform(value: string): T;
};

declare const mockSSM: (values: Record<string, string>) => Mock<any, any>;

export { Paths, array, float, integer, json, mockSSM, ssm, ssmClient, string };
