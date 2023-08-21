
import { z } from 'zod'
import { definePlugin } from '../plugin.js';
// import { addResourceEnvironment, toId, toName } from '../util/resource.js';
import { ResourceIdSchema } from '../schema/resource-id.js';
import { Bucket } from '../formation/resource/s3/bucket.js';

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
