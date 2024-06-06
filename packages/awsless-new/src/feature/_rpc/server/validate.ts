import { array, maxLength, minLength, object, record, safeParse, string, unknown } from '@awsless/validate'

const schema = array(
	object({
		name: string([minLength(1), minLength(1), maxLength(64)]),
		payload: record(string(), unknown()),
	}),
	[minLength(1), maxLength(10)]
)

export const parseBody = (body: unknown) => {
	return safeParse(schema, body)
}
