// import { lambda } from "@awsless/lambda"

// export const restHandler = ({ query, body, headers, params, handle }) => {
// 	return lambda({
// 		input: coerce(type({
// 			body,
// 			headers,
// 			pathParameters: params,
// 			queryStringParameters: query,
// 		}), (event) => {
// 			return {
// 				method: event.requestContext.http.method,
// 				body: event.body,
// 				headers: event.headers,
// 				params: event.pathParameters,
// 				query: event.queryStringParameters,
// 			}
// 		}),
// 		handle
// 	})
// }

// restHandler({
// 	params: object({
// 		id: string(),
// 	}),
// 	handle({ params }) {
// 		return {
// 			body: params.id
// 			// statusCode:
// 		}
// 	}
// })
