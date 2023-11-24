import { stat } from 'fs/promises'
import { z } from 'zod'

export const LocalDirectorySchema = z.string().refine(async path => {
	// check if the path is a directory...
	try {
		const s = await stat(path)
		return s.isDirectory()
	} catch (error) {
		return false
	}
}, `Directory doesn't exist`)
