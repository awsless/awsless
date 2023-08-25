
import { z } from 'zod'
import { definePlugin } from '../plugin.js';
import { ResourceIdSchema } from '../schema/resource-id.js';
import { Collection } from '../formation/resource/open-search-serverless/collection.js';

export const searchPlugin = definePlugin({
	name: 'search',
	schema: z.object({
		stacks: z.object({
			searchs: z.array(ResourceIdSchema).optional()
		}).array()
	}),
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
