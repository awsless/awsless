import { array, type, string, Struct, coerce } from '@awsless/validate'

export const sqsStruct = <A, B>(body: Struct<A, B>) => {
	return coerce(
		array(body),
		type({ Records: array(type({ body: string() }))}),
		({ Records }) => Records.map(item => JSON.parse(item.body))
	)
}

// type Input<T> = {
// 	Records: {
// 		body: T
// 	}[]
// }

// export const sqsRecords = <T>(input: Input<T>) => {
// 	return input.Records.map(item => item.body)
// }

// export const sqsStruct = <A, B>(body: Struct<A, B>) => {
// 	return type({
// 		Records: array(
// 			type({
// 				body: json(body),
// 				messageId: string(),
// 				messageAttributes: record(
// 					string(),
// 					type({
// 						dataType: string(),
// 						stringValue: string(),
// 					})
// 				),
// 			})
// 		),
// 	})
// }

// export const sqsInput = (records: unknown[], attributes: Record<string, string> = {}) => {
// 	const messageAttributes: Record<string, { dataType: string; stringValue: string }> = {}

// 	Object.keys(attributes).map(key => {
// 		messageAttributes[key] = {
// 			dataType: 'String',
// 			stringValue: attributes[key],
// 		}
// 	})

// 	return {
// 		Records: records.map(body => ({
// 			messageId: randomUUID(),
// 			body: JSON.stringify(body),
// 			attributes: {
// 				SentTimestamp: String(Date.now()),
// 			},
// 			messageAttributes,
// 		})),
// 	}
// }
