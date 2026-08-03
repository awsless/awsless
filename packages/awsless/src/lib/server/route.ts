import type { APIGatewayProxyStructuredResultV2, LambdaFunctionURLEvent } from 'aws-lambda'

type RouteParams<Pattern extends string> = Pattern extends `${string}{${infer Param}}${infer Rest}`
	? Param | RouteParams<Rest>
	: never

type RouteParamHeaders<Pattern extends string> = [RouteParams<Pattern>] extends [never]
	? {}
	: {
			[Param in RouteParams<Pattern> as `x-param-${Lowercase<Param>}`]: string
		}

/**
 * The request that a route function receives.
 *
 * Passing the route pattern will type the params that are
 * passed as "x-param-[NAME]" request headers.
 * Param values are URI encoded.
 *
 * @example
 * export default async (event: RouteInput<'/sitemap/{locale}/{page}.xml'>) => {
 *   const locale = decodeURIComponent(event.headers['x-param-locale'])
 *   ...
 * }
 */
export type RouteEvent<Pattern extends string = string> = LambdaFunctionURLEvent & {
	headers: LambdaFunctionURLEvent['headers'] & RouteParamHeaders<Pattern>
}

/**
 * The response that a route function can return.
 *
 * The statusCode is required because Lambda function urls only treat
 * the returned object as an HTTP response when it contains a statusCode.
 * Without it, the whole return value is serialized as a JSON body.
 */
export type RouteResponse =
	| string
	| (APIGatewayProxyStructuredResultV2 & {
			statusCode: number
		})
