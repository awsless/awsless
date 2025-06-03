import { object, picklist, safeParse, string, transform } from '@awsless/validate'

const supportedExtensions = ['jpeg', 'jpg', 'png', 'webp'] as const

const schema = transform(
	transform(
		string(),
		path => {
			const cleanPath = path.startsWith('/') ? path.slice(1) : path
			const [originalImage, transformedImage] = cleanPath.split('@')

			if (!originalImage || !transformedImage) {
				throw new Error('Invalid path format.')
			}

			const [preset, extension] = transformedImage.split('.')

			if (!preset || !extension) {
				throw new Error('Invalid path format.')
			}

			return {
				originalImage: originalImage,
				preset: preset,
				extension: extension as (typeof supportedExtensions)[number],
			}
		},
		object({
			originalImage: string(),
			preset: string(),
			extension: picklist(supportedExtensions),
		})
	),
	data => {
		if (data.extension === 'jpg') {
			data.extension = 'jpeg'
		}

		return {
			originalImage: data.originalImage,
			preset: data.preset,
			extension: data.extension,
		}
	}
)

export const parsePath = (path: string) => {
	return safeParse(schema, path)
}
