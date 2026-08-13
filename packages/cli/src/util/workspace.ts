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
import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
// import { fileURLToPath } from 'url'
import { debug } from '../cli/debug.js'
import { Region } from '../config/schema/region.js'
import { createCloudFrontKvsProvider } from '../formation/cloudfront-kvs.js'
import { createLambdaProvider } from '../formation/lambda.js'
import { createNameServersProvider } from '../formation/ns-check.js'
import { createOpenSearchProvider } from '../formation/open-search.js'
import { createS3Provider } from '../formation/s3.js'
import { Credentials } from './aws.js'
import { directories, fileExist } from './path.js'

// aws.apigatewayv2.Api()

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

export const createWorkSpace = async (props: BackendProps) => {
	const { lock, state } = createDeploymentBackends(props)

	// const terraform = new Terraform({
	// 	providerLocation: join(homedir(), `.awsless/providers`),
	// })

	// The engine debug output always streams into the debug log file.
	enableDebug((group, ...args) => debug(`${group}:`, ...args))

	await aws.install()

	// const __dirname = dirname(fileURLToPath(import.meta.url))
	// await aws({}).generateTypes(join(__dirname, './formation.d.ts'))
	// console.log(join(__dirname, './formation.d.ts'))

	// // aws.cloudfrontkeyvaluestore.Key
	//

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
			aws(
				{
					accessKey: cred.accessKeyId,
					secretKey: cred.secretAccessKey,
					// token: cred.sessionToken,

					// profile: props.profile,
					region: props.region,

					// Control plane calls like dynamodb DescribeTimeToLive
					// throttle hard when we refresh many resources at once,
					// so match the terraform aws provider default of 25.
					maxRetries: 25,
				}
				// {
				// 	debug: true,
				// }
			),
			aws(
				{
					accessKey: cred.accessKeyId,
					secretKey: cred.secretAccessKey,
					// token: cred.sessionToken,

					// profile: props.profile,
					region: 'us-east-1',
					maxRetries: 25,
				},
				{
					id: 'global-aws',
				}
			),
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
