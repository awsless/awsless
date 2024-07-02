import { stat } from 'fs/promises'
import { basename, join } from 'path'

// const readFiles = async (files: string[]) => {
// 	for (const file of files) {
// 		try {
// 			const s = await stat(file)
// 			if (s.isFile()) {
// 				return readFile(file, 'utf8')
// 			}
// 		} catch (_) {
// 			continue
// 		}
// 	}

// 	throw new Error(`No such file: ${files.join(', ')}`)
// }

const findFile = async (files: string[]) => {
	for (const file of files) {
		try {
			const s = await stat(file)
			if (s.isFile()) {
				return file
			}
		} catch (_) {
			continue
		}
	}

	throw new Error(`No such file: ${files.join(', ')}`)
}

export const resolveModuleImportFile = (file: string, allowedExtensions: string[]) => {
	if (file.endsWith('.js') && allowedExtensions.includes('js') && allowedExtensions.includes('ts')) {
		return findFile([file, file.substring(0, file.length - 3) + '.ts'])
	}

	if (!basename(file).includes('.')) {
		return findFile([
			file,
			...allowedExtensions.map(exp => `${file}.${exp}`),
			...allowedExtensions.map(exp => join(file, `/index.${exp}`)),
		])
	}

	return file
}

export const isLocalCodeFile = (file: string) => {
	return file.startsWith('/') || file.startsWith('.')
}

// export const readModuleFile = (file: string, allowedExtensions: string[]) => {
// 	if (file.endsWith('.js')) {
// 		return readFiles([file, file.substring(0, file.length - 3) + '.ts'])
// 	}

// 	if (!basename(file).includes('.')) {
// 		return readFiles([
// 			file,
// 			...allowedExtensions.map(exp => `${file}.${exp}`),
// 			...allowedExtensions.map(exp => join(file, `/index.${exp}`)),
// 		])
// 	}

// 	return readFile(file, 'utf8')
// }
