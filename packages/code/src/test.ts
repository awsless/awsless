
import { join } from 'path'
import { readFile } from 'fs/promises'
import { mergeConfig } from 'vite'
import { startVitest } from 'vitest/node'
import { configDefaults, defineConfig } from 'vitest/config'
import { loadTsConfigAliases, plugins } from './rollup/index'

export const test = async (filters:string[] = []) => {
	const json = await readFile(join(process.cwd(), 'package.json'))
	const data = JSON.parse(json.toString())
	const config = data?.vitest || {}
	// const config = { test: data?.vitest || {} }
	// const pluginConfig = data?.vitest?.plugins || {}

	await startVitest('test', filters, {
		watch: false,
		ui: false
	}, mergeConfig({ test: config }, defineConfig({
		plugins: plugins({
			minimize: false,
			sourceMap: true,
			// aliases: loadTsConfigAliases()
			...config,
		}) as any[],
		resolve: {
			alias: loadTsConfigAliases()
		},
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
