
import { createFilter } from 'rollup-pluginutils'
import { extname } from 'path'

export interface RawOptions {
	include?: string[]
	exclude?: string[]
	extensions?: string[]
}

export default (options: RawOptions = {}) => {
	options = {
		extensions: [],
		...options
	}

	const filter = createFilter(options.include, options.exclude)

	return {
		transform(code:string, id:string) {
			if (!filter(id)) return
			if (options.extensions?.indexOf(extname(id)) === -1) return

			return {
				code: `export default ${JSON.stringify(code)};`,
				map: { mappings: '' }
			}
		}
	}
}
