import { LambdaClient, LambdaClient as LambdaClient$1, ListFunctionsCommandInput } from "@aws-sdk/client-lambda";
import { GenericSchema, InferInput, InferOutput } from "@awsless/validate";
import { Context as Context$1, Context as LambdaContext } from "aws-lambda";
import { AsyncReturnType } from "type-fest";
//#region src/errors/enhanced.d.ts
type RoutedLambdaContext = LambdaContext & {
  route?: string;
};
//#endregion
//#region src/commands/type.d.ts
type InvokeOptions = {
  client?: LambdaClient$1;
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
  <Lambda extends LambdaFunction$1>({ client, name, qualifier, type, payload, reflectViewableErrors }: KnownInvokeOptions<Lambda>): InvokeResponse<Lambda>;
};
//#endregion
//#region src/commands/invoke.d.ts
/** Invoke lambda function */
declare const invoke: Invoke;
//#endregion
//#region src/commands/list-functions.d.ts
declare const listFunctions: ({ client, ...params }: ListFunctionsCommandInput & {
  client?: LambdaClient$1;
}) => Promise<import("@aws-sdk/client-lambda").ListFunctionsCommandOutput | undefined>;
//#endregion
//#region src/errors/timeout.d.ts
declare class TimeoutError extends Error {
  constructor(remainingTime: number);
}
//#endregion
//#region src/errors/expected.d.ts
declare class ExpectedError extends Error {
  readonly type: string;
  constructor(type: string, message: string);
}
//#endregion
//#region src/errors/validation.d.ts
declare class ValidationError extends ExpectedError {
  constructor(message: string);
}
//#endregion
//#region src/type.d.ts
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
//#endregion
//#region src/context/lambda-context.d.ts
declare const getContext: () => Context;
//#endregion
//#region src/errors/viewable.d.ts
declare class ViewableError extends Error {
  readonly type: string;
  readonly data?: unknown;
  readonly name = "ViewableError";
  constructor(type: string, message: string, data?: unknown);
}
//#endregion
//#region src/errors/response.d.ts
type ErrorResponse = {
  __error__: {
    type: string;
    message: string;
    data?: unknown;
  };
};
declare const isErrorResponse: (response: unknown) => response is ErrorResponse;
declare const toErrorResponse: (error: Error & {
  type: string;
  data?: unknown;
}) => ErrorResponse;
//#endregion
//#region src/helpers/client.d.ts
declare const lambdaClient: {
  (): LambdaClient$1;
  set(client: LambdaClient$1): void;
};
//#endregion
//#region src/helpers/mock.d.ts
type Lambdas = {
  [key: string]: (payload: any) => unknown;
};
declare const mockLambda: <T extends Lambdas>(lambdas: T) => { [P in keyof T]: any; };
//#endregion
//#region src/lambda.d.ts
interface Options<H extends Handler<S>, S extends Schema = undefined> {
  /** A validation struct to validate the input. */
  schema?: S;
  /** Array of middleware functions. */
  handle: H;
  /** Array of logging functions that are called when an error is thrown. */
  logger?: Loggers;
  /** Boolean to specify if expected errors should be thrown and logged.
   * @default false
   */
  throwExpectedErrors?: boolean;
}
type LambdaFactory = {
  <H extends Handler>(options: Options<H, undefined>): (event?: unknown, context?: Context$1) => Promise<Awaited<ReturnType<H>>>;
  <H extends Handler<S>, S extends Schema>(options: Options<H, S>): (event: Input<S>, context?: Context$1) => Promise<Awaited<ReturnType<H>>>;
};
type LambdaFunction<H extends Handler<S>, S extends Schema = undefined> = S extends undefined ? (event?: unknown, context?: Context$1) => Promise<Awaited<ReturnType<H>>> : (event: Input<S>, context?: Context$1) => Promise<Awaited<ReturnType<H>>>;
/** Create a lambda handle function. */
declare const lambda: LambdaFactory;
//#endregion
export { type Context, type ErrorResponse, ExpectedError, type ExtraMetaData, type Handler, type Input, type Invoke, type InvokeOptions, type InvokeResponse, LambdaClient, type LambdaContext, type LambdaFactory, type LambdaFunction, type Logger, type Loggers, type RoutedLambdaContext, TimeoutError, ValidationError, ViewableError, getContext, invoke, isErrorResponse, lambda, lambdaClient, listFunctions, mockLambda, toErrorResponse };