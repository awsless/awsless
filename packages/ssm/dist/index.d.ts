import * as _aws_sdk_client_ssm from '@aws-sdk/client-ssm';
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
type PutParameter = {
    client?: SSMClient;
    name: string;
    value: string;
    type?: 'String' | 'StringList' | 'SecureString';
};

/** Fetch the provided ssm paths */
declare const ssm: <T extends Paths>(paths: T, { client, ttl }?: Options) => Promise<Output<T>>;

declare const putParameter: ({ client, name, value, type }: PutParameter) => Promise<_aws_sdk_client_ssm.PutParameterCommandOutput>;

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

export { Paths, array, float, integer, json, mockSSM, putParameter, ssm, ssmClient, string };
