import { invoke } from '@awsless/lambda'
import { getObject } from '@awsless/s3'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import sharp, { JpegOptions, PngOptions, ResizeOptions, WebpOptions } from 'sharp'
import { parsePath } from './validate'

export default async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
	try {
		const request = parsePath(event.rawPath)

		if (!request.success) {
			return { statusCode: 400 }
		}

		const originalImage = request.output.originalImage
		const preset = request.output.preset
		const extension = request.output.extension

		// ----------------------------------------
		// Get the preset and extension configuration

		const configsEnv = process.env.IMAGES_CONFIG

		if (!configsEnv) {
			console.error('Image configurations not found in environment variables')
			return { statusCode: 500 }
		}

		const configs: {
			presets: Record<string, ResizeOptions>
			extensions: Record<string, JpegOptions | WebpOptions | PngOptions>
		} = JSON.parse(configsEnv)

		const presetConfig = configs.presets?.[preset]
		const extensionConfig = configs.extensions?.[extension]

		console.error('Preset config:', presetConfig)
		console.error('Extension config:', extensionConfig)

		// We only allow predefined presets and extensions.
		// If no preset or extension configuration is found we won't allow the transformation to proceed.

		if (!presetConfig || !extensionConfig) {
			return { statusCode: 404 }
		}

		// ----------------------------------------
		// Check if image is in the S3 bucket

		let baseImage: Buffer | undefined = undefined

		if (process.env.IMAGES_ORIGIN_S3) {
			try {
				const data = await getObject({
					bucket: process.env.IMAGES_ORIGIN_S3,
					key: originalImage,
				})

				if (data?.body) {
					baseImage = Buffer.from(await data.body.transformToByteArray())
				}
			} catch (error) {
				console.error('Error fetching or transforming from S3 origin:', error)
				return { statusCode: 500 }
			}
		}

		// ----------------------------------------
		// Call the orginal image fetcher

		if (!baseImage && process.env.IMAGES_ORIGIN_LAMBDA) {
			try {
				const result = (await invoke({
					name: process.env.IMAGES_ORIGIN_LAMBDA,
					payload: {
						image: originalImage,
					},
				})) as string

				baseImage = Buffer.from(result, 'base64')
			} catch (error) {
				console.error('Error invoking image origin lambda:', error)
				return { statusCode: 500 }
			}
		}

		// ----------------------------------------
		// Process the image with sharp

		if (!baseImage) {
			console.error('Base image not found')
			return { statusCode: 500 }
		}

		let image: string
		try {
			image = await sharp(baseImage)
				.resize(presetConfig)
				[extension](extensionConfig)
				.toBuffer()
				.then((data: Buffer) => data.toString('base64'))
		} catch (error) {
			console.error('Error processing image with sharp:', error)
			return { statusCode: 500 }
		}

		// ----------------------------------------

		return {
			statusCode: 200,
			body: image,
			isBase64Encoded: true,
			headers: {
				'Content-Type': `image/${extension}`,
			},
		}
	} catch (error) {
		console.log('Internal error')
		console.error(error)
		return { statusCode: 500 }
	}
}
