import {
	CloudFrontClient,
	CreateInvalidationForDistributionTenantCommand,
	ListDistributionTenantsCommand,
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
	return createCustomProvider('cloudfront', {
		invalidation: {
			async updateResource(input) {
				const state = z
					.object({
						distributionId: z.string(),
						paths: z.string().array().min(1),
					})
					.parse(input.proposedState)

				await createInvalidationForDistributionTenants({
					...props,
					...state,
				})

				return {}
			},
		},
	})
}

export const createInvalidationForDistributionTenants = async ({
	distributionId,
	credentials,
	region,
	paths,
}: {
	credentials: Credentials
	region: Region
	distributionId: string
	paths: string[]
}) => {
	const client = new CloudFrontClient({ credentials, region })

	let cursor: string | undefined
	do {
		const result = await client.send(
			new ListDistributionTenantsCommand({
				AssociationFilter: {
					DistributionId: distributionId,
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
							Quantity: paths.length,
							Items: paths,
						},
						CallerReference: randomUUID(),
					},
				})
			)
		}
	} while (cursor)
}
