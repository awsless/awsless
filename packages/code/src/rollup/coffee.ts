
import coffeescript from 'coffeescript'
import objectAssign from 'object-assign'
import { createFilter } from 'rollup-pluginutils'
import { extname } from 'path'

export default (options) => {
	options = objectAssign({
		sourceMap: true,
		bare: true,
		extensions: ['.coffee'],
	}, options || {})

	const filter = createFilter(options.include, options.exclude)
	const extensions = options.extensions

	delete options.extensions
	delete options.include
	delete options.exclude

	return {
		transform(code, id) {
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
