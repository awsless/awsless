import { extname } from 'path'
import { contentType, lookup } from 'mime-types'

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
