import { Output } from '@awsless/validate'
import { requestSchema } from './validate'

const toNumber = (value?: string) => {
	if (!value) {
		return
	}

	return parseFloat(value)
}

const stripPortFromIp = (value?: string) => {
	if (!value) {
		return
	}

	const parts = value.split(':')
	parts.pop()

	return parts.join(':')
}

export const buildViewerPayload = (request: Output<typeof requestSchema>) => {
	const http = request.requestContext.http

	const getViewer = (name: string) => {
		return request.headers[`cloudfront-viewer-${name}`]
	}

	const isViewer = <T extends Record<string, string>>(enums: T): T[keyof T] | undefined => {
		for (const [name, value] of Object.entries(enums)) {
			if (request.headers[`cloudfront-is-${name}-viewer`] === 'true') {
				return value as T[keyof T]
			}
		}

		return
	}

	return {
		userAgent: http.userAgent,
		ip: stripPortFromIp(getViewer('address')),
		city: getViewer('city'),
		region: {
			code: getViewer('country-region'),
			name: getViewer('country-region-name'),
		},
		country: {
			code: getViewer('country'),
			name: getViewer('country-name'),
		},
		metroCode: getViewer('metro-code'),
		postalCode: getViewer('postal-code'),
		timeZone: getViewer('time-zone'),
		latitude: toNumber(getViewer('latitude')),
		longitude: toNumber(getViewer('longitude')),

		device: isViewer({
			mobile: 'mobile',
			tablet: 'tablet',
			desktop: 'desktop',
			smarttv: 'tv',
		} as const),

		os: isViewer({
			ios: 'ios',
			android: 'android',
		} as const),
	}
}
