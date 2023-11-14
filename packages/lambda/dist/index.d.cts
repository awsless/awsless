import { Context as Context$1 } from 'aws-lambda';
export { Context as LambdaContext } from 'aws-lambda';
import { Input as Input$1, BaseSchema, Output as Output$1, Issues } from '@awsless/validate';
import { LambdaClient } from '@aws-sdk/client-lambda';
export { LambdaClient } from '@aws-sdk/client-lambda';
import { Jsonify, AsyncReturnType } from 'type-fest';
import { Mock } from 'vitest';

type Schema = BaseSchema | undefined;
type Input<T extends Schema = undefined> = T extends undefined ? unknown : Input$1<RemoveUndefined<T>>;
type Output<T extends Schema = undefined> = T extends undefined ? unknown : Output$1<RemoveUndefined<T>>;
type RemoveUndefined<T> = T extends undefined ? never : T;
type Context = Context$1 & {
    readonly event: unknown;
    readonly log: Logger;
};
type Handler<S extends Schema = undefined> = (event: Output<S>, context: Context) => unknown;
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
    <H extends Handler>(options: Options<H, undefined>): (event?: unknown, context?: Context$1) => Promise<ReturnType<H>>;
    <H extends Handler<S>, S extends Schema>(options: Options<H, S>): (event: Input<S>, context?: Context$1) => Promise<ReturnType<H>>;
};
type LambdaFunction$1<H extends Handler<S>, S extends Schema = undefined> = (event: Input<S>, context?: Context$1) => Promise<ReturnType<H>>;
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
    constructor(issues: Issues);
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
type InvokeResponse<Lambda extends LambdaFunction> = Promise<Jsonify<AsyncReturnType<Lambda>>>;
type LambdaFunction = (event: any, context?: Context$1) => Promise<unknown>;
type Invoke = {
    ({ client, name, qualifier, type, payload, reflectViewableErrors }: UnknownInvokeOptions): Promise<unknown>;
    <Lambda extends LambdaFunction>({ client, name, qualifier, type, payload, reflectViewableErrors, }: KnownInvokeOptions<Lambda>): InvokeResponse<Lambda>;
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

export { Context, ExtraMetaData, Handler, Input, Invoke, InvokeOptions, InvokeResponse, LambdaFunction$1 as LambdaFunction, Logger, Loggers, TimeoutError, ValidationError, ViewableError, getViewableErrorData, invoke, isViewableError, isViewableErrorString, isViewableErrorType, lambda, lambdaClient, mockLambda, parseViewableErrorString };
