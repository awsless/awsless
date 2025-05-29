import { join } from 'path'
import { z } from 'zod'
// import { directories } from '../../util/path.js'

let basePath: string | undefined

export const setLocalBasePath = (path: string) => {
	basePath = path
}

export const resolvePath = (path: string) => {
	if (path.startsWith('.') && basePath) {
		return join(basePath, path)
	}

	return path
}

export const RelativePathSchema = z.string().transform(path => resolvePath(path))
