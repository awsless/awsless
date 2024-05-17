import { swc } from 'rollup-plugin-swc3'
import { CustomReporter } from './reporter.js'
import { configDefaults } from 'vitest/config'
import { startVitest } from 'vitest/node'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import json from '@rollup/plugin-json'

export const startTest = async (props: { reporter?: CustomReporter; dir: string; filters: string[] }) => {
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
