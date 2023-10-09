
import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";
import { CloudFormationCustomResourceEvent } from 'aws-lambda'
import { send } from '../util.js'

const client = new CloudFrontClient({})

type Props = {
	distributionId: string
	paths: string[]
}

export const handler = async (event: CloudFormationCustomResourceEvent) => {

	const type = event.RequestType
	const { distributionId, paths } = (
		event.ResourceProperties as unknown as Props
	)

	console.log('Type', type);
	console.log('DistributionId', distributionId);
	console.log('Paths', paths);

	try {
		if(type === 'Update') {
			await invalidateCache(distributionId, paths)
		}

		await send(event, distributionId, 'SUCCESS')
	} catch(error) {
		if (error instanceof Error) {
			await send(event, distributionId, 'FAILED', {}, error.message)
		} else {
			await send(event, distributionId, 'FAILED', {}, 'Unknown error')
		}

		console.error(error);
	}
}

const invalidateCache = async (distributionId: string, paths: string[]) => {
	const result = await client.send(new CreateInvalidationCommand({
		DistributionId: distributionId,
		InvalidationBatch: {
			CallerReference: Date.now().toString(),
			Paths: {
				Quantity: paths.length,
				Items: paths,
			},
		},
	}))

	return result.Invalidation!.Id!
}
