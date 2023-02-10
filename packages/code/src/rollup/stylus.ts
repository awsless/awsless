
import { createFilter } from 'rollup-pluginutils'
import objectAssign from 'object-assign'
import { dirname, extname, basename } from 'path'
import stylus from 'stylus'
import CleanCSS from 'clean-css'

export interface Options {
	include?: string[]
	exclude?: string[]
	extensions?: string[]
}

export default (options: Options = {}) => {
	options = objectAssign({
		extensions: [ '.styl' ],
	}, options || {})

	const filter = createFilter(options.include, options.exclude)

	return {
		async transform(code, id) {
			if (!filter(id)) return
			if (options.extensions?.indexOf(extname(id)) === -1) return

			const css = await stylus(code)
				.set('filename', basename(id))
				.set('paths', [ dirname(id) ])
				.render()

			const clean = new CleanCSS()
			const result = clean.minify(css.toString())

			return {
				code: `export default ${JSON.stringify(result.styles)};`,
				map: { mappings: '' }
			}
		}
	}
}
