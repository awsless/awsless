import { getObject, putObject } from '@awsless/s3'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { getRouteEnv, internalInvoke } from 'awsless'
// @ts-ignore
import { optimize } from 'svgo/browser'
// @ts-ignore
import svgstore from 'svgstore'

export default async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
	try {
		const path = event.rawPath.startsWith('/') ? event.rawPath.slice(1) : event.rawPath
		const bucket = getRouteEnv('ICON_BUCKET')
		const folder = getRouteEnv('ICON_FOLDER') ?? ''
		const cacheKey = `${folder}cache/${path}`

		// ----------------------------------------
		// Get cached svg from s3

		if (bucket) {
			const cachedIcon = await getObject({
				bucket,
				key: cacheKey,
			})

			if (cachedIcon) {
				const cachedIconData = await cachedIcon.body.transformToByteArray()

				return {
					statusCode: 200,
					body: Buffer.from(cachedIconData).toString('base64'),
					isBase64Encoded: true,
					headers: {
						'Content-Type': 'image/svg+xml',
						'Cache-Control': 'public, max-age=31536000, immutable',
					},
				}
			}
		}

		// ----------------------------------------
		// Get the icon configuration

		const configsEnv = getRouteEnv('ICON_CONFIG')

		if (!configsEnv) {
			throw new Error('Icon config not found in environment variables')
		}

		const config: {
			preserveIds: boolean
			symbols: boolean
		} = JSON.parse(configsEnv)

		// ----------------------------------------
		// Check if image is in the S3 bucket

		let baseIcon: Buffer | undefined

		if (getRouteEnv('ICON_ORIGIN_S3')) {
			const result = await getObject({
				bucket: bucket!,
				key: `${folder}origin/${path}`,
			})

			if (result?.body) {
				const data = await result.body.transformToByteArray()
				baseIcon = Buffer.from(data)
			}
		}

		// ----------------------------------------
		// Call the lamba origin function

		const originRoute = getRouteEnv('ICON_ORIGIN')

		if (!baseIcon && originRoute) {
			const result = (await internalInvoke(originRoute, { path })) as string | undefined

			if (typeof result === 'string') {
				baseIcon = Buffer.from(result)
			} else if (result === undefined) {
				return { statusCode: 404 }
			} else {
				throw new Error('Invalid response from icon origin lambda')
			}
		}

		// ----------------------------------------
		// Process the icon

		if (!baseIcon) {
			return { statusCode: 404 }
		}

		const { data } = optimize(baseIcon.toString('utf-8'), {
			multipass: true,
			plugins: [
				{
					name: 'preset-default',
					params: {
						overrides: config.preserveIds
							? {
									cleanupIds: false,
								}
							: {},
					},
				},
			],
		})

		let icon = data

		if (config.symbols) {
			const symbols = svgstore()
			symbols.add('default', data)
			icon = symbols.toString({ inline: true })
		}

		// ----------------------------------------
		// Cache the image in S3

		await putObject({
			bucket: bucket!,
			key: cacheKey,
			body: icon,
			contentType: 'image/svg+xml',
			cacheControl: 'public, max-age=31536000, immutable',
		})

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
