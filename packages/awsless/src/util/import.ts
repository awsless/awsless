import { rollup } from "rollup"
import { swc } from 'rollup-plugin-swc3'
import replace from 'rollup-plugin-replace'

import { dirname, join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { directories } from './path';
import { debug } from '../cli/logger';
import { style } from '../cli/style';

export const importFile = async (path:string) => {

	const bundle = await rollup({
		input: path,
		plugins: [
			replace({
				__dirname: (id) => `'${dirname(id)}'`,
			}),
			swc({
				minify: false,
			}),
		]
	})

	const outputFile = join(directories.cache, 'config.js')
	const result = await bundle.generate({
		format: 'esm',
		exports: 'default',
	})

	const output = result.output[0]
	const code = output.code

	await mkdir(directories.cache, { recursive: true })
	await writeFile(outputFile, code)

	debug('Save config file:', style.info(outputFile))

	return import(outputFile)
}
