import { stat } from 'fs/promises'
import { z } from 'zod'
import { RelativePathSchema } from './relative-path.js'

export const LocalDirectorySchema = z.union([
	RelativePathSchema.refine(async path => {
		// check if the path is a directory...
		try {
			const s = await stat(path)
			return s.isDirectory()
		} catch (error) {
			return false
		}
	}, `Directory doesn't exist`),
	z
		.object({
			nocheck: RelativePathSchema.describe(
				'Specifies a local directory without checking if the directory exists.'
			),
		})
		.transform(v => v.nocheck),
])
