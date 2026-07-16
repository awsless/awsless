import {
	CloudFrontClient,
	CreateInvalidationForDistributionTenantCommand,
	ListDistributionTenantsCommand,
} from '@aws-sdk/client-cloudfront'
import { randomUUID } from 'crypto'

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
