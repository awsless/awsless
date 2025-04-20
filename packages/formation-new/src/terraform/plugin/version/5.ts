import type { PluginClient } from '../client.ts'
import { parseProviderSchema, parseResourceSchema } from '../schema.ts'
import type { PluginServer } from '../server.ts'
import type { Plugin } from './type.ts'
import {
	decodeDynamicValue,
	encodeDynamicValue,
	formatInputState,
	formatOutputState,
	getResourceSchema,
} from './util.ts'

export const createPlugin5 = async ({
	server,
	client,
}: {
	server: PluginServer
	client: PluginClient
}): Promise<Plugin> => {
	const schema = await client.call('GetSchema')
	const provider = parseProviderSchema(schema.provider)
	const resources = parseResourceSchema(schema.resourceSchemas)
	const dataSources = parseResourceSchema(schema.dataSourceSchemas)

	return {
		schema() {
			return {
				provider,
				resources,
				dataSources,
			}
		},
		async stop() {
			await client.call('Stop')
			server.kill()
		},
		async configure(config) {
			const prepared = await client.call('PrepareProviderConfig', {
				config: encodeDynamicValue(formatInputState(provider, config)),
			})

			await client.call('Configure', {
				config: prepared.preparedConfig,
			})
		},
		async readResource(type, state) {
			const schema = getResourceSchema(resources, type)

			// console.log(state)
			// console.log(formatInputState(schema, state))

			const read = await client.call('ReadResource', {
				typeName: type,
				currentState: encodeDynamicValue(formatInputState(schema, state)),
			})

			// console.log(decodeDynamicValue(read.newState))

			return formatOutputState(schema, decodeDynamicValue(read.newState))
		},
		async readDataSource(type, state) {
			const schema = getResourceSchema(dataSources, type)

			// console.log(state)
			// console.log(formatInputState(schema, state))

			const read = await client.call('ReadDataSource', {
				typeName: type,
				config: encodeDynamicValue(formatInputState(schema, state)),
			})

			return formatOutputState(schema, decodeDynamicValue(read.state))
		},
		async validateResource(type, state) {
			const schema = getResourceSchema(resources, type)
			await client.call('ValidateResourceTypeConfig', {
				typeName: type,
				config: encodeDynamicValue(formatInputState(schema, state)),
			})
		},
		async applyResourceChange(
			type: string,
			priorState: Record<string, unknown> | null,
			proposedState: Record<string, unknown> | null
		) {
			const schema = getResourceSchema(resources, type)
			const preparedPriorState = formatInputState(schema, priorState)
			const preparedProposedState = formatInputState(schema, proposedState)

			// console.log(proposedState)
			// console.log(preparedProposedState)

			const plan = await client.call('PlanResourceChange', {
				typeName: type,
				priorState: encodeDynamicValue(preparedPriorState),
				proposedNewState: encodeDynamicValue(preparedProposedState),
				config: encodeDynamicValue(preparedProposedState),
			})

			const plannedState = decodeDynamicValue(plan.plannedState)

			// console.log(priorState)
			// console.log(preparedPriorState)
			// console.log(plannedState)

			const apply = await client.call('ApplyResourceChange', {
				typeName: type,
				priorState: encodeDynamicValue(preparedPriorState),
				plannedState: encodeDynamicValue(plannedState),
				config: encodeDynamicValue(plannedState),
			})

			return formatOutputState(schema, decodeDynamicValue(apply.newState))
		},
	}
}
