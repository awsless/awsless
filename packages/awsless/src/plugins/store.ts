import { z } from 'zod'
import { definePlugin } from "../plugin";
import { addResourceEnvironment, toId, toName } from "../util/resource";
import { ResourceIdSchema } from "../schema/resource-id";
import { Bucket, BucketAccessControl } from "aws-cdk-lib/aws-s3";

export const storePlugin = definePlugin({
	name: 'store',
	schema: z.object({
		stacks: z.object({
			stores: z.array(ResourceIdSchema).optional()
		}).array()
	}),
	onStack({ stack, stackConfig, bind }) {
		(stackConfig.stores || []).forEach(id => {
			const bucket = new Bucket(stack, toId('store', id), {
				bucketName: toName(stack, id),
				accessControl: BucketAccessControl.PRIVATE,
			})

			bind((lambda) => {
				bucket.grantReadWrite(lambda),
				addResourceEnvironment(stack, 'store', id, lambda)
			})
		})
	},
})
