
import { z } from 'zod'
import { definePlugin } from '../plugin.js';
import { ResourceIdSchema } from '../schema/resource-id.js';
import { Collection } from '../formation/resource/open-search-serverless/collection.js';
import { formatName } from '../formation/util.js';
import { TypeGen, TypeObject } from '../util/type-gen.js';

export const searchPlugin = definePlugin({
	name: 'search',
	schema: z.object({
		stacks: z.object({
			searchs: z.array(ResourceIdSchema).optional()
		}).array()
	}),
	onTypeGen({ config }) {
		const gen = new TypeGen('@awsless/awsless', 'SearchResources')

		for(const stack of config.stacks) {
			const list = new TypeObject()

			for(const id of stack.searchs || []) {
				const name = formatName(`${config.name}-${stack.name}-${id}`)
				list.addType(name, `{ readonly name: '${name}' }`)
			}

			gen.addType(stack.name, list.toString())
		}

		return gen.toString()
	},
	onStack({ config, stack, stackConfig, bind }) {
		for(const id of stackConfig.searchs || []) {
			const collection = new Collection(id, {
				name: `${config.name}-${stack.name}-${id}`,
				type: 'search',
			})

			bind(lambda => {
				lambda.addPermissions(collection.permissions)
			})
		}
	},
})
