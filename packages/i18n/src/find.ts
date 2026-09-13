import { readFile } from 'fs/promises'
import { join } from 'path'
import { glob } from 'glob'
import { findSvelteTranslatable } from './find/svelte'
import { findTypescriptTranslatable } from './find/typescript'

// The start scan & the hot update skip the same folders, so a save can't
// translate a file the next start would then clean up again.
export const isIgnoredPath = (file: string) => /[\\/](node_modules|\.[^\\/]+)[\\/]/.test(file)

export const findTranslatable = async (cwd: string) => {
	const files = await glob('**/*.{js,ts,svelte}', {
		cwd,
		ignore: [
			//
			'**/node_modules/**',
			'**/.*/**',
		],
	})

	const found: string[] = []

	for (const file of files) {
		found.push(...(await findTranslatableInCode(file, await readFile(join(cwd, file), 'utf8'))))
	}

	return found
}

export const findTranslatableInCode = async (file: string, code: string) => {
	if (!code.includes('lang.t`')) {
		return []
	}

	return file.endsWith('.svelte') ? findSvelteTranslatable(code) : findTypescriptTranslatable(code)
}
