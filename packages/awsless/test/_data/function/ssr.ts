import { APIGatewayProxyEventV2 } from "aws-lambda"

export default async (event:APIGatewayProxyEventV2) => {
	if(event.rawPath === '/') {
		return {
			statusCode: 200,
			headers: {
				'content-type': 'text/html'
			},
			body: '<h1>Hello</h1>'
		}
	}

	if(event.rawPath === '/debug') {
		return {
			statusCode: 200,
			body: JSON.stringify(event),
		}
	}

	return {
		statusCode: 404,
	}
}
