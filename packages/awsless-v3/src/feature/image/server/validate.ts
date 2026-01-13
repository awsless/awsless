import { object, picklist, safeParse, string, transform } from '@awsless/validate'

export const supportedExtensions = ['jpg', 'png', 'webp'] as const

const schema = transform(
	string(),
	path => {
		const cleanPath = path.startsWith('/') ? path.slice(1) : path
		const parts = cleanPath.split('/')
		const options = parts.pop()
		const originalPath = parts.join('/')

		if (!originalPath || !options) {
			return {}
		}

		const [preset, extension] = options.split('.')

		if (!preset || !extension) {
			return {}
		}

		return {
			originalPath: originalPath,
			preset: preset,
			extension: extension as (typeof supportedExtensions)[number],
		}
	},
	object({
		originalPath: string(),
		preset: string(),
		extension: picklist(supportedExtensions),
	})
)

export const parsePath = (path: string) => {
	return safeParse(schema, path)
}
