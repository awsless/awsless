// import { lambda } from "@awsless/lambda"

// export const restHandler = () => {
// 	return lambda({

// 	})
// }


// import { lambda } from "@awsless/lambda"
// import { type, coerce, Struct, array, string } from "@awsless/validate"

// type Opt = {
// 	(): Struct<unknown, null>
// 	<A, B>(struct?: Struct<A, B>): Struct<A, B>
// }

// const opt: Opt = <A, B>(struct?: Struct<A, B>) => {
// 	return struct || unknown()
// }

// export const httpLambda = ({ query, body, headers }) => {
// 	return lambda({
// 		input: coerce(
// 			type({
// 				query: opt(query),
// 				headers: opt(headers),
// 				body: opt(body),
// 			}),
// 			type({
// 				queryStringParameters: opt(query),
// 				headers: opt(headers),
// 				body: opt(body),
// 			}),
// 			(event) => ({
// 				query: event.queryStringParameters,
// 				headers: event.headers,
// 				body: event.body,
// 			})
// 		),
// 	})
// }









// import { string, type, record, unknown, Struct } from '@heat/validate'

// interface Options <A, B, C, D> {
// 	query?: Struct<A, B>
// 	body?: Struct<C, D>
// }

// type Opt = {
// 	(): Struct<unknown, null>
// 	<A, B>(struct?: Struct<A, B>): Struct<A, B>
// }

// const opt: Opt = <A, B>(struct?: Struct<A, B>) => {
// 	return struct || unknown()
// }

// export const elbStruct = <A, B, C, D>({ query, body }: Options<A, B, C, D> = {}) => {
// 	return type({
// 		queryStringParameters: opt(query),
// 		body: opt(body),
// 		headers: record(string(), string()),
// 	})
// }

// type Input<Q, B> = {
// 	headers: Record<string, string | undefined>
// 	queryStringParameters: Q
// 	body: B
// }

// export const elbRequest = <Q, B>(input:Input<Q, B>) => {
// 	return {
// 		headers: input.headers,
// 		query: input.queryStringParameters,
// 		body: input.body,
// 	}
// }
