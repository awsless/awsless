import { integer, number, object, picklist, safeParse, string, transform } from '@awsless/validate'

const supportedExtensions = ['jpeg', 'png', 'webp', 'svg'] as const

const schema = transform(
	string(),
	path => {
		const cleanPath = path.startsWith('/') ? path.slice(1) : path
		const [originalPath, options] = cleanPath.split('@')

		if (!originalPath || !options) {
			return {}
		}

		let [preset, version, extension] = options.split('.')

		if (!extension) {
			extension = version
			version = undefined
		}

		if (!preset || !extension) {
			return {}
		}

		return {
			originalPath: originalPath,
			preset: preset,
			extension: extension as (typeof supportedExtensions)[number],
			version: version ? parseInt(version, 10) : 0,
		}
	},
	object({
		originalPath: string(),
		preset: string(),
		extension: picklist(supportedExtensions),
		version: number([integer()]),
	})
)

export const parsePath = (path: string) => {
	return safeParse(schema, path)
}
