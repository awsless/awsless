import { readFile } from 'fs/promises'
import { glob } from 'glob'
import { extname, join } from 'path'
import { findSvelteTranslatable } from './find/svelte'
import { findTypescriptTranslatable } from './find/typescript'

export const translatableRegex = /\$t\`([a-z0-9\s\$\{\}]+)\`/gim

export const findTranslatable = async (cwd: string) => {
	const files = await glob('**/*.{js,ts,svelte}', {
		cwd,
		ignore: [
			//
			'**/node_modules/**',
			'**/.svelte-kit/**',
			'**/.*/**',
		],
	})

	const found: string[] = []

	for (const file of files) {
		const code = await readFile(join(cwd, file), 'utf8')

		if (code.includes('$t`')) {
			if (extname(file) === '.svelte') {
				found.push(...findSvelteTranslatable(code))
			}
		}
		if (code.includes('get(t)`')) {
			found.push(...(await findTypescriptTranslatable(code)))
		}
	}

	return found
}
