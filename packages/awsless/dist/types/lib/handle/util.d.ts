import { Handler } from '@awsless/lambda';
import { GenericSchema } from '@awsless/validate';
export declare const consumer: <S extends GenericSchema | undefined, H extends Handler<S>>(schema: S, handle: H) => (event: import("@awsless/lambda").Input<S>, context?: import("aws-lambda").Context) => Promise<Awaited<ReturnType<H>>>;
