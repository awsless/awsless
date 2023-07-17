import 'superstruct'
import { array, type, string, Struct, coerce } from '@awsless/validate'
// import { randomUUID } from 'crypto'

// type Input<T> = {
// 	Records: {
// 		Sns: {
// 			Message: T
// 		}
// 	}[]
// }

// export const snsRecords = <T>(input: Input<T>) => {
// 	return input.Records.map(({ Sns: item }) => item.Message)
// }

export const snsStruct = <A, B>(message: Struct<A, B>) => {
	return coerce(
		array(message),
		type({ Records: array(type({
			Sns: type({ Message: string() }) }))
		}),
		(value) => {
			return value.Records.map(item => JSON.parse(item.Sns.Message))
		}
	)
}

// export const snsStruct = <A, B>(message: Struct<A, B>) => {
// 	return type({
// 		Records: array(
// 			type({
// 				Sns: type({
// 					TopicArn: string(),
// 					MessageId: string(),
// 					Timestamp: date(),
// 					Message: json(message),
// 					// MessageAttributes
// 				}),
// 			})
// 		),
// 	})
// }

// export const snsInput = (records: any[]) => {
// 	return {
// 		Records: records.map((body, i) => ({
// 			Sns: {
// 				TopicArn: 'arn:aws:sns',
// 				MessageId: randomUUID(),
// 				Timestamp: new Date(),
// 				Message: body,
// 			},
// 		})),
// 	}
// }
