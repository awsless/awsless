import jsonPatch from 'fast-json-patch'
import { z } from 'zod'
import { FileError } from '../error.js'

const AddOperationSchema = z
	.object({
		op: z.literal('add'),
		path: z.string(),
		value: z.unknown(),
	})
	.strict()

const RemoveOperationSchema = z
	.object({
		op: z.literal('remove'),
		path: z.string(),
	})
	.strict()

const ReplaceOperationSchema = z
	.object({
		op: z.literal('replace'),
		path: z.string(),
		value: z.unknown(),
	})
	.strict()

const MoveOperationSchema = z
	.object({
		op: z.literal('move'),
		from: z.string(),
		path: z.string(),
	})
	.strict()

const CopyOperationSchema = z
	.object({
		op: z.literal('copy'),
		from: z.string(),
		path: z.string(),
	})
	.strict()

const TestOperationSchema = z
	.object({
		op: z.literal('test'),
		path: z.string(),
		value: z.unknown(),
	})
	.strict()

export const JsonPatchOperationSchema = z.discriminatedUnion('op', [
	AddOperationSchema,
	RemoveOperationSchema,
	ReplaceOperationSchema,
	MoveOperationSchema,
	CopyOperationSchema,
	TestOperationSchema,
])

export const StagePatchSchema = z
	.object({
		$schema: z.string().optional(),
		operations: JsonPatchOperationSchema.array(),
	})
	.strict()

export type JsonPatchOperation = z.infer<typeof JsonPatchOperationSchema>
export type StagePatchDocument = z.infer<typeof StagePatchSchema>

export const applyStagePatch = (source: unknown, patch: StagePatchDocument, file: string) => {
	try {
		const result = jsonPatch.applyPatch(structuredClone(source), patch.operations, true, false)
		return result.newDocument
	} catch (error) {
		if (error instanceof Error) {
			throw new FileError(file, error.message)
		}

		throw error
	}
}
