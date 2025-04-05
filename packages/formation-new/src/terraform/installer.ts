import { createDebugger } from '../formation/debug.ts'
import { createPluginClient } from './plugin/client.ts'
import { downloadPlugin } from './plugin/download.ts'
import type { Version } from './plugin/registry.ts'
import { createPluginServer } from './plugin/server.ts'
import { createPlugin5 } from './plugin/version/5.ts'
import { createPlugin6 } from './plugin/version/6.ts'
import type { Plugin } from './plugin/version/type.ts'
import { TerraformProvider } from './provider.ts'

type ProviderConfig<T extends string> = T extends keyof TerraformProviders
	? TerraformProviders[T]
	: Record<string, unknown>

const debug = createDebugger('Plugin')

export class Terraform {
	constructor(
		private props: {
			providerLocation: string
		}
	) {}

	async install<T extends string>(org: string, type: T, version: Version = 'latest') {
		const { file, version: realVersion } = await downloadPlugin(this.props.providerLocation, org, type, version)

		return (config: ProviderConfig<T>, id: string = 'default') => {
			const createLazyPlugin = async () => {
				const server = await createPluginServer({ file, debug: false })
				const client = await createPluginClient(server)
				const plugins: Record<number, () => Promise<Plugin>> = {
					5: () => createPlugin5({ server, client }),
					6: () => createPlugin6({ server, client }),
				}

				const plugin = await plugins[server.version]?.()

				debug(org, type, realVersion)

				if (!plugin) {
					throw new Error(`No plugin client available for protocol version ${server.version}`)
				}

				return plugin
			}

			return new TerraformProvider(type, id, createLazyPlugin, config)
		}
	}
}
