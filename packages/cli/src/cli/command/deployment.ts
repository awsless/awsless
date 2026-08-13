import { CloudFrontClient } from '@aws-sdk/client-cloudfront'
import { CloudFrontKeyValueStoreClient } from '@aws-sdk/client-cloudfront-keyvaluestore'
import { LambdaClient } from '@aws-sdk/client-lambda'
import { S3Client } from '@aws-sdk/client-s3'
import { log } from '@awsless/clui'
import { DynamoDBClient } from '@awsless/dynamodb'
import { Command } from 'commander'
import { AppConfig } from '../../config/app.js'
import { getAccountId, getCredentials } from '../../util/aws.js'
import { Deployment, listDeployments, readLiveDeploymentId } from '../../util/deployment.js'
import { generateGlobalAppId, getBundleFunctionName } from '../../util/name.js'
import { layout } from '../ui/complex/layout.js'
import { color } from '../ui/style.js'

export const createClients = async (appConfig: AppConfig) => {
	const region = appConfig.region
	const credentials = await getCredentials(appConfig.profile)
	const accountId = await getAccountId(credentials, region)

	return {
		appId: generateGlobalAppId({ accountId, region, appName: appConfig.name }),
		functionName: getBundleFunctionName(appConfig.name),
		dynamo: new DynamoDBClient({ credentials, region }),
		lambda: new LambdaClient({ credentials, region }),
		kvs: new CloudFrontKeyValueStoreClient({ credentials, region }),
		cloudfront: new CloudFrontClient({ credentials, region: 'us-east-1' }),
		s3: new S3Client({ credentials, region }),
	}
}

const formatAge = (iso: string) => {
	const minutes = Math.floor((Date.now() - Date.parse(iso)) / 60_000)

	if (minutes < 1) return 'just now'
	if (minutes < 60) return `${minutes}m ago`
	if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h ago`

	return `${Math.floor(minutes / (60 * 24))}d ago`
}

const formatStatus = (item: Deployment, liveId?: string) => {
	if (item.id === liveId) return color.success('live    ')
	if (item.promotedAt) return 'promoted'
	if (item.functionVersion) return color.info('staged  ')

	return color.dim('pending ')
}

export const deployments = (program: Command) => {
	program
		.command('deployments')
		.description('List the deployment history of your app')
		.action(async () => {
			await layout('deployments', async ({ appConfig }) => {
				const { appId, functionName, dynamo, lambda } = await createClients(appConfig)

				const [items, liveId] = await Promise.all([
					listDeployments(dynamo, appId),
					readLiveDeploymentId(lambda, functionName),
				])

				if (items.length === 0) {
					return `No deployments found.`
				}

				const idWidth = Math.max(...items.map(item => item.id.length))

				log.message(
					items
						.map(item =>
							[
								color.label(item.id.padEnd(idWidth)),
								formatStatus(item, liveId),
								formatAge(item.createdAt).padEnd(8),
								color.dim(item.commit?.slice(0, 7) ?? '-------'),
								(item.message ?? '').slice(0, 50).padEnd(50),
								color.dim(item.user ?? ''),
							].join('  ')
						)
						.join('\n')
				)

				return `Found ${items.length} deployments.`
			})
		})
}
