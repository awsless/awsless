
import { InputPluginOption, rollup as bundler, RollupLog } from 'rollup'

import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'
// import { terser } from '@wwa/rollup-plugin-terser'
import terser from '@rollup/plugin-terser'
// import { uglify } from 'rollup-plugin-uglify'
// import uglify from '@lopatnov/rollup-plugin-uglify'
import babel from '@rollup/plugin-babel'
import json from '@rollup/plugin-json'
import coffee from './coffee'
import lua from './lua'
import raw from './raw'
import { access } from 'fs/promises'
import { join } from 'path'
import stylus from './stylus'

export const extensions = [
	'json', 'js', 'jsx', 'tsx', 'coffee', 'ts', 'lua', 'md', 'html'
]

export interface PluginOptions {
	sourceMap?: boolean
	minimize?: boolean
	transpilers?: {
		typescript?: boolean
		coffeescript?: boolean
	}
}

export const plugins = ({ minimize = false, sourceMap = true, transpilers }:PluginOptions = {}) => {
	const transpilersOptions = Object.assign({
		ts: true,
		coffee: true
	}, transpilers)

	return [
		transpilersOptions.coffeescript && coffee({
			sourceMap
		}),
		transpilersOptions.typescript && typescript({
			sourceMap,
		}) as unknown,
		commonjs({ sourceMap }),
		babel({
			sourceMaps: sourceMap,
			presets: [
				[ '@babel/preset-react', {
					pragma: 'h',
					pragmaFrag: 'Fragment',
					throwIfNamespace: false
				} ],
			],
			babelrc: false,
			extensions: ['.js', '.jsx'],
			babelHelpers: 'bundled',
		}),
		json(),
		lua(),
		raw({
			extensions: [ '.md', '.html', '.css' ],
		}),
		stylus(),
		nodeResolve({
			preferBuiltins: true,
			extensions: ['.js', '.coffee', '.jsx']
		}),
		minimize && terser({
			toplevel: true,
			sourceMap,
		})
	]
}

export interface RollupOptions {
	format?: 'cjs' | 'esm'
	sourceMap?: boolean
	external?: (importee) => boolean
	minimize?: boolean
	moduleSideEffects?: boolean | string[] | 'no-external' | ((id: string, external: boolean) => boolean)
	exports?: 'auto' | 'default' | 'named' | 'none'
	onwarn?: (warning:RollupLog) => void
	transpilers?: {
		typescript?: boolean
		coffeescript?: boolean
	}
}

const shouldIncludeTypescript = async (transpilers) => {
	if(transpilers.typescript) {
		const path = join(process.cwd(), 'tsconfig.json')

		try {
			await access(path)
			return { ...transpilers, typescript: true }
		} catch(error) {
			return { ...transpilers, typescript: false }
		}
	}

	return transpilers
}

export const rollup = async (input, options:RollupOptions = {}) => {

	const {
		minimize = false,
		sourceMap = true,
		moduleSideEffects = true,
		format = 'cjs',
		transpilers = {
			typescript: true,
			coffeescript: true,
		},
		// exports = 'default',
		external,
		onwarn,
	} = options

	const bundle = await bundler({
		input,
		external,
		onwarn,

		plugins: plugins({
			minimize,
			sourceMap,
			transpilers: await shouldIncludeTypescript(transpilers)
		}) as InputPluginOption[],

		treeshake: {
			moduleSideEffects
		},
	})

	const { output: [output] } = await bundle.generate({
		format,
		sourcemap: sourceMap,
		exports: options.exports
	})

	return {
		code: output.code,
		map: output.map || undefined
	}
}
