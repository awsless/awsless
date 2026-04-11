import {
	CloudFrontClient,
	CreateDistributionCommand,
	CreateInvalidationForDistributionTenantCommand,
	ListDistributionTenantsCommand,
	UpdateDistributionCommand,
} from '@aws-sdk/client-cloudfront' // ES Modules import
import { createCustomProvider, createCustomResourceClass, Input } from '@terraforge/core'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { Region } from '../config/schema/region'
import { Credentials } from '../util/aws'

type InvalidationInput = {
	distributionId: Input<string>
	paths: Input<Input<string>[]>
	version?: Input<string>
}

type InvalidationOutput = {
	// id: Output<string>
}

export const Invalidation = createCustomResourceClass<InvalidationInput, InvalidationOutput>(
	'cloudfront',
	'invalidation'
)

type ProviderProps = {
	credentials: Credentials
	region: Region
}

export const createCloudFrontProvider = (props: ProviderProps) => {
	const client = new CloudFrontClient(props)

	return createCustomProvider('cloudfront', {
		// distribution: {
		// 	async createResource(input) {
		// 		// tags: {
		// 		// 	name,
		// 		// },
		// 		// comment: name,
		// 		// enabled: true,
		// 		// viewerCertificate: [{ cloudfrontDefaultCertificate: true }],
		// 		// origin: [
		// 		// 	{
		// 		// 		id: 'default',
		// 		// 		domainName: 'placeholder.awsless.dev',
		// 		// 		customOriginConfig: [
		// 		// 			{
		// 		// 				httpPort: 80,
		// 		// 				httpsPort: 443,
		// 		// 				originProtocolPolicy: 'http-only',
		// 		// 				originReadTimeout: 20,
		// 		// 				originSslProtocols: ['TLSv1.2'],
		// 		// 			},
		// 		// 		],
		// 		// 	},
		// 		// ],
		// 		// customErrorResponse: Object.entries(props.errors ?? {}).map(([errorCode, item]) => {
		// 		// 	if (typeof item === 'string') {
		// 		// 		return {
		// 		// 			errorCode: Number(errorCode),
		// 		// 			responseCode: errorCode,
		// 		// 			responsePagePath: item,
		// 		// 		}
		// 		// 	}
		// 		// 	return {
		// 		// 		errorCode: Number(errorCode),
		// 		// 		errorCachingMinTtl: item.minTTL ? toSeconds(item.minTTL) : undefined,
		// 		// 		responseCode: item.statusCode?.toString() ?? errorCode,
		// 		// 		responsePagePath: item.path,
		// 		// 	}
		// 		// }),
		// 		// restrictions: [
		// 		// 	{
		// 		// 		geoRestriction: [
		// 		// 			{
		// 		// 				restrictionType: props.geoRestrictions.length > 0 ? 'blacklist' : 'none',
		// 		// 				items: props.geoRestrictions,
		// 		// 			},
		// 		// 		],
		// 		// 	},
		// 		// ],
		// 		// defaultCacheBehavior: [
		// 		// 	{
		// 		// 		compress: true,
		// 		// 		targetOriginId: 'default',
		// 		// 		functionAssociation: [
		// 		// 			{
		// 		// 				eventType: 'viewer-request',
		// 		// 				functionArn: viewerRequest.arn,
		// 		// 			},
		// 		// 		],
		// 		// 		originRequestPolicyId: originRequest.id,
		// 		// 		cachePolicyId: cache.id,
		// 		// 		responseHeadersPolicyId: responseHeaders.id,
		// 		// 		viewerProtocolPolicy: 'redirect-to-https',
		// 		// 		allowedMethods: [
		// 		// 			{
		// 		// 				items: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'OPTIONS', 'DELETE'],
		// 		// 				cachedMethods: ['GET', 'HEAD'],
		// 		// 			},
		// 		// 		],
		// 		// 	},
		// 		// ],
		// 		// 	webAclId: waf?.arn,
		// 		// client.send(
		// 		// 	new CreateDistributionCommand({
		// 		// 		DistributionConfig: {
		// 		// 			Enabled: true,
		// 		// 			ConnectionMode: 'tenant-only',
		// 		// 			''
		// 		// 		},
		// 		// 	})
		// 		// )
		// 		// new UpdateDistributionCommand({
		// 		// 	'Id'
		// 		// })
		// 	},
		// },
		invalidation: {
			async updateResource(input) {
				const state = z
					.object({
						distributionId: z.string(),
						paths: z.string().array().min(1),
					})
					.parse(input.proposedState)

				await createInvalidationForDistributionTenants(client, state)

				return {}
			},
		},
	})
}

export const createInvalidationForDistributionTenants = async (
	client: CloudFrontClient,
	props: {
		distributionId: string
		paths: string[]
	}
) => {
	let cursor: string | undefined
	do {
		const result = await client.send(
			new ListDistributionTenantsCommand({
				AssociationFilter: {
					DistributionId: props.distributionId,
				},
				MaxItems: 10,
				Marker: cursor,
			})
		)

		cursor = result.NextMarker

		for (const tenant of result.DistributionTenantList ?? []) {
			await client.send(
				new CreateInvalidationForDistributionTenantCommand({
					Id: tenant.Id,
					InvalidationBatch: {
						Paths: {
							Quantity: props.paths.length,
							Items: props.paths,
						},
						CallerReference: randomUUID(),
					},
				})
			)
		}
	} while (cursor)
}
