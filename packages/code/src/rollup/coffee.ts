
// @ts-ignore
import coffeescript from 'coffeescript'
import { createFilter } from 'rollup-pluginutils'
import { extname } from 'path'

type Options = {
	sourceMap?: boolean
	bare?: boolean
	extensions?: string[]
	include?: string[]
	exclude?: string[]
}

export default (options: Options = {}) => {
	options = {
		sourceMap: true,
		bare: true,
		extensions: ['.coffee'],
		...options,
	}

	const filter = createFilter(options.include, options.exclude)
	const extensions = options.extensions!

	delete options.extensions
	delete options.include
	delete options.exclude

	return {
		transform(code:string, id:string) {
			if (!filter(id)) return null
			if (extensions.indexOf(extname(id)) === -1) return null

			const output = coffeescript.compile(code, {
				...options,
				filename: id
			})

			if(!options.sourceMap) {
				return { code: output }
			}

			return {
				code: output.js,
				map: JSON.parse(output.v3SourceMap)
			}
		}
	}
}
