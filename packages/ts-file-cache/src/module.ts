import { stat } from 'fs/promises'
import { basename, extname, isAbsolute, join } from 'path'

const findFile = async (files: string[]) => {
	for (const file of files) {
		try {
			const s = await stat(file)
			if (s.isFile()) {
				return file
			}
		} catch {
			continue
		}
	}

	throw new Error(`No such file: ${files.join(', ')}`)
}

// TypeScript sources import their compiled javascript file names,
// so each javascript extension maps to its typescript counterparts.
const alternateExtensions: Record<string, string[]> = {
	'.js': ['.ts', '.tsx'],
	'.mjs': ['.mts'],
	'.cjs': ['.cts'],
	'.jsx': ['.tsx'],
}

export const resolveModuleImportFile = (file: string, allowedExtensions: string[]) => {
	const extension = extname(file)
	const alternates = alternateExtensions[extension]

	if (alternates) {
		const candidates = [file]

		for (const alternate of alternates) {
			if (allowedExtensions.includes(alternate.substring(1))) {
				candidates.push(file.substring(0, file.length - extension.length) + alternate)
			}
		}

		return findFile(candidates)
	}

	if (!basename(file).includes('.')) {
		return findFile([
			file,
			...allowedExtensions.map(ext => `${file}.${ext}`),
			...allowedExtensions.map(ext => join(file, `index.${ext}`)),
		])
	}

	return file
}

export const isLocalCodeFile = (file: string) => {
	return file.startsWith('/') || file.startsWith('.')
}

export const toAbsolute = (file: string) => {
	if (isAbsolute(file)) {
		return file
	}

	return join(process.cwd(), file)
}
