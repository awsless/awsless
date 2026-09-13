import {
	CreateTableCommand,
	DescribeTableCommand,
	DynamoDBClient,
	ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb'
import {
	CreateBucketCommand,
	HeadBucketCommand,
	PutBucketLifecycleConfigurationCommand,
	PutBucketVersioningCommand,
	S3Client,
	S3ServiceException,
} from '@aws-sdk/client-s3'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bootstrapAwsless } from '../src/cli/ui/complex/bootstrap-awsless'
import { credentials, sent } from './_kit'

const mocks = vi.hoisted(() => ({ steps: [] as string[], warnings: [] as string[] }))

vi.mock('@awsless/clui', async importOriginal => {
	const mod = await importOriginal<typeof import('@awsless/clui')>()

	return {
		...mod,
		log: {
			...mod.log,
			step: (message: string) => mocks.steps.push(message),
			warning: (message: string) => mocks.warnings.push(message),
		},
	}
})

// The table waiter polls for minutes in real life.
vi.mock('@aws-sdk/client-dynamodb', async importOriginal => {
	const mod = await importOriginal<typeof import('@aws-sdk/client-dynamodb')>()

	return { ...mod, waitUntilTableExists: vi.fn(async () => ({ state: 'SUCCESS' })) }
})

const mockAws = (present: { tables: string[]; bucket: boolean }) => {
	const dynamo = vi.spyOn(DynamoDBClient.prototype, 'send').mockImplementation(async (command: any) => {
		if (command instanceof DescribeTableCommand) {
			if (!present.tables.includes(command.input.TableName ?? '')) {
				throw new ResourceNotFoundException({ message: 'missing', $metadata: {} })
			}

			return { Table: { TableName: command.input.TableName } }
		}

		if (command instanceof CreateTableCommand) {
			return {}
		}

		throw new Error(`Unexpected DynamoDB command: ${command.constructor.name}`)
	})

	const s3 = vi.spyOn(S3Client.prototype, 'send').mockImplementation(async (command: any) => {
		if (command instanceof HeadBucketCommand) {
			if (!present.bucket) {
				throw new S3ServiceException({ name: 'NotFound', $fault: 'client', $metadata: {}, message: '' })
			}

			return { BucketRegion: 'us-east-1' }
		}

		if (
			command instanceof CreateBucketCommand ||
			command instanceof PutBucketVersioningCommand ||
			command instanceof PutBucketLifecycleConfigurationCommand
		) {
			return {}
		}

		throw new Error(`Unexpected S3 command: ${command.constructor.name}`)
	})

	return { dynamo, s3 }
}

const props = { region: 'us-east-1' as const, credentials, accountId: '123456789012' }

describe('bootstrap', () => {
	afterEach(() => {
		vi.restoreAllMocks()
		mocks.steps.length = 0
		mocks.warnings.length = 0
		delete process.env.SKIP_PROMPT
	})

	it('should leave a bootstrapped account alone', async () => {
		const { dynamo, s3 } = mockAws({ tables: ['awsless-locks', 'awsless-deployments'], bucket: true })

		await bootstrapAwsless(props)

		expect(mocks.steps).toEqual(['Awsless has already been bootstrapped.'])
		expect(sent(dynamo, CreateTableCommand)).toHaveLength(0)
		expect(sent(s3, CreateBucketCommand)).toHaveLength(0)
	})

	it('should create only the missing pieces', async () => {
		process.env.SKIP_PROMPT = '1'
		const { dynamo, s3 } = mockAws({ tables: ['awsless-locks'], bucket: false })

		await bootstrapAwsless(props)

		expect(mocks.warnings).toEqual([`Awsless hasn't been bootstrapped yet.`])
		expect(sent(dynamo, CreateTableCommand).map(command => command.input.TableName)).toEqual([
			'awsless-deployments',
		])
		expect(sent(s3, CreateBucketCommand)[0]?.input.Bucket).toBe('awsless-state-us-east-1-123456789012')
		expect(sent(s3, PutBucketVersioningCommand)).toHaveLength(1)
		expect(sent(s3, PutBucketLifecycleConfigurationCommand)[0]?.input.LifecycleConfiguration).toMatchObject({
			Rules: [{ NoncurrentVersionExpiration: { NoncurrentDays: 30 } }],
		})
	})

	it('should create both tables on a fresh account', async () => {
		process.env.SKIP_PROMPT = '1'
		const { dynamo } = mockAws({ tables: [], bucket: true })

		await bootstrapAwsless(props)

		expect(sent(dynamo, CreateTableCommand).map(command => command.input.TableName)).toEqual([
			'awsless-locks',
			'awsless-deployments',
		])
	})
})
