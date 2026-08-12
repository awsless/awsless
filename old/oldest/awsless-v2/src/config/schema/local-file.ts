import { stat } from 'fs/promises'
import { RelativePathSchema } from './relative-path.js'

export const LocalFileSchema = RelativePathSchema.refine(async path => {
	// check if the path is a file...
	try {
		const s = await stat(path)
		return s.isFile()
	} catch (error) {
		return false
	}
}, `File doesn't exist`)
