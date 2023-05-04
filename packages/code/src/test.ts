
import { join } from 'path'
import { readFile } from 'fs/promises'
import { mergeConfig } from 'vite'
import { startVitest } from 'vitest/node'
import { configDefaults, defineConfig } from 'vitest/config'
import { plugins } from './rollup/index'

export const test = async (filters:string[] = []) => {
	const json = await readFile(join(process.cwd(), 'package.json'))
	const data = JSON.parse(json.toString())
	const config = { test: data?.vitest || {} }

	await startVitest('test', filters, {
		watch: false,
		ui: false
	}, mergeConfig(config, defineConfig({
		plugins: plugins({
			minimize: false,
			sourceMap: true,
		}) as any[],
		test: {
			include: [ './test/**/*.{js,jsx,coffee,ts}' ],
			exclude: [ './test/**/_*', ...configDefaults.exclude ],
			globals: true,
		}
	})))
}

/*
rollupOptions: {
	onwarn: (message) => {
		if ( /external dependency/.test(message)) {
			return
		}

		console.warn( message )
	}
}
*/
