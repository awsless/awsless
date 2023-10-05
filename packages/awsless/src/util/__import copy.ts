import { transformFile } from '@swc/core'
import { dirname, join } from 'path';
import { lstat, mkdir, writeFile } from 'fs/promises';
import { directories } from './path';
import { debug } from '../cli/logger';
import { style } from '../cli/style';

const resolveFileNameExtension = async (path:string) => {
	const options = [
		'',
		'.ts',
		'.js',
		'/index.ts',
		'/index.js',
	]

	for(const option of options) {
		const file = path.replace(/\.js$/, '') + option
		let stat
		try {
			stat = await lstat(file)
		} catch(error) {
			continue
		}

		if(stat.isFile()) {
			return file
		}
	}

	throw new Error(`Failed to load file: ${path}`)
}

const resolveDir = (path: string) => {
	return dirname(path).replace(directories.root + '/', '')
}

export const importFile = async (path:string) => {

	const load = async (file:string) => {

		debug('Load file:', style.info(file))

		let { code } = await transformFile(file, {
			isModule: true,
		})

		const path = dirname(file)
		const dir = resolveDir(file)

		code = code.replaceAll('__dirname', `"${ dir }"`)

		// export { definePlugin, Plugin } from './plugin.js';

		const matches = code.match(/(import|export)\s*{\s*[a-z0-9\_\,\s\*]+\s*}\s*from\s*('|")(\.\.?[\/a-z0-9\_\-\.]+)('|");?/ig)
		// debug('matches', matches)

		if(!matches) return code

		await Promise.all(matches?.map(async match => {
  			const parts = /('|")(\.\.?[\/a-z0-9\_\-\.]+)('|")/ig.exec(match)!
			const from = parts[2]

			const file = await resolveFileNameExtension(join(path, from))
			const result = (await load(file))!

			code = code.replace(match, result)
		}))

		return code
	}

	const code = await load(path)
	const outputFile = join(directories.cache, 'config.js')

	await mkdir(directories.cache, { recursive: true })
	await writeFile(outputFile, code)

	debug('Save config file:', style.info(outputFile))

	return import(outputFile)
}
