import { h } from 'awsless'

// Returns the resolved ip next to its raw sources: behind CloudFront
// the lambda sourceIp can be the edge instead of the caller.
export default h.route(({ request, ip }) => {
	return Response.json({
		ip,
		userAgent: request.headers.get('user-agent'),
		raw: {
			viewerAddress: request.headers.get('cloudfront-viewer-address'),
			forwardedFor: request.headers.get('x-forwarded-for'),
		},
	})
})
