import { invoke } from '@awsless/lambda'
import { getObject, putObject } from '@awsless/s3'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import sharp, { JpegOptions, PngOptions, ResizeOptions, WebpOptions } from 'sharp'
import { parsePath } from './validate'

export default async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
	try {
		const request = parsePath(event.rawPath)

		if (!request.success) {
			return { statusCode: 404 }
		}

		const originalPath = request.output.originalPath!
		const preset = request.output.preset!
		const extension = request.output.extension!
		const version = request.output.version!

		// ----------------------------------------
		// Get the preset and extension configuration

		const configsEnv = process.env.IMAGE_CONFIG

		if (!configsEnv) {
			throw new Error('Image configurations not found in environment variables')
		}

		const configs: {
			presets: Record<string, ResizeOptions & { quality?: number }>
			extensions: Record<string, JpegOptions | WebpOptions | PngOptions>
			version?: number
		} = JSON.parse(configsEnv)

		const presetConfig = configs.presets?.[preset]
		const extensionConfig = configs.extensions?.[extension]

		// We only allow predefined presets and extensions.
		// If no preset or extension configuration is found we won't allow the transformation to proceed.

		if (!presetConfig || !extensionConfig) {
			return { statusCode: 404 }
		}

		// We can version in the path for cache busting.
		// We don't want to allow any version due to DDoS attacks.

		const maxVersion = configs.version ?? 0
		if (version > maxVersion) {
			return { statusCode: 404 }
		}

		// ----------------------------------------
		// Check if image is in the S3 bucket

		let baseImage: Buffer | undefined = undefined

		if (process.env.IMAGE_ORIGIN_S3) {
			const result = await getObject({
				bucket: process.env.IMAGE_ORIGIN_S3,
				key: originalPath,
			})

			if (result?.body) {
				const data = await result.body.transformToByteArray()
				baseImage = Buffer.from(data)
			}
		}

		// ----------------------------------------
		// Call the orginal image fetcher

		if (!baseImage && process.env.IMAGE_ORIGIN_LAMBDA) {
			const result = (await invoke({
				name: process.env.IMAGE_ORIGIN_LAMBDA,
				payload: {
					path: originalPath,
				},
			})) as string | undefined

			if (typeof result === 'string') {
				baseImage = Buffer.from(result, 'base64')
			} else if (typeof result === undefined) {
				return { statusCode: 404 }
			} else {
				throw new Error('Invalid response from image origin lambda')
			}
		}

		// ----------------------------------------
		// Process the image with sharp

		if (!baseImage) {
			return { statusCode: 404 }
		}

		const image = await sharp(baseImage)
			.resize({
				width: presetConfig.width,
				height: presetConfig.height,
				fit: presetConfig.fit,
				position: presetConfig.position,
			})
			[extension]({ ...extensionConfig, quality: presetConfig.quality })
			.toBuffer()

		// ----------------------------------------
		// Cache the image in S3

		await putObject({
			bucket: process.env.IMAGE_CACHE_BUCKET!,
			key: event.rawPath.startsWith('/') ? event.rawPath.slice(1) : event.rawPath,
			body: image,
			contentType: `image/${extension}`,
			cacheControl: 'public, max-age=31536000, immutable',
		})

		// ----------------------------------------

		return {
			statusCode: 200,
			body: image.toString('base64'),
			isBase64Encoded: true,
			headers: {
				'Content-Type': `image/${extension}`,
				'Cache-Control': 'public, max-age=31536000, immutable',
			},
		}
	} catch (error) {
		console.error(error)
		return { statusCode: 500 }
	}
}
