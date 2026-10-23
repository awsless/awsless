import { h } from 'awsless'

// Returns the resolved ip next to its raw sources: behind CloudFront
// the lambda sourceIp can be the edge instead of the caller.
export default h.route(request => {
	return Response.json({
		ip: request.ip,
		userAgent: request.userAgent,
		raw: {
			viewerAddress: request.headers.get('cloudfront-viewer-address'),
			forwardedFor: request.headers.get('x-forwarded-for'),
		},
	})
})
