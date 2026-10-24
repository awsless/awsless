import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { aws } from '@terraforge/aws'
import { clickhouse } from '@terraforge/clickhouse'
import {
	App,
	createCustomProvider,
	DynamoLockBackend,
	enableDebug,
	Provider,
	S3StateBackend,
	StateBackend,
	WorkSpace,
} from '@terraforge/core'
import { debug } from '../cli/debug.js'
import { Region } from '../config/schema/region.js'
import { StackConfig } from '../config/stack.js'
import { ExpectedError } from '../error.js'
import { hasClickHouseTables } from '../feature/clickhouse/util.js'
import { createClickHouseProvider } from '../formation/clickhouse.js'
import { createCloudFrontKvsProvider } from '../formation/cloudfront-kvs.js'
import { createLambdaProvider } from '../formation/lambda.js'
import { createNameServersProvider } from '../formation/ns-check.js'
import { createOpenSearchProvider } from '../formation/open-search.js'
import { createS3Provider } from '../formation/s3.js'
import { Credentials } from './aws.js'
import { directories, fileExist } from './path.js'

export const getStateBucketName = (region: Region, accountId: string) => {
	return `awsless-state-${region}-${accountId}`
}

export const getAppReleaseLockUrn = (appId: string) => {
	return `urn:app-release:${appId}` as const
}

type BackendProps = {
	credentials: Credentials
	accountId: string
	region: Region
}

export const createDeploymentBackends = (props: BackendProps) => {
	const lock = new DynamoLockBackend({
		...props,
		tableName: 'awsless-locks',
	})

	const state = new S3StateBackend({
		...props,
		bucket: getStateBucketName(props.region, props.accountId),
	})

	return {
		lock,
		state,
	}
}

// The ClickHouse Cloud provider reads its api key from the env.
const CLICKHOUSE_ENV = ['CLICKHOUSE_ORG_ID', 'CLICKHOUSE_CLOUD_API_KEY', 'CLICKHOUSE_CLOUD_API_SECRET']

const assertClickHouseEnv = () => {
	const missing = CLICKHOUSE_ENV.filter(name => !process.env[name])

	if (missing.length > 0) {
		throw new ExpectedError(
			`Working with ClickHouse resources needs a ClickHouse Cloud API key. Set ${missing.join(', ')} in the environment.`
		)
	}
}

// The provider starts on the first ClickHouse resource it touches, which
// a delete or a state that still holds the service can do without any
// table in the config - so the check happens there, before the provider
// fails in its own words.
const guardClickHouse = (provider: Provider): Provider => {
	return new Proxy(provider, {
		get(target, key, receiver) {
			const value = Reflect.get(target, key, receiver)

			if (typeof value !== 'function' || key === 'ownResource' || key === 'destroy') {
				return value
			}

			return (...args: unknown[]) => {
				assertClickHouseEnv()
				return value.apply(target, args)
			}
		},
	})
}

export const createWorkSpace = async (
	props: BackendProps & {
		// The stacks about to deploy, so providers only they need install
		// up front.
		stackConfigs?: StackConfig[]
	}
) => {
	const { lock, state } = createDeploymentBackends(props)

	// The engine debug output always streams into the debug log file.
	enableDebug((group, ...args) => debug(`${group}:`, ...args))

	await aws.install()

	// Most apps never use ClickHouse, so its provider only downloads for a
	// deploy with ClickHouse tables. A state that still holds them, like
	// after the tables were removed, starts it on demand.
	if (props.stackConfigs && hasClickHouseTables(props.stackConfigs)) {
		assertClickHouseEnv()
		await clickhouse.install()
	}

	const cred = await props.credentials()

	const workspace = new WorkSpace({
		providers: [
			createLambdaProvider(props),
			createCloudFrontKvsProvider(props),
			createS3Provider(props),
			createNameServersProvider(props),
			createOpenSearchProvider(props),
			createClickHouseProvider(props),
			// Backwards compatibility for old states, can be removed later.
			createCustomProvider('cloudfront', {
				invalidation: {},
			}),
			aws({
				accessKey: cred.accessKeyId,
				secretKey: cred.secretAccessKey,
				// Temporary credentials (sso, assumed roles, ci oidc) are
				// rejected without their session token.
				token: cred.sessionToken,
				region: props.region,

				// Refreshing many resources at once throttles hard, so match
				// the terraform aws provider default.
				maxRetries: 25,
			}),
			aws(
				{
					accessKey: cred.accessKeyId,
					secretKey: cred.secretAccessKey,
					token: cred.sessionToken,
					region: 'us-east-1',
					maxRetries: 25,
				},
				{
					id: 'global-aws',
				}
			),
			// Starts lazily, on the first ClickHouse resource it touches.
			guardClickHouse(clickhouse({})),
		],
		concurrency: 15,
		backend: {
			state,
			lock,
		},
	})

	return {
		workspace,
		lock,
		state,
	}
}

export const pullRemoteState = async (app: App, stateBackend: StateBackend) => {
	const file = join(directories.state, `${app.urn}.json`)
	const state = await stateBackend.get(app.urn)

	await mkdir(dirname(file), { recursive: true })

	if (typeof state === 'undefined') {
		const exist = await fileExist(file)
		if (exist) {
			await rm(file)
		}
	} else {
		await writeFile(file, JSON.stringify(state, undefined, 2), { mode: 0o600 })
	}
}

export const pushRemoteState = async (app: App, stateBackend: StateBackend) => {
	const file = join(directories.state, `${app.urn}.json`)
	const data = await readFile(file, 'utf8')
	const state = JSON.parse(data)

	await stateBackend.update(app.urn, state)
}
