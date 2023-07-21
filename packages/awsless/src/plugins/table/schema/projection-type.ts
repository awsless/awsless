import { ProjectionType } from "aws-cdk-lib/aws-dynamodb"
import { z } from "zod"
import { KeySchema } from './key.js'

const types = {
	'all': ProjectionType.ALL,
	'keys-only': ProjectionType.KEYS_ONLY,
}

export const ProjectionTypeSchema = z.union([
	z.enum(Object.keys(types) as [ keyof typeof types ]).transform((value) => ({
		ProjectionType: types[value]
	})),
	z.array(KeySchema).min(0).max(20).transform((keys) => ({
		ProjectionType: ProjectionType.INCLUDE,
		NonKeyAttributes: keys,
	})),
])
