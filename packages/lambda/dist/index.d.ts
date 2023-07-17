import { Context as Context$1 } from 'aws-lambda';
import { Infer, Struct, Failure } from '@awsless/validate';
import { LambdaClient } from '@aws-sdk/client-lambda';
export { LambdaClient } from '@aws-sdk/client-lambda';
import { Jsonify, AsyncReturnType } from 'type-fest';
import { Mock } from 'vitest';

type OptStruct = Struct<any, unknown> | undefined;
type Input<T extends OptStruct = undefined> = T extends undefined ? unknown : Infer<RemoveUndefined<T>>;
type Output<T extends OptStruct = undefined> = T extends undefined ? unknown : Infer<RemoveUndefined<T>>;
type RemoveUndefined<T> = T extends undefined ? never : T;
type Context = Context$1 & {
    readonly event: unknown;
    readonly log: Logger;
};
type Response<O extends OptStruct = undefined> = Output<O> | Promise<Output<O>>;
type Handler<I extends OptStruct = undefined, O extends OptStruct = undefined> = (event: Input<I>, context: Context) => Response<O>;
type Logger = (error: Error, metaData?: ExtraMetaData) => Promise<void>;
type Loggers = Array<Logger | Loggers> | Logger;
type ExtraMetaData = Record<string, unknown | Record<string, unknown>>;

interface Options<H extends Handler<I, O>, I extends OptStruct = undefined, O extends OptStruct = undefined> {
    /** A validation struct to validate the input. */
    input?: I;
    /** A validation struct to validate the output. */
    output?: O;
    /** Array of middleware functions */
    handle: H;
    /** Array of logging functions that are called when an error is thrown */
    logger?: Loggers;
    /** Boolean to specify if viewable errors should be logged */
    logViewableErrors?: boolean;
}
type LambdaFactory = {
    <H extends Handler>(options: Options<H, undefined, undefined>): (event?: unknown, context?: Context$1) => Promise<ReturnType<H>>;
    <H extends Handler<I>, I extends OptStruct>(options: Options<H, I, undefined>): (event: Input<I>, context?: Context$1) => Promise<ReturnType<H>>;
    <H extends Handler<undefined, O>, O extends OptStruct>(options: Options<H, undefined, O>): (event?: unknown, context?: Context$1) => Promise<Output<O>>;
    <H extends Handler<I, O>, I extends OptStruct, O extends OptStruct>(options: Options<H, I, O>): (event: Input<I>, context?: Context$1) => Promise<Output<O>>;
};
/** Create a lambda handle function. */
declare const lambda: LambdaFactory;

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
    constructor(failures: Failure[]);
}

declare class TimeoutError extends Error {
    constructor(remainingTime: number);
}

interface InvokeOptions {
    client?: LambdaClient;
    type?: 'RequestResponse' | 'Event' | 'DryRun';
    name: string;
    qualifier?: string;
    payload?: unknown;
    reflectViewableErrors?: boolean;
}
interface UnknownInvokeOptions extends InvokeOptions {
    payload?: unknown;
}
interface KnownInvokeOptions<Lambda extends LambdaFunction> extends InvokeOptions {
    payload: Parameters<Lambda>[0];
}
type LambdaFunction = (event: any, context?: Context$1) => Promise<unknown>;
type Invoke = {
    ({ client, name, qualifier, type, payload, reflectViewableErrors }: UnknownInvokeOptions): Promise<unknown>;
    <Lambda extends LambdaFunction>({ client, name, qualifier, type, payload, reflectViewableErrors }: KnownInvokeOptions<Lambda>): Promise<Jsonify<AsyncReturnType<Lambda>>>;
};

/** Invoke lambda function */
declare const invoke: Invoke;

type Lambdas = {
    [key: string]: (payload: any) => unknown;
};
declare const mockLambda: <T extends Lambdas>(lambdas: T) => { [P in keyof T]: Mock<any, (...args: any[]) => any>; };

declare const lambdaClient: {
    (): LambdaClient;
    set(client: LambdaClient): void;
};

export { Context, ExtraMetaData, Handler, Input, Logger, Loggers, Output, Response, TimeoutError, ValidationError, ViewableError, getViewableErrorData, invoke, isViewableError, isViewableErrorString, isViewableErrorType, lambda, lambdaClient, mockLambda, parseViewableErrorString };
