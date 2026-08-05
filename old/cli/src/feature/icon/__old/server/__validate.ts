import { regex, safeParse, string, transform } from '@awsless/validate'

const schema = transform(
	string([
		// /{id}.{version?}.svg
		regex(/^\/[a-zA-Z0-9_-]+(?:\.\d+)?\.svg$/),
	]),
	path => {
		const cleanPath = path.startsWith('/') ? path.slice(1) : path
		const pathWithoutExt = cleanPath.slice(0, -4)
		const [id, version] = pathWithoutExt.split('.')

		return {
			path: cleanPath,
			id: id!,
			version: parseInt(version ?? '0', 10),
		} as const
	}
)

export const parsePath = (path: string) => {
	return safeParse(schema, path)
}
