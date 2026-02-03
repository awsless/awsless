import { array, BaseSchema, date, GenericIssue, number, object, pipe, string, toDate, transform, union } from 'valibot'

type S3EventOutput = {
	event: string
	time: Date
	bucket: string
	key: string
	size: number
	eTag: string
}

export type S3EventSchema = BaseSchema<
	S3EventOutput | S3EventOutput[] | { Records: { eventTime: string }[] },
	S3EventOutput[],
	GenericIssue
>

export const s3Event = (): S3EventSchema => {
	const schema = object({
		event: string(),
		bucket: string(),
		key: string(),
		size: number(),
		eTag: string(),
		time: date(),
	})

	return union(
		[
			// Prioritize the expected payload during production
			pipe(
				object({
					Records: array(
						object({
							eventTime: pipe(string(), toDate()),
							eventName: string(),
							s3: object({
								bucket: object({
									name: string(),
								}),
								object: object({
									key: string(),
									size: number(),
									eTag: string(),
								}),
							}),
						})
					),
				}),
				transform(input => {
					return input.Records.map(record => ({
						event: record.eventName,
						time: record.eventTime,
						bucket: record.s3.bucket.name,
						key: record.s3.object.key,
						size: record.s3.object.size,
						eTag: record.s3.object.eTag,
					}))
				})
			),
			// These are allowed during testing
			pipe(
				schema,
				transform(v => [v])
			),
			array(schema),
		],
		'Invalid S3 Event payload'
	)
}
