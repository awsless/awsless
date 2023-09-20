
import { z } from 'zod'
import { definePlugin } from '../plugin.js';
// import { addResourceEnvironment, toId, toName } from '../util/resource.js';
import { ResourceIdSchema } from '../schema/resource-id.js';
import { Bucket } from '../formation/resource/s3/bucket.js';
import { TypeGen, TypeObject } from '../util/type-gen.js';
import { formatName } from '../formation/util.js';

export const storePlugin = definePlugin({
	name: 'store',
	schema: z.object({
		stacks: z.object({
			/** Define the stores in your stack.
			 * @example
			 * {
			 *   stores: [ 'STORE_NAME' ]
			 * }
			 */
			stores: z.array(ResourceIdSchema).optional()
		}).array()
	}),
	onTypeGen({ config }) {
		const types = new TypeGen('@awsless/awsless', 'StoreResources')
		for(const stack of config.stacks) {
			const list = new TypeObject()
			for(const name of stack.stores || []) {
				const storeName = formatName(`${config.name}-${stack.name}-${name}`)
				list.addType(name, `{ name: '${storeName}' }`)
			}

			types.addType(stack.name, list.toString())
		}

		return types.toString()
	},
	onStack({ config, stack, stackConfig, bind }) {

		for(const id of stackConfig.stores || []) {
			const bucket = new Bucket(id, {
				name: `${config.name}-${stack.name}-${id}`,
				accessControl: 'private',
			})

			stack.add(bucket)

			bind(lambda => {
				lambda.addPermissions(bucket.permissions)
			})
		}
	},
})
