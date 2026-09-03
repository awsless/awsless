import { Handler } from '@awsless/lambda';
import { GenericSchema } from '@awsless/validate';
export declare const consumer: <S extends GenericSchema | undefined, H extends Handler<S>>(schema: S, handle: H) => (event: import("@awsless/lambda").Input<S>, context?: import("@awsless/lambda").LambdaContext) => Promise<Awaited<ReturnType<H>>>;
