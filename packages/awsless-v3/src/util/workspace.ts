import { aws } from '@terraforge/aws'
import {
	App,
	DynamoActivityLogBackend,
	DynamoLockBackend,
	enableDebug,
	S3StateBackend,
	StateBackend,
	WorkSpace,
} from '@terraforge/core'
import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { userInfo } from 'node:os'
import { dirname, join } from 'path'
// import { fileURLToPath } from 'url'
import { Region } from '../config/schema/region.js'
import { createCloudFrontKvsProvider } from '../formation/cloudfront-kvs.js'
import { createCloudFrontProvider } from '../formation/cloudfront.js'
import { createLambdaProvider } from '../formation/lambda.js'
import { createNameServersProvider } from '../formation/ns-check.js'
import { createS3Provider } from '../formation/s3.js'
import { Credentials } from './aws.js'
import { directories, fileExist } from './path.js'

// aws.apigatewayv2.Api()

export const getStateBucketName = (region: Region, accountId: string) => {
	return `awsless-state-${region}-${accountId}`
}

export const createWorkSpace = async (props: {
	credentials: Credentials
	accountId: string
	// profile: string
	region: Region
}) => {
	const lock = new DynamoLockBackend({
		...props,
		tableName: 'awsless-locks',
	})

	const state = new S3StateBackend({
		...props,
		bucket: getStateBucketName(props.region, props.accountId),
	})

	const activityLog = new DynamoActivityLogBackend({
		...props,
		tableName: 'awsless-logs',
		user: userInfo().username,
	})

	// const terraform = new Terraform({
	// 	providerLocation: join(homedir(), `.awsless/providers`),
	// })

	if (process.env.VERBOSE) {
		enableDebug()
	}

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
			createCloudFrontProvider(props),
			createCloudFrontKvsProvider(props),
			createS3Provider(props),
			createNameServersProvider(props),
			aws(
				{
					accessKey: cred.accessKeyId,
					secretKey: cred.secretAccessKey,
					// token: cred.sessionToken,

					// profile: props.profile,
					region: props.region,
					maxRetries: 5,
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
					maxRetries: 5,
				},
				{
					id: 'global-aws',
				}
			),
		],
		concurrency: 15,
		backend: {
			activityLog,
			state,
			lock,
		},
	})

	return {
		workspace,
		activityLog,
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
		await writeFile(file, JSON.stringify(state, undefined, 2))
	}
}

export const pushRemoteState = async (app: App, stateBackend: StateBackend) => {
	const file = join(directories.state, `${app.urn}.json`)
	const data = await readFile(file, 'utf8')
	const state = JSON.parse(data)

	await stateBackend.update(app.urn, state)
}
