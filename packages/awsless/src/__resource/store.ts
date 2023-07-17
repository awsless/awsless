import { Context } from '../stack'
import { Bucket, BucketAccessControl } from 'aws-cdk-lib/aws-s3'
import { Function } from 'aws-cdk-lib/aws-lambda'
import { addResourceEnvironment, toId, toName } from '../util/resource'

export const toStore = ({ stack }:Context, id:string) => {
	const bucket = new Bucket(stack, toId('store', id), {
		bucketName: toName(stack, id),
		accessControl: BucketAccessControl.PRIVATE,
	})

	return {
		bucket,
		bind(lambda:Function) {
			bucket.grantReadWrite(lambda),
			addResourceEnvironment(stack, 'store', id, lambda)
		}
	}
}
