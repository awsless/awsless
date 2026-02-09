import * as _aws_sdk_client_lambda from '@aws-sdk/client-lambda';
import { LambdaClient, ListFunctionsCommandInput } from '@aws-sdk/client-lambda';
export { LambdaClient } from '@aws-sdk/client-lambda';
import { Context as Context$1 } from 'aws-lambda';
export { Context as LambdaContext } from 'aws-lambda';
import { AsyncReturnType } from 'type-fest';
import { Mock } from 'vitest';
import { GenericSchema, InferOutput, InferInput } from '@awsless/validate';

type InvokeOptions = {
    client?: LambdaClient;
    type?: 'RequestResponse' | 'Event' | 'DryRun';
    name: string;
    qualifier?: string;
    payload?: unknown;
    reflectViewableErrors?: boolean;
};
type UnknownInvokeOptions = InvokeOptions & {
    payload?: unknown;
};
type KnownInvokeOptions<Lambda extends LambdaFunction$1> = unknown extends Parameters<Lambda>[0] ? InvokeOptions & {
    payload?: unknown;
} : InvokeOptions & {
    payload: Parameters<Lambda>[0];
};
type InvokeResponse<Lambda extends LambdaFunction$1> = Promise<AsyncReturnType<Lambda>>;
type LambdaFunction$1 = (event?: any, context?: Context$1) => Promise<unknown>;
type Invoke = {
    ({ client, name, qualifier, type, payload, reflectViewableErrors }: UnknownInvokeOptions): Promise<unknown>;
    <Lambda extends LambdaFunction$1>({ client, name, qualifier, type, payload, reflectViewableErrors, }: KnownInvokeOptions<Lambda>): InvokeResponse<Lambda>;
};

/** Invoke lambda function */
declare const invoke: Invoke;

declare const listFunctions: ({ client, ...params }: ListFunctionsCommandInput & {
    client?: LambdaClient;
}) => Promise<_aws_sdk_client_lambda.ListFunctionsCommandOutput | undefined>;

declare class TimeoutError extends Error {
    constructor(remainingTime: number);
}

declare class ExpectedError extends Error {
    readonly type: string;
    constructor(type: string, message: string);
}

declare class ValidationError extends ExpectedError {
    constructor(message: string);
}

declare class ViewableError extends Error {
    readonly type: string;
    readonly data?: unknown | undefined;
    readonly name = "ViewableError";
    constructor(type: string, message: string, data?: unknown | undefined);
}

type ErrorResponse = {
    __error__: {
        type: string;
        message: string;
    };
};
declare const isErrorResponse: (response: unknown) => response is ErrorResponse;
declare const toErrorResponse: (error: Error & {
    type: string;
}) => ErrorResponse;

declare const lambdaClient: {
    (): LambdaClient;
    set(client: LambdaClient): void;
};

type Lambdas = {
    [key: string]: (payload: any) => unknown;
};
declare const mockLambda: <T extends Lambdas>(lambdas: T) => { [P in keyof T]: Mock<any, (...args: any[]) => any>; };

type Schema = GenericSchema | undefined;
type Input<T extends Schema = undefined> = T extends undefined ? unknown : InferInput<RemoveUndefined<T>>;
type Output<T extends Schema = undefined> = T extends undefined ? unknown : InferOutput<RemoveUndefined<T>>;
type RemoveUndefined<T> = T extends undefined ? never : T;
type Context = {
    readonly raw: unknown;
    readonly event: unknown;
    readonly context?: Context$1;
    readonly log: Logger;
    readonly onSuccess: (cb: (res: unknown) => void) => void;
    readonly onFailure: (cb: (err: unknown) => void) => void;
    readonly onFinally: (cb: () => void) => void;
};
type Handler<S extends Schema = undefined, R = unknown> = (event: Output<S>, context: Context) => R;
type Logger = (error: Error, metaData?: ExtraMetaData) => Promise<void>;
type Loggers = Array<Logger | Loggers> | Logger;
type ExtraMetaData = Record<string, unknown | Record<string, unknown>>;

interface Options<H extends Handler<S>, S extends Schema = undefined> {
    /** A validation struct to validate the input. */
    schema?: S;
    /** Array of middleware functions. */
    handle: H;
    /** Array of logging functions that are called when an error is thrown. */
    logger?: Loggers;
    /** Boolean to specify if viewable errors should be logged.
     * @default false
     */
    logViewableErrors?: boolean;
}
type LambdaFactory = {
    <H extends Handler>(options: Options<H, undefined>): (event?: unknown, context?: Context$1) => Promise<Awaited<ReturnType<H>>>;
    <H extends Handler<S>, S extends Schema>(options: Options<H, S>): (event: Input<S>, context?: Context$1) => Promise<Awaited<ReturnType<H>>>;
};
type LambdaFunction<H extends Handler<S>, S extends Schema = undefined> = S extends undefined ? (event?: unknown, context?: Context$1) => Promise<Awaited<ReturnType<H>>> : (event: Input<S>, context?: Context$1) => Promise<Awaited<ReturnType<H>>>;
/** Create a lambda handle function. */
declare const lambda: LambdaFactory;

export { type Context, type ErrorResponse, ExpectedError, type ExtraMetaData, type Handler, type Input, type Invoke, type InvokeOptions, type InvokeResponse, type LambdaFactory, type LambdaFunction, type Logger, type Loggers, TimeoutError, ValidationError, ViewableError, invoke, isErrorResponse, lambda, lambdaClient, listFunctions, mockLambda, toErrorResponse };
