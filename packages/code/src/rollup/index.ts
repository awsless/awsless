
import { InputPluginOption, rollup as bundler, RollupLog } from 'rollup'

import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import alias, { Alias } from '@rollup/plugin-alias'
// import sucrase from '@rollup/plugin-sucrase'
import commonjs from '@rollup/plugin-commonjs'
import terser from '@rollup/plugin-terser'
import babel from '@rollup/plugin-babel'
import json from '@rollup/plugin-json'
import coffee from './coffee'
import lua from './lua'
import raw from './raw'
import stylus from './stylus'

import loadTsConfig from "tsconfig-loader"
import { access } from 'fs/promises'
import { join, resolve } from 'path'

export const extensions = [
	'json', 'js', 'jsx', 'tsx', 'coffee', 'ts', 'lua', 'md', 'html'
]

type TranspilersOptions = {
	typescript?: boolean
	coffeescript?: boolean
}

export interface PluginOptions {
	sourceMap?: boolean
	minimize?: boolean
	transpilers?: TranspilersOptions
	aliases?: Record<string, string> | Alias[]
}

export const plugins = ({ minimize = false, sourceMap = true, transpilers, aliases }:PluginOptions = {}) => {
	const transpilersOptions = Object.assign({
		ts: true,
		coffee: true
	}, transpilers)

	return [
		alias({ entries: aliases }),
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
		stylus(),
		json(),
		lua(),
		raw({
			extensions: [ '.md', '.html', '.css' ],
		}),
		nodeResolve({
			preferBuiltins: true,
			extensions: ['.js', '.coffee', '.jsx']
		}),

		transpilersOptions.coffeescript && coffee({
			sourceMap
		}),

		transpilersOptions.typescript && typescript({
			sourceMap,
		}) as unknown,

		// transpilersOptions.typescript && sucrase({
		// 	jsxFragmentPragma: 'Fragment',
		// 	jsxPragma: 'h',
		// 	transforms: ['typescript', 'jsx']
		// }),

		minimize && terser({
			toplevel: true,
			sourceMap,
		})
	]
}

export interface RollupOptions {
	format?: 'cjs' | 'esm'
	sourceMap?: boolean
	external?: (importee:string) => boolean
	minimize?: boolean
	moduleSideEffects?: boolean | string[] | 'no-external' | ((id: string, external: boolean) => boolean)
	exports?: 'auto' | 'default' | 'named' | 'none'
	onwarn?: (warning:RollupLog) => void
	aliases?: Record<string, string> | Alias[]
	transpilers?: {
		typescript?: boolean
		coffeescript?: boolean
	}
}

const shouldIncludeTypescript = async (transpilers:TranspilersOptions) => {
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

export const loadTsConfigAliases = () => {
	// @ts-ignore
	const loaded = (loadTsConfig.default || loadTsConfig).call()

	if(!loaded) {
		return
	}

	const cwd = process.cwd()
	const paths = loaded.tsConfig?.compilerOptions?.paths || {}
	const aliases: Record<string, string> = {}

	for(const key in paths) {
		const alias = paths[key]?.[0]
		const find = key.replace(/\/\*$/, '')
		const replacement = alias.replace(/\/\*$/, '')

		aliases[find] = resolve(join(cwd, replacement))
	}

	return aliases
}


export const rollup = async (input:string, options:RollupOptions = {}) => {

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
		aliases,
	} = options

	const bundle = await bundler({
		input,
		external,
		onwarn,

		plugins: plugins({
			minimize,
			sourceMap,
			transpilers: await shouldIncludeTypescript(transpilers),
			aliases: aliases || loadTsConfigAliases(),
		}) as InputPluginOption[],

		treeshake: {
			moduleSideEffects
		},
	})

	const { output: [output] } = await bundle.generate({
		format,
		sourcemap: sourceMap,
		exports: options.exports,
	})

	return {
		code: output.code,
		map: output.map || undefined
	}
}
