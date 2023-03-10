
import { AnyTableDefinition } from "../table"

type WalkPath<Object, Path extends Array<unknown>> = (
	Path extends [ infer Key extends keyof Object, ...infer Rest ]
	? WalkPath<Object[Key], Rest>
	: Object
)

export type InferPath<T extends AnyTableDefinition> = T['schema']['PATHS']

export type InferValue<T extends AnyTableDefinition, P extends T['schema']['PATHS']> = WalkPath<T['schema']['INPUT'], P>

export type InferOptionalPath<T extends AnyTableDefinition> = T['schema']['OPT_PATHS']
