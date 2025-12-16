import { invoke } from '@awsless/lambda'
import { getObject, putObject } from '@awsless/s3'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
// @ts-ignore
import { optimize } from 'svgo/browser'
// @ts-ignore
import svgstore from 'svgstore'

export default async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
	try {
		const path = event.rawPath.startsWith('/') ? event.rawPath.slice(1) : event.rawPath

		// ----------------------------------------
		// Get the icon configuration

		const configsEnv = process.env.ICON_CONFIG

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

		if (process.env.ICON_ORIGIN_S3) {
			const result = await getObject({
				bucket: process.env.ICON_ORIGIN_S3,
				key: path,
			})

			if (result?.body) {
				const data = await result.body.transformToByteArray()
				baseIcon = Buffer.from(data)
			}
		}

		// ----------------------------------------
		// Call the lamba origin function

		if (!baseIcon && process.env.ICON_ORIGIN_LAMBDA) {
			const result = (await invoke({
				name: process.env.ICON_ORIGIN_LAMBDA,
				payload: { path },
			})) as string | undefined

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
						overrides: {
							...(config.preserveIds
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
			symbols.add('default', data)
			icon = symbols.toString({ inline: true })
		}

		// ----------------------------------------
		// Cache the image in S3

		await putObject({
			bucket: process.env.ICON_CACHE_BUCKET!,
			key: path,
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
