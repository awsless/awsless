import { Handler } from '@awsless/lambda';
import { GenericSchema, InferOutput, SnsTopicSchema } from '@awsless/validate';
import { consumer } from './util.js';
export type SubscribeEvent<S extends {
    readonly schema: GenericSchema;
} | GenericSchema> = InferOutput<S extends {
    readonly schema: infer T extends GenericSchema;
} ? T : S extends GenericSchema ? S : never>;
export declare function subscribe<D extends {
    readonly name: string;
    readonly schema: GenericSchema;
}, H extends Handler<SnsTopicSchema<D['schema']>>>(topic: D, handle: H): ReturnType<typeof consumer>;
export declare function subscribe<S extends GenericSchema, H extends Handler<SnsTopicSchema<S>>>(schema: S, handle: H): ReturnType<typeof consumer>;
