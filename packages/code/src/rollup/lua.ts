
import { createFilter } from 'rollup-pluginutils'
import { extname } from 'path'
import crypto from 'crypto'

export interface LuaOptions {
	include?: string[]
	exclude?: string[]
	extensions?: string[]
}

export default (options:LuaOptions = {}) => {
	options = {
		extensions: ['.lua'],
		...options
	}

	const filter = createFilter(options.include, options.exclude)

	return {
		transform(source:string, id:string) {
			if (!filter(id)) return
			if (options.extensions?.indexOf(extname(id)) === -1) return

			const minified = source.trim()

			const hash = crypto
				.createHash('sha1')
				.update(minified, 'utf8')
				.digest('hex')

			const code = [
				`export default ${JSON.stringify(minified)};`,
				`export const hash = '${hash}';`
			].join('\n')

			return {
				code,
				map: { mappings: '' }
			}
		}
	}
}
