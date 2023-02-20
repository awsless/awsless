import { json, array, type, string, date, Struct } from '@awsless/validate'

type Input<T> = {
	Records: {
		Sns: {
			Message: T
		}
	}[]
}

export const snsRecords = <T>(input: Input<T>) => {
	return input.Records.map(({ Sns: item }) => item.Message)
}

export const snsStruct = <A, B>(message: Struct<A, B>) => {
	return type({
		Records: array(
			type({
				Sns: type({
					TopicArn: string(),
					MessageId: string(),
					Timestamp: date(),
					Message: json(message),
					// MessageAttributes
				}),
			})
		),
	})
}
