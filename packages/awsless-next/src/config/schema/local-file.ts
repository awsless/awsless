import { stat } from 'fs/promises'
import { z } from 'zod'
import { RelativePathSchema } from './relative-path.js'

export const LocalFileSchema = z.union([
	RelativePathSchema.refine(async path => {
		// check if the path is a file...
		try {
			const s = await stat(path)
			return s.isFile()
		} catch (error) {
			return false
		}
	}, `File doesn't exist`),
	z
		.object({
			nocheck: z.string().describe('Specifies a local file without checking if the file exists.'),
		})
		.transform(v => v.nocheck),
])
