import { createDebugger } from '../formation/debug.ts'
import { createPluginClient } from './plugin/client.ts'
import { downloadPlugin } from './plugin/download.ts'
import type { Version } from './plugin/registry.ts'
import { createPluginServer } from './plugin/server.ts'
import { createPlugin5 } from './plugin/version/5.ts'
import { createPlugin6 } from './plugin/version/6.ts'
import type { Plugin } from './plugin/version/type.ts'
import { TerraformProvider } from './provider.ts'

// declare global {
// 	export namespace $terraform {}
// }

type Global = typeof globalThis
type GlobalType<T> = T extends keyof Global ? Global[T] : any

type ProviderInput<T extends string, TT extends 'Provider'> = T extends keyof GlobalType<'$terraform'>
	? TT extends keyof GlobalType<'$terraform'>[T]
		? GlobalType<'$terraform'>[T][TT]
		: Record<string, unknown>
	: Record<string, unknown>

type ProviderConfig = {
	id?: string
	debug?: boolean
}

const debug = createDebugger('Plugin')

export class Terraform {
	constructor(
		private props: {
			providerLocation: string
		}
	) {}

	async install<T extends string>(org: string, type: T, version: Version = 'latest') {
		const { file, version: realVersion } = await downloadPlugin(this.props.providerLocation, org, type, version)

		return (input: ProviderInput<T, 'Provider'>, config?: ProviderConfig) => {
			const createLazyPlugin = async () => {
				const server = await createPluginServer({ file, debug: config?.debug })
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

			return new TerraformProvider(type, config?.id ?? 'default', createLazyPlugin, input)
		}
	}
}
