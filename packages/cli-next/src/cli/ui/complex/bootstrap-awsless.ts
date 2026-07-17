import { DescribeTableCommand, DynamoDB, ResourceNotFoundException } from '@aws-sdk/client-dynamodb'
import {
	CreateBucketCommand,
	HeadBucketCommand,
	PutBucketLifecycleConfigurationCommand,
	PutBucketVersioningCommand,
	S3Client,
	S3ServiceException,
} from '@aws-sdk/client-s3'
import { log, prompt } from '@awsless/clui'
import { DynamoDBClient, migrate } from '@awsless/dynamodb'
import { Region } from '../../../config/schema/region.js'
import { Cancelled } from '../../../error.js'
import { Credentials } from '../../../util/aws.js'
import { deploymentsTable } from '../../../util/deployment.js'
import { getStateBucketName } from '../../../util/workspace.js'

const lockTableInput = {
	TableName: 'awsless-locks',
	KeySchema: [{ AttributeName: 'urn', KeyType: 'HASH' as const }],
	AttributeDefinitions: [{ AttributeName: 'urn', AttributeType: 'S' as const }],
}

const activityLogTableInput = {
	TableName: 'awsless-logs',
	KeySchema: [
		{ AttributeName: 'urn', KeyType: 'HASH' as const },
		{ AttributeName: 'date', KeyType: 'RANGE' as const },
	],
	AttributeDefinitions: [
		{ AttributeName: 'urn', AttributeType: 'S' as const },
		{ AttributeName: 'date', AttributeType: 'N' as const },
	],
}

const hasTable = async (client: DynamoDB, name: string) => {
	try {
		const result = await client.send(
			new DescribeTableCommand({
				TableName: name,
			})
		)

		return !!result.Table
	} catch (error) {
		if (error instanceof ResourceNotFoundException) {
			return false
		}

		throw error
	}
}

const hasStateBucket = async (client: S3Client, region: Region, accountId: string) => {
	try {
		const result = await client.send(
			new HeadBucketCommand({
				Bucket: getStateBucketName(region, accountId),
			})
		)

		return !!result.BucketRegion
	} catch (error) {
		if (error instanceof S3ServiceException) {
			if (error.name === 'NotFound') {
				return false
			}
		}

		throw error
	}
}

const createStateBucket = async (client: S3Client, region: Region, accountId: string) => {
	const name = getStateBucketName(region, accountId)

	await client.send(
		new CreateBucketCommand({
			Bucket: name,
		})
	)

	await client.send(
		new PutBucketVersioningCommand({
			Bucket: name,
			VersioningConfiguration: {
				Status: 'Enabled',
			},
		})
	)

	await client.send(
		new PutBucketLifecycleConfigurationCommand({
			Bucket: name,
			LifecycleConfiguration: {
				Rules: [
					{
						ID: 'delete-older-versions',
						Status: 'Enabled',
						NoncurrentVersionExpiration: {
							NoncurrentDays: 30,
						},
					},
				],
			},
		})
	)
}

export const bootstrapAwsless = async (props: { region: Region; credentials: Credentials; accountId: string }) => {
	const dynamo = new DynamoDB(props)
	const s3 = new S3Client(props)

	const [lockTable, logTable, deployTable, stateBucket] = await Promise.all([
		//
		hasTable(dynamo, lockTableInput.TableName),
		hasTable(dynamo, activityLogTableInput.TableName),
		hasTable(dynamo, deploymentsTable.name),
		hasStateBucket(s3, props.region, props.accountId),
	])

	if (!lockTable || !stateBucket || !logTable || !deployTable) {
		log.warning(`Awsless hasn't been bootstrapped yet.`)

		if (!process.env.SKIP_PROMPT) {
			const confirmed = await prompt.confirm({
				message: 'Would you like to bootstrap now?',
			})

			if (!confirmed) {
				throw new Cancelled()
			}
		}

		await log.task({
			initialMessage: 'Bootstrapping...',
			successMessage: 'Done deploying the bootstrap stack.',
			errorMessage: 'Failed to bootstrap Awsless.',
			async task() {
				const client = new DynamoDBClient(props)

				if (!lockTable) {
					await migrate(client, lockTableInput)
				}

				if (!logTable) {
					await migrate(client, activityLogTableInput)
				}

				if (!deployTable) {
					await migrate(client, deploymentsTable)
				}

				if (!stateBucket) {
					await createStateBucket(s3, props.region, props.accountId)
				}
			},
		})
	} else {
		log.step('Awsless has already been bootstrapped.')
	}
}
