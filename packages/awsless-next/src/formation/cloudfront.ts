import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront' // ES Modules import
import { createCustomProvider, createCustomResourceClass, Input, Output } from '@awsless/formation'
import { z } from 'zod'
import { Region } from '../config/schema/region'

type InvalidationInput = {
	distributionId: Input<string>
	paths: Input<Input<string>[]>
	version?: Input<string>
}

type InvalidationOutput = {
	id: Output<string>
}

export const Invalidation = createCustomResourceClass<InvalidationInput, InvalidationOutput>(
	'cloudfront',
	'invalidation'
)

type ProviderProps = {
	profile: string
	region: Region
}

export const createCloudFrontProvider = ({ profile, region }: ProviderProps) => {
	const cloudFront = new CloudFrontClient({ profile, region })

	return createCustomProvider('cloudfront', {
		invalidation: {
			async updateResource(props) {
				const state = z
					.object({
						distributionId: z.string(),
						paths: z.string().array().min(1),
					})
					.parse(props.proposedState)

				const result = await cloudFront.send(
					new CreateInvalidationCommand({
						DistributionId: state.distributionId,
						InvalidationBatch: {
							Paths: {
								Quantity: state.paths.length,
								Items: state.paths,
							},
							CallerReference: props.idempotantToken,
						},
					})
				)

				return {
					...state,
					id: result.Invalidation?.Id,
				}
			},
		},
	})
}
