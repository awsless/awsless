import { Handler, LambdaContext, LambdaFunction } from '@awsless/lambda';
import { GenericSchema } from '@awsless/validate';
type HandlerContext = Parameters<Handler>[1];
type SchemalessEntry<E, R> = [unknown] extends [E] ? (event?: E, context?: LambdaContext) => Promise<Awaited<R>> : undefined extends E ? (event?: E, context?: LambdaContext) => Promise<Awaited<R>> : (event: E, context?: LambdaContext) => Promise<Awaited<R>>;
export declare function func<E, R>(handle: (event: E, context: HandlerContext) => R): SchemalessEntry<E, R>;
export declare function func<S extends GenericSchema, H extends Handler<S>>(schema: S, handle: H): LambdaFunction<H, S>;
export declare const task: typeof func;
export declare const cron: typeof func;
export {};
