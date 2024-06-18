import { LambdaClient } from '@aws-sdk/client-lambda';
export { LambdaClient } from '@aws-sdk/client-lambda';
import { Context as Context$1 } from 'aws-lambda';
export { Context as LambdaContext } from 'aws-lambda';
import { AsyncReturnType, Jsonify } from 'type-fest';
import { SchemaIssues, Input as Input$1, BaseSchema, Output as Output$1 } from '@awsless/validate';
import { Mock } from 'vitest';

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

declare class TimeoutError extends Error {
    constructor(remainingTime: number);
}

declare class ViewableError extends Error {
    readonly type: string;
    readonly data?: unknown;
    readonly name = "ViewableError";
    constructor(type: string, message: string, data?: unknown);
}
interface ViewableErrorData {
    type: string;
    message: string;
    data?: unknown;
}
declare const isViewableErrorType: (error: unknown, type: string) => boolean;
declare const isViewableError: (error: unknown) => error is ViewableError;
declare const isViewableErrorString: (value: string) => boolean;
declare const parseViewableErrorString: (value: string) => ViewableErrorData;
declare const getViewableErrorData: (error: ViewableError) => ViewableErrorData;

declare class ValidationError extends ViewableError {
    constructor(issues: SchemaIssues);
}

declare const lambdaClient: {
    (): LambdaClient;
    set(client: LambdaClient): void;
};

type Lambdas = {
    [key: string]: (payload: any) => unknown;
};
declare const mockLambda: <T extends Lambdas>(lambdas: T) => { [P in keyof T]: Mock<any, (...args: any[]) => any>; };

type Schema = BaseSchema | undefined;
type Input<T extends Schema = undefined> = T extends undefined ? unknown : Input$1<RemoveUndefined<T>>;
type Output<T extends Schema = undefined> = T extends undefined ? unknown : Output$1<RemoveUndefined<T>>;
type RemoveUndefined<T> = T extends undefined ? never : T;
type Context = Context$1 & {
    readonly event: unknown;
    readonly log: Logger;
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
    <H extends Handler>(options: Options<H, undefined>): (event?: unknown, context?: Context$1) => Promise<Response<Awaited<ReturnType<H>>>>;
    <H extends Handler<S>, S extends Schema>(options: Options<H, S>): (event: Input<S>, context?: Context$1) => Promise<Response<Awaited<ReturnType<H>>>>;
};
type Response<T> = unknown extends T ? unknown : void extends T ? void : T extends undefined ? Jsonify<T> | undefined : Jsonify<T>;
type LambdaFunction<H extends Handler<S>, S extends Schema = undefined> = S extends undefined ? (event?: unknown, context?: Context$1) => Promise<Response<Awaited<ReturnType<H>>>> : (event: Input<S>, context?: Context$1) => Promise<Response<Awaited<ReturnType<H>>>>;
/** Create a lambda handle function. */
declare const lambda: LambdaFactory;

export { Context, ExtraMetaData, Handler, Input, Invoke, InvokeOptions, InvokeResponse, LambdaFunction, Logger, Loggers, TimeoutError, ValidationError, ViewableError, getViewableErrorData, invoke, isViewableError, isViewableErrorString, isViewableErrorType, lambda, lambdaClient, mockLambda, parseViewableErrorString };
