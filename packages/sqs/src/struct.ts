import { json, array, type, string, record, Struct } from '@awsless/validate'
import { randomUUID } from 'crypto'
import 'superstruct'

type Input<T> = {
	Records: {
		body: T
	}[]
}

export const sqsRecords = <T>(input: Input<T>) => {
	return input.Records.map(item => item.body)
}

export const sqsStruct = <A, B>(body: Struct<A, B>) => {
	return type({
		Records: array(
			type({
				body: json(body),
				messageId: string(),
				messageAttributes: record(
					string(),
					type({
						dataType: string(),
						stringValue: string(),
					})
				),
			})
		),
	})
}

export const sqsInput = (records: unknown[]) => {
	return {
		Records: records.map(body => ({
			messageId: randomUUID(),
			body: JSON.stringify(body),
			messageAttributes: {},
		})),
	}
}
