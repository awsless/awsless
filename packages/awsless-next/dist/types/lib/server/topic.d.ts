import { PublishOptions } from '@awsless/sns';
import { GenericSchema, InferInput } from '@awsless/validate';
export declare const getTopicName: <N extends string>(resourceName: N) => `app--topic--${N}`;
type PublishTopicOptions = Omit<PublishOptions, 'topic' | 'payload'>;
export type TopicDefinition<S extends GenericSchema = GenericSchema> = {
    (payload: InferInput<S>, options?: PublishTopicOptions): Promise<void>;
    readonly name: string;
    readonly schema: S;
};
export interface TopicResources {
}
export declare const Topic: TopicResources;
export {};
