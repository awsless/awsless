import { Handler } from '@awsless/lambda'
import { InferOutput, object, string } from '@awsless/validate'
import { consumer } from './util.js'

const imageOriginSchema = object(
	{
		path: string(),
	},
	'Invalid image origin input'
)

// The origin request an image handler receives & the base64 encoded
// source image it returns - or undefined for a 404.
export type ImageEvent = InferOutput<typeof imageOriginSchema>
export type ImageResponse = string | undefined

export const image = <H extends Handler<typeof imageOriginSchema, ImageResponse | Promise<ImageResponse>>>(
	handle: H
) => {
	return consumer(imageOriginSchema, handle)
}

export const icon = image
