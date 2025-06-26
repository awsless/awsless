import { invoke } from '@awsless/lambda'
import { getObject, putObject } from '@awsless/s3'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { parsePath } from './validate'
// @ts-ignore
import { optimize } from 'svgo/browser'
// @ts-ignore
import svgstore from 'svgstore'

export default async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
	try {
		const request = parsePath(event.rawPath)
		if (!request.success || !request.output) {
			return { statusCode: 404 }
		}

		const { path, id, version } = request.output

		// ----------------------------------------
		// Get the icon configuration

		const configsEnv = process.env.ICON_CONFIG

		if (!configsEnv) {
			throw new Error('Icon configurations not found in environment variables')
		}

		const config: {
			preserveId: boolean
			symbols: boolean
			version?: number
		} = JSON.parse(configsEnv)

		// We can version in the path for cache busting.
		// We don't want to allow any version due to DDoS attacks.

		const maxVersion = config.version ?? 0
		if (version > maxVersion) {
			return { statusCode: 404 }
		}

		// ----------------------------------------
		// Check if image is in the S3 bucket

		let baseIcon: Buffer | undefined = undefined

		if (process.env.ICON_ORIGIN_S3) {
			const result = await getObject({
				bucket: process.env.ICON_ORIGIN_S3,
				key: `${id}.svg`,
			})

			if (result?.body) {
				const data = await result.body.transformToByteArray()
				baseIcon = Buffer.from(data)
			}
		}

		// ----------------------------------------
		// Call the original icon fetcher

		if (!baseIcon && process.env.ICON_ORIGIN_LAMBDA) {
			const result = (await invoke({
				name: process.env.ICON_ORIGIN_LAMBDA,
				payload: { path },
			})) as string | undefined

			if (typeof result === 'string') {
				baseIcon = Buffer.from(result, 'base64')
			} else if (result === undefined) {
				return { statusCode: 404 }
			} else {
				throw new Error('Invalid response from icon origin lambda')
			}
		}

		// ----------------------------------------
		// Process the icon (SVG doesn't need processing with sharp)

		if (!baseIcon) {
			return { statusCode: 404 }
		}

		const { data } = optimize(baseIcon.toString('utf-8'), {
			path: 'path-to.svg',
			multipass: true,
			plugins: [
				{
					name: 'preset-default',
					params: {
						overrides: {
							...(config.preserveId
								? {
										cleanupIds: false,
									}
								: {}),
						},
					},
				},
			],
		})

		let icon = data as string

		if (config.symbols) {
			const symbols = svgstore()
			symbols.add(id, data)
			icon = symbols.toString({ inline: true })
		}

		// ----------------------------------------
		// Cache the image in S3

		if (process.env.ICON_CACHE_BUCKET) {
			await putObject({
				bucket: process.env.ICON_CACHE_BUCKET,
				key: path,
				body: icon,
				contentType: 'image/svg+xml',
				cacheControl: 'public, max-age=31536000, immutable',
			})
		}

		// ----------------------------------------

		return {
			statusCode: 200,
			body: Buffer.from(icon).toString('base64'),
			isBase64Encoded: true,
			headers: {
				'Content-Type': 'image/svg+xml',
				'Cache-Control': 'public, max-age=31536000, immutable',
			},
		}
	} catch (error) {
		console.error(error)
		return { statusCode: 500 }
	}
}
