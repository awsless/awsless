import { Handler } from '@awsless/lambda'
import { array, InferOutput, object, pipe, string, transform, union } from '@awsless/validate'
import { consumer } from './util.js'

const storeNotificationSchema = union(
	[
		pipe(
			object({ bucket: string(), key: string() }),
			transform(v => [v])
		),
		array(object({ bucket: string(), key: string() })),
		pipe(
			object({
				Records: array(
					object({
						s3: object({
							bucket: object({ name: string() }),
							object: object({ key: string() }),
						}),
					})
				),
			}),
			transform(input => {
				return input.Records.map(record => ({
					bucket: record.s3.bucket.name,
					key: record.s3.object.key,
				}))
			})
		),
	],
	'Invalid store notification input'
)

// The array of affected objects a store event handler receives.
export type StoreEvent = InferOutput<typeof storeNotificationSchema>

export const event = <H extends Handler<typeof storeNotificationSchema>>(handle: H) => {
	return consumer(storeNotificationSchema, handle)
}
