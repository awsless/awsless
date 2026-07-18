import { getObject, putObject } from '@awsless/s3'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import sharp, { JpegOptions, PngOptions, ResizeOptions, WebpOptions } from 'sharp'
import { getRouteEnv, invokeRoute } from 'awsless'
import { parsePath, supportedExtensions } from './validate'

const normalizeExtension = (extension: (typeof supportedExtensions)[number]) => {
	if (extension === 'jpg') {
		return 'jpeg'
	}

	return extension
}

export default async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
	try {
		const request = parsePath(event.rawPath)
		const bucket = getRouteEnv('IMAGE_BUCKET')
		const folder = getRouteEnv('IMAGE_FOLDER') ?? ''

		if (!request.success) {
			return { statusCode: 404 }
		}

		const originalPath = request.output.originalPath!
		const preset = request.output.preset!
		const extension = request.output.extension!

		// ----------------------------------------
		// Get cached image from s3

		const cacheKey = `${folder}cache/${event.rawPath.startsWith('/') ? event.rawPath.slice(1) : event.rawPath}`

		if (bucket) {
			const cachedImage = await getObject({
				bucket,
				key: cacheKey,
			})

			if (cachedImage) {
				const cachedImageData = await cachedImage.body.transformToByteArray()

				return {
					statusCode: 200,
					body: Buffer.from(cachedImageData).toString('base64'),
					isBase64Encoded: true,
					headers: {
						'Content-Type': `image/${normalizeExtension(extension)}`,
						'Cache-Control': 'public, max-age=31536000, immutable',
					},
				}
			}
		}

		// ----------------------------------------
		// Get the preset and extension configuration

		const configsEnv = getRouteEnv('IMAGE_CONFIG')

		if (!configsEnv) {
			throw new Error('Image configurations not found in environment variables')
		}

		const configs: {
			presets: Record<string, ResizeOptions & { quality?: number }>
			extensions: Record<string, JpegOptions | WebpOptions | PngOptions>
		} = JSON.parse(configsEnv)

		const presetConfig = configs.presets?.[preset]
		const extensionConfig = configs.extensions?.[extension]

		// We only allow predefined presets and extensions.
		// If no preset or extension configuration is found we won't allow the transformation to proceed.

		if (!presetConfig || !extensionConfig) {
			return { statusCode: 404 }
		}

		// ----------------------------------------
		// Check if image is in the S3 bucket

		let baseImage: Buffer | undefined = undefined

		if (getRouteEnv('IMAGE_ORIGIN_S3')) {
			const result = await getObject({
				bucket: bucket!,
				key: `${folder}origin/${originalPath}`,
			})

			if (result?.body) {
				const data = await result.body.transformToByteArray()
				baseImage = Buffer.from(data)
			}
		}

		// ----------------------------------------
		// Call the orginal image fetcher

		const originRoute = getRouteEnv('IMAGE_ORIGIN')

		if (!baseImage && originRoute) {
			const result = (await invokeRoute(originRoute, { path: originalPath })) as string | undefined

			if (typeof result === 'string') {
				baseImage = Buffer.from(result, 'base64')
			} else if (result === undefined) {
				return { statusCode: 404 }
			} else {
				throw new Error(`Invalid response from image origin lambda. Path: ${originalPath}`)
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
			[normalizeExtension(extension)]({ ...extensionConfig, quality: presetConfig.quality })
			.toBuffer()

		// ----------------------------------------
		// Cache the image in S3

		await putObject({
			bucket: bucket!,
			key: cacheKey,
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
