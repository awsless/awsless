import { debug } from '../cli/debug.js'
import { color } from '../cli/ui/style.js'
import {
	DeleteParameterCommand,
	GetParameterCommand,
	GetParametersByPathCommand,
	ParameterType,
	PutParameterCommand,
	SSMClient,
} from '@aws-sdk/client-ssm'
import { Credentials } from './aws.js'
import { AppConfig } from '../config/app.js'

export const configParameterPrefix = (appName: string) => {
	return `/.awsless/${appName}`
}

export class SsmStore {
	private client: SSMClient

	constructor(
		private props: {
			credentials: Credentials
			appConfig: AppConfig
		}
	) {
		this.client = new SSMClient({
			credentials: props.credentials,
			region: props.appConfig.region,
		})
	}

	private getName(name: string) {
		return `${configParameterPrefix(this.props.appConfig.name)}/${name}`
	}

	async get(name: string) {
		debug('Get remote config value')
		debug('Name:', color.info(name))

		let result
		try {
			result = await this.client.send(
				new GetParameterCommand({
					Name: this.getName(name),
					WithDecryption: true,
				})
			)
		} catch (error) {
			if (error instanceof Error && error.name === 'ParameterNotFound') {
				debug('Parameter not found')
				return
			}

			throw error
		}

		const value = result.Parameter?.Value

		debug('Value:', color.info(value))
		debug('Done getting remote config value')

		return value
	}

	async set(name: string, value: string) {
		debug('Save remote config value')
		debug('Name:', color.info(name))
		debug('Value:', color.info(value))

		await this.client.send(
			new PutParameterCommand({
				Type: ParameterType.STRING,
				Name: this.getName(name),
				Value: value,
				Overwrite: true,
			})
		)

		debug('Done saving remote config value')
	}

	async delete(name: string) {
		debug('Delete remote config value')
		debug('Name:', color.info(name))

		try {
			await this.client.send(
				new DeleteParameterCommand({
					Name: this.getName(name),
				})
			)
		} catch (error) {
			if (error instanceof Error && error.name === 'ParameterNotFound') {
				debug('Remote config value was already deleted')
				return
			}

			throw error
		}

		debug('Done deleting remote config value')
	}

	async list() {
		debug('Load remote config values')

		const result = await this.client.send(
			new GetParametersByPathCommand({
				Path: configParameterPrefix(this.props.appConfig.name),
				WithDecryption: true,
				MaxResults: 10,
				Recursive: true,
			})
		)

		debug('Done loading remote config values')

		const values: Record<string, string> = {}

		result.Parameters?.forEach(param => {
			const name = param
				.Name!.substring(configParameterPrefix(this.props.appConfig.name).length)
				.substring(1)

			values[name] = param.Value || ''
		})

		return values
	}
}
