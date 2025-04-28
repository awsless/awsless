import {
	App,
	DynamoLockBackend,
	enableDebug,
	S3StateBackend,
	StateBackend,
	Terraform,
	WorkSpace,
} from '@awsless/formation'
import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { homedir } from 'os'
import { dirname, join } from 'path'
import { Region } from '../config/schema/region.js'
import { Credentials } from './aws.js'
import { directories, fileExist } from './path.js'

// $.aws.apigatewayv2.Api()

export const getStateBucketName = (region: Region, accountId: string) => {
	return `awsless-state-${region}-${accountId}`
}

export const createWorkSpace = async (props: {
	credentials: Credentials
	accountId: string
	profile: string
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

	const terraform = new Terraform({
		providerLocation: join(homedir(), `.awsless/providers`),
	})

	if (process.env.VERBOSE) {
		enableDebug()
	}

	const aws = await terraform.install('hashicorp', 'aws', '5.94.1')

	const workspace = new WorkSpace({
		providers: [
			aws(
				{
					profile: props.profile,
					region: props.region,
					maxRetries: 5,
				}
				// {
				// 	debug: true,
				// }
			),
			aws(
				{
					profile: props.profile,
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
		await writeFile(file, JSON.stringify(state, undefined, 2))
	}
}

export const pushRemoteState = async (app: App, stateBackend: StateBackend) => {
	const file = join(directories.state, `${app.urn}.json`)
	const data = await readFile(file, 'utf8')
	const state = JSON.parse(data)

	await stateBackend.update(app.urn, state)
}
