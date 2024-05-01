import {
	BillingMode,
	CreateTableCommand,
	DescribeTableCommand,
	DynamoDB,
	KeyType,
	ResourceNotFoundException,
	ScalarAttributeType,
} from '@aws-sdk/client-dynamodb'
import { confirm, log } from '@clack/prompts'
import { Cancelled } from '../../../error.js'
import { task } from '../util.js'
import { CreateBucketCommand, HeadBucketCommand, S3Client, S3ServiceException } from '@aws-sdk/client-s3'
import { Region } from '../../../config/schema/region.js'
import { Credentials } from '../../../util/aws.js'

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

const hasStateBucket = async (client: S3Client) => {
	try {
		const result = await client.send(
			new HeadBucketCommand({
				Bucket: 'awsless-state',
			})
		)

		return !!result.BucketRegion
	} catch (error) {
		console.log(error)

		if (error instanceof S3ServiceException) {
			return false
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

const createStateBucket = (client: S3Client) => {
	return client.send(
		new CreateBucketCommand({
			Bucket: 'awsless-state',
		})
	)
}

export const bootstrapAwsless = async (props: { region: Region; credentials: Credentials }) => {
	const dynamo = new DynamoDB(props)
	const s3 = new S3Client(props)

	const [table, bucket] = await Promise.all([
		//
		hasLockTable(dynamo),
		hasStateBucket(s3),
	])

	if (!table || !bucket) {
		log.warn(`Your Awsless hasn't been bootstrapped yet.`)

		if (!process.env.SKIP_PROMPT) {
			const confirmed = await confirm({
				message: 'Would you like to bootstrap now?',
			})

			if (!confirmed) {
				throw new Cancelled()
			}
		}

		await task('Bootstrapping', async update => {
			if (!table) {
				await createLockTable(dynamo)
			}

			if (!bucket) {
				await createStateBucket(s3)
			}

			update('Done deploying the bootstrap stack')
		})
	} else {
		log.step('Awsless has already been bootstrapped.')
	}
}
