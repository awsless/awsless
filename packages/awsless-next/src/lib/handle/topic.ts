import { Handler } from '@awsless/lambda'
import { GenericSchema, InferOutput, SnsTopicSchema, snsTopic } from '@awsless/validate'
import { TopicDefinition } from '../server/topic.js'
import { consumer } from './util.js'

// The parsed message a subscriber receives, from either a defined
// topic or a plain payload schema.
export type SubscribeEvent<S extends { readonly schema: GenericSchema } | GenericSchema> = InferOutput<
	S extends { readonly schema: infer T extends GenericSchema } ? T : S extends GenericSchema ? S : never
>

// The handler receives the parsed message - SNS always delivers a
// single record per invocation. The first argument is either a defined
// topic (which carries its schema) or a plain payload schema.
//
// The constraint only checks the carried name & schema, since the
// publisher call signature itself never matches a generic one.
export function subscribe<
	D extends { readonly name: string; readonly schema: GenericSchema },
	H extends Handler<SnsTopicSchema<D['schema']>>,
>(topic: D, handle: H): ReturnType<typeof consumer>
export function subscribe<S extends GenericSchema, H extends Handler<SnsTopicSchema<S>>>(
	schema: S,
	handle: H
): ReturnType<typeof consumer>
export function subscribe(source: TopicDefinition | GenericSchema, handle: Handler<GenericSchema>) {
	const schema = typeof source === 'function' ? source.schema : source

	return consumer(snsTopic(schema), handle)
}
