import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { workos } from '@awsless/terraforge-workos'
import { aws } from '@terraforge/aws'
import {
	App,
	createCustomProvider,
	DynamoLockBackend,
	enableDebug,
	S3StateBackend,
	StateBackend,
	WorkSpace,
} from '@terraforge/core'
import { debug } from '../cli/debug.js'
import { AppConfig } from '../config/app.js'
import { Region } from '../config/schema/region.js'
import { ExpectedError } from '../error.js'
import { formatProviderId } from '../feature/auth/index.js'
import { createCloudFrontKvsProvider } from '../formation/cloudfront-kvs.js'
import { createLambdaProvider } from '../formation/lambda.js'
import { createNameServersProvider } from '../formation/ns-check.js'
import { createOpenSearchProvider } from '../formation/open-search.js'
import { createS3Provider } from '../formation/s3.js'
import { Credentials } from './aws.js'
import { directories, fileExist } from './path.js'
import { SsmStore } from './ssm.js'

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

// One provider per auth environment, since each carries its own api key.
export type WorkOsProviderProps = {
	id: string
	apiKey: string
	clientId: string
}

// The api key lives in the app's remote config, so every command that
// touches workos resources resolves it the same way instead of each
// one plumbing config values through.
export const loadWorkOsProviders = async (props: {
	credentials: Credentials
	appConfig: AppConfig
}): Promise<WorkOsProviderProps[]> => {
	const environments = Object.entries(props.appConfig.auth ?? {})

	if (environments.length === 0) {
		return []
	}

	const store = new SsmStore(props)

	return Promise.all(
		environments.map(async ([id, auth]) => {
			const apiKey = await store.get(auth.apiKey)

			if (!apiKey) {
				throw new ExpectedError(
					`The auth environment "${id}" needs the "${auth.apiKey}" config to hold your WorkOS api key.`
				)
			}

			return {
				id: formatProviderId(id),
				clientId: auth.clientId,
				apiKey,
			}
		})
	)
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

export const createWorkSpace = async (props: BackendProps & { workos?: WorkOsProviderProps[] }) => {
	const { lock, state } = createDeploymentBackends(props)

	// The engine debug output always streams into the debug log file.
	enableDebug((group, ...args) => debug(`${group}:`, ...args))

	await aws.install()

	if (props.workos?.length) {
		await workos.install()
	}

	const cred = await props.credentials()

	const workspace = new WorkSpace({
		providers: [
			createLambdaProvider(props),
			createCloudFrontKvsProvider(props),
			createS3Provider(props),
			createNameServersProvider(props),
			createOpenSearchProvider(props),
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
			...(props.workos ?? []).map(({ id, apiKey, clientId }) => {
				return workos({ apiKey, clientId }, { id })
			}),
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
