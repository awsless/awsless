import { Handler } from '@awsless/lambda'
import { GenericSchema, InferInput, object, string } from '@awsless/validate'
import { consumer } from './util.js'

const imageOriginSchema = object(
	{
		path: string(),
	},
	'Invalid image origin input'
)

/** The origin request an image handler receives. */
export type ImageEvent = {
	/** The path of the requested source image, without the preset & extension suffix. */
	path: string
}

/** What an image handler returns: the source image as raw bytes or a base64 encoded string, or undefined for a 404. */
export type ImageResponse = Buffer | ArrayBuffer | Uint8Array | string | undefined

type ImageSchema = GenericSchema<InferInput<typeof imageOriginSchema>, ImageEvent>
type ImageHandler = (event: ImageEvent, context: Parameters<Handler>[1]) => ImageResponse | Promise<ImageResponse>

export const image = <H extends ImageHandler>(handle: H) => {
	return consumer(imageOriginSchema as ImageSchema, async (event, context) => {
		const result = await handle(event, context)

		// Raw bytes normalize to base64, so the response survives any
		// invoke boundary as plain json.
		if (result instanceof ArrayBuffer) {
			return Buffer.from(result).toString('base64')
		}

		if (ArrayBuffer.isView(result)) {
			return Buffer.from(result.buffer, result.byteOffset, result.byteLength).toString('base64')
		}

		return result
	})
}

export const icon = image
