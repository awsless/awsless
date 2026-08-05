import { RouteEvent, RouteResponse } from 'awsless'

export default async (event: RouteEvent): Promise<RouteResponse> => {
	console.log(event)

	return {
		statusCode: 200,
		body: 'HELLO',
	}
}
