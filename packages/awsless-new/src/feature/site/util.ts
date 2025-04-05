import { contentType, lookup } from 'mime-types'
import { extname } from 'path'

export const getCacheControl = (file: string) => {
	switch (lookup(file)) {
		case false:
		case 'text/html':
		case 'application/json':
		case 'application/manifest+json':
		case 'application/manifest':
		case 'text/markdown':
			return 's-maxage=31536000, max-age=0'

		default:
			return `public, max-age=31536000, immutable`
	}
}

export const getContentType = (file: string) => {
	return contentType(extname(file)) || 'text/html; charset=utf-8'
}

export const getForwardHostFunctionCode = () => {
	return [
		'function handler(event) {',

		'const request = event.request',
		'const headers = request.headers',
		'const host = request.headers.host.value',
		'headers["x-forwarded-host"] = { value: host }',
		'return request',

		'}',
	].join('\n')
}
