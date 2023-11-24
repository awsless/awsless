import { stat } from 'fs/promises'
import { z } from 'zod'

export const LocalFileSchema = z.string().refine(async path => {
	// check if the path is a file...
	try {
		const s = await stat(path)
		return s.isFile()
	} catch (error) {
		return false
	}
}, `File doesn't exist`)
