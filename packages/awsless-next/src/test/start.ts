import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import nodeResolve from '@rollup/plugin-node-resolve'
import { dirname, join } from 'path'
import { swc } from 'rollup-plugin-swc3'
import { fileURLToPath } from 'url'
import { configDefaults } from 'vitest/config'
import { startVitest } from 'vitest/node'
import { CustomReporter } from './reporter.js'

export const startTest = async (props: { reporter?: CustomReporter; dir: string; filters: string[] }) => {
	const __dirname = dirname(fileURLToPath(import.meta.url))

	const result = await startVitest(
		'test',
		props.filters,
		{
			// name: config.name,
			watch: false,
			ui: false,
			silent: true,
			dir: props.dir,
			include: ['**/*.{js,jsx,ts,tsx}'],
			exclude: ['**/_*', '**/_*/**', ...configDefaults.exclude],
			globals: true,
			reporters: props.reporter,
			// typecheck: {
			// 	checker: 'tsc',
			// 	enabled: true,
			// },
			setupFiles: [
				//
				join(__dirname, 'test-global-setup.js'),
			],

			// globalSetup: [
			// 	//
			// 	join(__dirname, 'test-global-setup.js'),
			// ],

			// env: {
			// 	TZ: 'UTC',
			// },
			// typecheck: {
			// 	enabled: true,
			// 	// ignoreSourceErrors: false,
			// 	// checker: 'tsc',
			// 	// include: ['**/*.{js,jsx,ts,tsx}'],
			// 	// only: true,
			// 	// allowJs: true,
			// },
			// outputFile: {
			// 	json: './.awsless/test/output.json',
			// },
		},
		{
			plugins: [
				// @ts-ignore
				commonjs({ sourceMap: true }),
				// @ts-ignore
				nodeResolve({ preferBuiltins: true }),
				swc({
					jsc: {
						// baseUrl: dirname(input),
						minify: { sourceMap: true },
					},
					sourceMaps: true,
				}),
				// @ts-ignore
				json(),
			],
		}
	)

	// console.log('')
	// console.log(result)

	return result
}
