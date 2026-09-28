import { readFile } from 'fs/promises'
import { join } from 'path'
import { glob } from 'glob'
import { Key } from './cache'
import { findSvelteTranslatable } from './find/svelte'
import { findTypescriptTranslatable } from './find/typescript'

// The start scan & the hot update skip the same folders, so a save can't
// translate a file the next start would then clean up again.
export const isIgnoredPath = (file: string) => /[\\/](node_modules|\.[^\\/]+)[\\/]/.test(file)

export type Translatable = Key

export const hasTemplates = (code: string) => code.includes('lang.t`')
export const hasComponents = (file: string, code: string) => file.endsWith('.svelte') && /<T[\s/>]/.test(code)

export const findTranslatable = async (cwd: string) => {
	const files = await glob('**/*.{js,ts,svelte}', {
		cwd,
		ignore: [
			//
			'**/node_modules/**',
			'**/.*/**',
		],
	})

	const found: Translatable[] = []

	for (const file of files) {
		found.push(...findTranslatableInCode(file, await readFile(join(cwd, file), 'utf8')))
	}

	return dedupe(found)
}

export const dedupe = (list: Translatable[]) => {
	const found = new Map<string, Translatable>()

	for (const item of list) {
		found.set(`${item.context ?? ''}\n${item.source}`, item)
	}

	return [...found.values()]
}

export const findTranslatableInCode = (file: string, code: string) => {
	if (!hasTemplates(code) && !hasComponents(file, code)) {
		return []
	}

	return file.endsWith('.svelte') ? findSvelteTranslatable(code) : findTypescriptTranslatable(code)
}
