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
import { fetchClickHouseKey, loadClickHouseKey, missingClickHouseKey } from '../cli/ui/complex/fetch-clickhouse-key.js'
import { Region } from '../config/schema/region.js'
import { StackConfig } from '../config/stack.js'
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

// Without a stored key the provider fails in its own words on the first
// ClickHouse resource it touches, which a delete or a state that still
// holds the service can do without any table in the config.
const requireClickHouseKey = (provider: Provider, accountId: string): Provider => {
	return new Proxy(provider, {
		get(target, key, receiver) {
			const value = Reflect.get(target, key, receiver)

			if (typeof value !== 'function' || key === 'ownResource' || key === 'destroy') {
				return value
			}

			return () => {
				throw missingClickHouseKey(accountId)
			}
		},
	})
}

export const createWorkSpace = async (
	props: BackendProps & {
		// The stacks about to deploy, so providers only they need install
		// up front.
		stackConfigs?: StackConfig[]
		// The whole app is being deleted, its ClickHouse service included.
		deletingApp?: boolean
	}
) => {
	const { lock, state } = createDeploymentBackends(props)

	// The engine debug output always streams into the debug log file.
	enableDebug((group, ...args) => debug(`${group}:`, ...args))

	await aws.install()

	// Most apps never use ClickHouse, so its provider only downloads & its
	// key is only asked for on a deploy with ClickHouse tables. A state that
	// still holds them, like after the tables were removed, starts it on
	// demand with the stored key.
	const usesClickHouse = !!props.stackConfigs && hasClickHouseTables(props.stackConfigs)
	const clickhouseKey = usesClickHouse
		? await fetchClickHouseKey(props.accountId)
		: await loadClickHouseKey(props.accountId)

	if (usesClickHouse) {
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
			createClickHouseProvider({
				...props,
				dropTables: !props.deletingApp,
				cloudKey: clickhouseKey,
			}),
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
			// Starts lazily, on the first ClickHouse resource it touches, with
			// the key from the keychain like the aws credentials.
			clickhouseKey ? clickhouse(clickhouseKey) : requireClickHouseKey(clickhouse({}), props.accountId),
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
