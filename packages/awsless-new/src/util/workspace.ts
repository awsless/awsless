import { App, StateProvider, WorkSpace, aws, local } from '@awsless/formation'
import { Credentials } from './aws.js'
import { Region } from '../config/schema/region.js'
import { minutes } from '@awsless/duration'
import { directories } from './path.js'
import { dirname, join } from 'path'
import { mkdir, readFile, rm, writeFile } from 'fs/promises'

export const createWorkSpace = (props: { credentials: Credentials; region: Region }) => {
	const lockProvider = new aws.dynamodb.LockProvider({
		...props,
		tableName: 'awsless-locks',
	})

	const stateProvider = new aws.s3.StateProvider({
		...props,
		bucket: 'awsless-state',
	})

	const cloudProviders = aws.createCloudProviders({
		...props,
		timeout: minutes(60),
	})

	const workspace = new WorkSpace({
		lockProvider,
		stateProvider,
		cloudProviders,
	})

	return {
		workspace,
		lockProvider,
		stateProvider,
	}
}

export const createLocalStateProvider = () => {
	return new local.file.StateProvider({
		dir: directories.state,
	})
}

export const pullRemoteState = async (app: App, stateProvider: StateProvider) => {
	const file = join(directories.state, `${app.urn}.json`)
	const state = await stateProvider.get(app.urn)

	await mkdir(dirname(file), { recursive: true })

	if (typeof state === 'undefined') {
		await rm(file)
	} else {
		await writeFile(file, JSON.stringify(state, undefined, 2))
	}
}

export const pushRemoteState = async (app: App, stateProvider: StateProvider) => {
	const file = join(directories.state, `${app.urn}.json`)
	const data = await readFile(file, 'utf8')
	const state = JSON.parse(data)

	await stateProvider.update(app.urn, state)
}