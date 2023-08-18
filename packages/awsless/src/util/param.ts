import { debug } from '../cli/logger.js'
import { style } from '../cli/style.js'
import { Config } from '../config.js'
import { DeleteParameterCommand, GetParameterCommand, GetParametersByPathCommand, ParameterType, PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm'

export const configParameterPrefix = (config: Config) => {
	return `/.awsless/${config.name}`
}

export class Params {
	private client: SSMClient

	constructor(private config: Config) {
		this.client = new SSMClient({
			credentials: config.credentials,
			region: config.region,
		})
	}

	private getName(name: string) {
		return `${configParameterPrefix(this.config)}/${name}`
	}

	async get(name: string) {
		debug('Get remote config value')
		debug('Name:', style.info(name))

		let result
		try {
			result = await this.client.send(new GetParameterCommand({
				Name: this.getName(name),
				WithDecryption: true,
			}))
		} catch(error) {
			if(error instanceof Error && error.name === 'ParameterNotFound') {
				debug('Parameter not found')
				return
			}

			throw error
		}

		const value = result.Parameter?.Value

		debug('Value:', style.info(value))
		debug('Done getting remote config value')

		return value
	}

	async set(name: string, value: string) {
		debug('Save remote config value')
		debug('Name:', style.info(name))
		debug('Value:', style.info(value))

		await this.client.send(new PutParameterCommand({
			Type: ParameterType.STRING,
			Name: this.getName(name),
			Value: value,
			Overwrite: true,
		}))

		debug('Done saving remote config value')
	}

	async delete(name: string) {
		debug('Delete remote config value')
		debug('Name:', style.info(name))

		try {
			await this.client.send(new DeleteParameterCommand({
				Name: this.getName(name),
			}))
		} catch(error) {
			if(error instanceof Error && error.name === 'ParameterNotFound') {
				debug('Remote config value was already deleted')
				return
			}

			throw error
		}

		debug('Done deleting remote config value')
	}

	async list() {

		debug('Load remote config values')

		const result = await this.client.send(new GetParametersByPathCommand({
			Path: configParameterPrefix(this.config),
			WithDecryption: true,
			MaxResults: 10,
			Recursive: true,
		}))

		debug('Done loading remote config values')

		const values: Record<string, string> = {}

		result.Parameters?.forEach(param => {
			const name = param.Name!
				.substring(configParameterPrefix(this.config).length)
				.substring(1)

			values[name] = param.Value || ''
		})

		return values
	}
}
