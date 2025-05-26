import { stat } from 'fs/promises'
import { z } from 'zod'
import { RelativePathSchema } from './relative-path.js'

export const LocalEntrySchema = z.union([
	RelativePathSchema.refine(async path => {
		// check if the path is a directory...
		try {
			const s = await stat(path)
			return s.isFile() || s.isDirectory()
		} catch (error) {
			return false
		}
	}, `File or directory doesn't exist`),
	z
		.object({
			nocheck: z
				.string()
				.describe('Specifies a local file or directory without checking if the file or directory exists.'),
		})
		.transform(v => v.nocheck),
])
