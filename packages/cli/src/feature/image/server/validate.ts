import { object, picklist, pipe, safeParse, string, transform } from '@awsless/validate'

export const supportedExtensions = ['jpg', 'png', 'webp'] as const

const schema = pipe(
	string(),
	transform(path => {
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
			extension: extension,
		}
	}),
	object({
		originalPath: string(),
		preset: string(),
		extension: picklist(supportedExtensions),
	})
)

export const parsePath = (path: string) => {
	return safeParse(schema, path)
}
