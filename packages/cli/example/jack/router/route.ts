import { RouteEvent, RouteResponse } from 'awsless'

export default async (event: RouteEvent<'/route/{id}'>): Promise<RouteResponse> => {
	console.log(event)

	return {
		statusCode: 200,
		headers: {
			'content-type': 'application/json',
		},
		body: JSON.stringify(event),
	}
}
