import { stat } from 'fs/promises'
import { z } from 'zod'
import { directories } from '../../util/path.js'
import { join } from 'path'

let basePath: string | undefined

export const setLocalBasePath = (path: string) => {
	basePath = path
}

export const resolvePath = (path: string) => {
	if (path.startsWith('.') && basePath) {
		return join(basePath, path)
	}

	return join(directories.root, path)
}

export const LocalFileSchema = z
	.string()
	.transform(path => resolvePath(path))
	.refine(async path => {
		// check if the path is a file...
		try {
			const s = await stat(path)
			return s.isFile()
		} catch (error) {
			return false
		}
	}, `File doesn't exist`)
