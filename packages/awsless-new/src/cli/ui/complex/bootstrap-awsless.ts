import {
	BillingMode,
	CreateTableCommand,
	DescribeTableCommand,
	DynamoDB,
	DynamoDBClientConfig,
	KeyType,
	ResourceNotFoundException,
	ScalarAttributeType,
} from '@aws-sdk/client-dynamodb'
import { confirm, log, spinner } from '@clack/prompts'
import { Cancelled } from '../../../error.js'
import { color } from '../style.js'

const hasStateTable = async (client: DynamoDB) => {
	try {
		const result = await client.send(
			new DescribeTableCommand({
				TableName: 'awsless-state',
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

const createStateTable = (client: DynamoDB) => {
	return client.send(
		new CreateTableCommand({
			TableName: 'awsless-state',
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

export const bootstrapAwsless = async (opts: DynamoDBClientConfig) => {
	const client = new DynamoDB(opts)

	const table = await hasStateTable(client)

	if (!table) {
		log.warn(`Your Awsless hasn't been bootstrapped yet.`)

		if (!process.env.SKIP_PROMPT) {
			const confirmed = await confirm({
				message: 'Would you like to bootstrap now?',
			})

			if (!confirmed) {
				throw new Cancelled()
			}
		}

		const spin = spinner()
		spin.start('Bootstrapping')

		try {
			await createStateTable(client)
		} catch (error) {
			spin.stop(color.error`Failed.`, 4)
			throw error
		}

		spin.stop('Done deploying the bootstrap stack')
	} else {
		log.step('Awsless has already been bootstrapped.')
	}
}
