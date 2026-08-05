import { stat } from 'fs/promises'
import { RelativePathSchema } from './relative-path.js'

export const LocalDirectorySchema = RelativePathSchema.refine(async path => {
	// check if the path is a directory...
	try {
		const s = await stat(path)
		return s.isDirectory()
	} catch (error) {
		return false
	}
}, `Directory doesn't exist`)
