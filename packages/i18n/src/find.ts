import { readFile } from 'fs/promises'
import { glob } from 'glob'
import { join } from 'path'
import { findSvelteTranslatable } from './find/svelte'
import { findTypescriptTranslatable } from './find/typescript'

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

		if (code.includes('lang.t`')) {
			if (file.endsWith('.svelte')) {
				found.push(...findSvelteTranslatable(code))
			} else {
				found.push(...(await findTypescriptTranslatable(code)))
			}
		}
	}

	return found
}
