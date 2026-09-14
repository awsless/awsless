import { readFile } from 'fs/promises'
import { join } from 'path'
import { glob } from 'glob'
import { findSvelteTranslatable } from './find/svelte'
import { findTypescriptTranslatable } from './find/typescript'
import { hasT, TOptions } from './t'

/** A source text and where it came from: `lang.t` code or `<T>` markup. */
export type Source = { source: string; kind: 't' | 'markup'; sealed?: number[] }

/** A lang.t template: its cache key and the range of the whole tagged call. */
export type Tagged = { start: number; end: number; source: string }

// The start scan & the hot update skip the same folders, so a save can't
// translate a file the next start would then clean up again.
export const isIgnoredPath = (file: string) => /[\\/](node_modules|\.[^\\/]+)[\\/]/.test(file)

export const findTranslatable = async (cwd: string, options: TOptions = {}) => {
	const files = await glob('**/*.{js,ts,svelte}', {
		cwd,
		ignore: [
			//
			'**/node_modules/**',
			'**/.*/**',
		],
	})

	const found: Source[] = []

	for (const file of files) {
		found.push(...(await findTranslatableInCode(file, await readFile(join(cwd, file), 'utf8'), options)))
	}

	return found
}

export const findTranslatableInCode = async (file: string, code: string, options: TOptions = {}): Promise<Source[]> => {
	const svelte = file.endsWith('.svelte')

	if (!code.includes('lang.t`') && !(svelte && hasT(code))) {
		return []
	}

	return svelte ? findSvelteTranslatable(code, file, options) : findTypescriptTranslatable(code)
}
