import { aws } from '@terraforge/aws'
import { Group, Output } from '@terraforge/core'
import { kebabCase } from 'change-case'
import { defineFeature } from '../../feature.js'
import { formatGlobalResourceName } from '../../util/name.js'

// Every feature stores its files inside one shared app bucket,
// namespaced by a folder per feature.
export const getFeatureFolder = (feature: string, stackName: string, resourceName: string) => {
	return `${feature}/${kebabCase(stackName)}/${kebabCase(resourceName)}/`
}

export type BucketLifecycleRule = {
	id: string
	enabled: boolean
	prefix?: string
	expiration?: { days: number }
	noncurrentVersionExpiration?: { days: number }
}

export const assetFeature = defineFeature({
	name: 'asset',
	onBefore(ctx) {
		// The features add lifecycle rules for the bucket folders they own &
		// the bucket resolves the final list at deploy time.
		const lifecycleRules: BucketLifecycleRule[] = [
			// Expire the old object versions.
			{
				id: 'expire-noncurrent',
				enabled: true,
				noncurrentVersionExpiration: { days: 30 },
			},
		]

		// The group path & physical name still use the old "store" naming,
		// so existing deployments keep their bucket.
		const group = new Group(ctx.base, 'store', 'asset')
		const name = formatGlobalResourceName({
			appName: ctx.appConfig.name,
			resourceType: 'store',
			resourceName: 'assets',
			postfix: ctx.appId,
		})

		const bucket = new aws.s3.Bucket(
			group,
			'bucket',
			{
				bucket: name,
				versioning: {
					enabled: true,
				},
				forceDestroy: true,
				corsRule: [
					// Presigned post uploads & browser reads through CloudFront.
					{
						allowedOrigins: ['*'],
						allowedMethods: ['POST'],
					},
					{
						allowedOrigins: ['*'],
						allowedHeaders: ['*'],
						allowedMethods: ['GET', 'HEAD'],
						exposeHeaders: ['content-type', 'cache-control'],
					},
				],
				lifecycleRule: new Output(new Set(), (resolve: (value: BucketLifecycleRule[]) => void) => {
					resolve(lifecycleRules)
				}) as aws.s3.BucketInput['lifecycleRule'],
			},
			{
				retainOnDelete: ctx.appConfig.removal === 'retain',
				import: ctx.import ? name : undefined,
			}
		)

		// Any distribution in the account may read the public site assets.
		const policy = new aws.s3.BucketPolicy(group, 'policy', {
			bucket: bucket.bucket,
			policy: bucket.arn.pipe(arn =>
				JSON.stringify({
					Version: '2012-10-17',
					Statement: [
						{
							Effect: 'Allow',
							Action: 's3:GetObject',
							Resource: `${arn}/site/*`,
							Principal: {
								Service: 'cloudfront.amazonaws.com',
							},
							Condition: {
								StringEquals: {
									'AWS:SourceAccount': ctx.accountId,
								},
							},
						},
					],
				})
			),
		})

		ctx.shared.set('asset', 'bucket', {
			name: bucket.bucket,
			arn: bucket.arn,
			regionalDomainName: bucket.bucketRegionalDomainName,
			policy,
			addLifecycleRule(rule) {
				lifecycleRules.push(rule)
			},
		})
	},
	onApp(ctx) {
		const bucket = ctx.shared.get('asset', 'bucket')

		ctx.addAppPermission({
			actions: ['s3:ListBucket', 's3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:GetObjectAttributes'],
			resources: [
				//
				bucket.arn,
				bucket.arn.pipe(arn => `${arn}/*`),
			],
			conditions: {
				StringEquals: {
					// This will protect anyone from taking our bucket name,
					// and us sending our items to the wrong s3 bucket
					's3:ResourceAccount': ctx.accountId,
				},
			},
		})
	},
})
