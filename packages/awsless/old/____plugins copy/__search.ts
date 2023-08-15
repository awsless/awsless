
import { definePlugin } from '../plugin.js';
import { z } from 'zod'
import { ResourceIdSchema } from '../schema/resource-id.js';
import { CfnCollection } from "aws-cdk-lib/aws-opensearchserverless";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { toId, toName } from '../util/resource.js';

export const searchPlugin = definePlugin({
	name: 'search',
	schema: z.object({
		stacks: z.object({
			searchs: z.array(ResourceIdSchema).optional()
		}).array()
	}),
	onStack({ stack, stackConfig, bind }) {
		(stackConfig.searchs || []).forEach(id => {
			const collection = new CfnCollection(stack, toId('search', id), {
				name: toName(stack, id),
				type: 'SEARCH',
			})

			// const policy = new CfnSecurityPolicy(stack, toId('search-policy', id), {
			// 	// name: toName(stack, id),
			// 	// type: 'SEARCH',
			// 	name: toName(stack, id),
			// 	type: 'network',
			// 	policy: ''
			// })

			bind(lambda => {
				lambda.addToRolePolicy(new PolicyStatement({
					actions: [ 'aoss:APIAccessAll' ],
					resources: [ collection.attrArn ],
				}))
			})
		})
	},
})
