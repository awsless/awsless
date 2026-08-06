import { h } from 'awsless'

export default h.route(() => {
	return new Response('<?xml version="1.0" encoding="UTF-8"?><h1>Sitemap</h1>', {
		status: 200,
		headers: {
			'content-type': 'application/xml',
		},
	})
})
