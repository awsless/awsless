import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { CreateProps, DeleteProps, GetDataProps, GetProps, Provider, UpdateProps } from '../formation/provider.ts'
import { State } from '../formation/resource.ts'
import { Plugin } from './plugin/version/type.ts'
import { generateTypes } from './type-gen.ts'

declare global {
	interface TerraformProviders {}
}

export class TerraformProvider implements Provider {
	private configured?: Promise<void>
	private plugin?: Promise<Plugin>

	constructor(
		private type: string,
		private id: string,
		private createPlugin: () => Promise<Plugin>,
		private config: State
	) {}

	private async configure() {
		const plugin = await this.prepare()

		if (!this.configured) {
			this.configured = plugin.configure(this.config)
		}

		await this.configured

		return plugin
	}

	private prepare() {
		if (!this.plugin) {
			this.plugin = this.createPlugin()
		}

		return this.plugin
	}

	async destroy() {
		if (this.plugin) {
			const plugin = await this.plugin
			plugin.stop()

			this.plugin = undefined
			this.configured = undefined
		}
	}

	ownResource(id: string) {
		return `terraform:${this.type}:${this.id}` === id
	}

	async getResource({ type, state }: GetProps) {
		const plugin = await this.configure()
		const newState = await plugin.readResource(type, state)

		console.log('STATE', newState)

		if (!newState) {
			throw new Error(`Resource not found ${type}`)
		}

		return {
			version: 0,
			state: newState,
		}
	}

	async createResource({ type, state }: CreateProps) {
		const plugin = await this.configure()
		const newState = await plugin.applyResourceChange(type, null, state)

		return {
			version: 0,
			state: newState,
		}
	}

	async updateResource({ type, priorState, proposedState }: UpdateProps) {
		const plugin = await this.configure()
		const newState = await plugin.applyResourceChange(type, priorState, proposedState)

		return {
			version: 0,
			state: newState,
		}
	}

	async deleteResource({ type, state }: DeleteProps) {
		const plugin = await this.configure()
		await plugin.applyResourceChange(type, state, null)
	}

	async getData({ type, state }: GetDataProps) {
		const plugin = await this.configure()
		const data = await plugin.readDataSource(type, state)

		if (!data) {
			throw new Error(`Data source not found ${type}`)
		}

		return {
			state: data,
		}
	}

	async generateTypes(dir: string) {
		const plugin = await this.prepare()
		const schema = plugin.schema()
		const types = generateTypes(
			{
				[this.type]: schema.provider,
			},
			schema.resources,
			schema.dataSources
		)

		await writeFile(join(dir, `${this.type}.types.d.ts`), types)
		await this.destroy()
	}
}
