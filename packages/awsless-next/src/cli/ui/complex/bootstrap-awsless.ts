import {
	BillingMode,
	CreateTableCommand,
	DescribeTableCommand,
	DynamoDB,
	KeyType,
	ResourceNotFoundException,
	ScalarAttributeType,
} from '@aws-sdk/client-dynamodb'
import {
	CreateBucketCommand,
	HeadBucketCommand,
	PutBucketLifecycleConfigurationCommand,
	PutBucketVersioningCommand,
	S3Client,
	S3ServiceException,
} from '@aws-sdk/client-s3'
import { confirm, isCancel, log } from '@clack/prompts'
import { Region } from '../../../config/schema/region.js'
import { Cancelled } from '../../../error.js'
import { Credentials } from '../../../util/aws.js'
import { getStateBucketName } from '../../../util/workspace.js'
import { task } from '../util.js'

const hasLockTable = async (client: DynamoDB) => {
	try {
		const result = await client.send(
			new DescribeTableCommand({
				TableName: 'awsless-locks',
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

const createLockTable = (client: DynamoDB) => {
	return client.send(
		new CreateTableCommand({
			TableName: 'awsless-locks',
			BillingMode: BillingMode.PAY_PER_REQUEST,
			KeySchema: [
				{
					AttributeName: 'urn',
					KeyType: KeyType.HASH,
				},
			],
			AttributeDefinitions: [
				{
					AttributeName: 'urn',
					AttributeType: ScalarAttributeType.S,
				},
			],
		})
	)
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

	const [table, bucket] = await Promise.all([
		//
		hasLockTable(dynamo),
		hasStateBucket(s3, props.region, props.accountId),
	])

	if (!table || !bucket) {
		log.warn(`Awsless hasn't been bootstrapped yet.`)

		if (!process.env.SKIP_PROMPT) {
			const confirmed = await confirm({
				message: 'Would you like to bootstrap now?',
			})

			if (!confirmed || isCancel(confirmed)) {
				throw new Cancelled()
			}
		}

		await task('Bootstrapping', async update => {
			if (!table) {
				await createLockTable(dynamo)
			}

			if (!bucket) {
				await createStateBucket(s3, props.region, props.accountId)
			}

			update('Done deploying the bootstrap stack.')
		})
	} else {
		log.step('Awsless has already been bootstrapped.')
	}
}
