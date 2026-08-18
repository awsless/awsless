import { lstat, readFile } from 'fs/promises'
import { join, normalize } from 'path'
import { Workspace } from '../types'
import { bun } from './bun'
import { pnpm } from './pnpm'

const parsers = {
	'pnpm-lock.yaml': pnpm,
	'bun.lock': bun,
} as const

export const loadPackageManager = async (search: string, level = 5): Promise<Workspace> => {
	if (!level) {
		throw new TypeError('No pnpm or bun lock file found')
	}

	for (const [lockFileName, parser] of Object.entries(parsers)) {
		const file = join(search, lockFileName)

		if (await fileExist(file)) {
			return parser(search, await readFile(file, 'utf8'))
		}
	}

	return loadPackageManager(normalize(join(search, '..')), level - 1)
}

const fileExist = async (file: string) => {
	try {
		const stat = await lstat(file)
		if (stat.isFile()) {
			return true
		}
	} catch (error) {}

	return false
}
