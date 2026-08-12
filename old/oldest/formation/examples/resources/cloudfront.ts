import {
	CloudControlClient,
	GetResourceRequestStatusCommand,
	UpdateResourceCommand,
} from '@aws-sdk/client-cloudcontrol'
import { fromIni } from '@aws-sdk/credential-providers'
import { days, seconds } from '@awsless/duration'
import { createPatch } from 'rfc6902'
import { App, AppError, aws, Output, Stack } from '../../src'
import { createWorkspace } from './_util'

const workspace = createWorkspace('jacksclub')
const app = new App('cloudfront')
const stack = new Stack(app, 'cloudfront')

const role = new aws.iam.Role(stack, 'role', {
	assumedBy: 'lambda.amazonaws.com',
})

export const lambda = new aws.lambda.Function(stack, 'lambda', {
	name: 'awsless-formation-cloudfront-fn',
	code: {
		zipFile: 'module.exports.default = async () => ({ statusCode: 200, body: "Hello World" })',
	},
	role: role.arn,
})

const url = new aws.lambda.Url(stack, 'url', {
	targetArn: lambda.arn,
	authType: 'aws-iam',
	invokeMode: 'buffered',
})

const accessControl = new aws.cloudFront.OriginAccessControl(stack, `oac`, {
	name: 'formation-test',
	type: 'lambda',
	behavior: 'always',
	protocol: 'sigv4',
})

const cache = new aws.cloudFront.CachePolicy(stack, 'cache', {
	name: 'formation-test',
	minTtl: seconds(1),
	maxTtl: days(365),
	defaultTtl: days(1),
})

const distribution = new aws.cloudFront.Distribution(stack, 'distribution', {
	name: 'formation-test',
	compress: true,
	origins: [
		{
			id: 'ssr',
			domainName: url.url.apply<string>(url => url.split('/')[2]!),
			protocol: 'https-only',
			originAccessControlId: accessControl.id,
		},
	],
	targetOriginId: 'ssr',
	cachePolicyId: cache.id,
})

new aws.lambda.Permission(stack, 'permission', {
	principal: 'cloudfront.amazonaws.com',
	action: 'lambda:InvokeFunctionUrl',
	functionArn: lambda.arn,
	urlAuthType: 'aws-iam',
	sourceArn: distribution.id.apply<aws.ARN>(id => `arn:aws:cloudfront::468004125411:distribution/${id}`),
})

// const client = new CloudControlClient({
// 	region: 'eu-west-1',
// 	credentials: fromIni({ profile: 'jacksclub' }),
// })

// const operations = createPatch(
// {
// 	DistributionConfig: {
// 		Origins: [
// 			{
// 				CustomOriginConfig: {
// 					OriginProtocolPolicy: 'https-only',
// 				},
// 			},
// 		],
// 	},
// },
// {
// 	DistributionConfig: {
// 		ViewerCertificate: {
// 			CloudFrontDefaultCertificate: true,
// 		},
// 		Origins: [
// 			{
// 				CustomOriginConfig: {
// 					OriginProtocolPolicy: 'http-only',
// 				},
// 			},
// 		],
// 	},
// }
// )

// console.log(
// 	JSON.stringify({
// 		DistributionConfig: {
// 			Origins: [
// 				{
// 					CustomOriginConfig: {
// 						OriginProtocolPolicy: 'https-only',
// 					},
// 				},
// 			],
// 		},
// 	}),
// 	'-------',
// 	JSON.stringify({
// 		DistributionConfig: {
// 			ViewerCertificate: {
// 				CloudFrontDefaultCertificate: true,
// 			},
// 			Origins: [
// 				{
// 					CustomOriginConfig: {
// 						OriginProtocolPolicy: 'http-only',
// 					},
// 				},
// 			],
// 		},
// 	})
// )

console.log('START')

try {
	// const response = await client.send(
	// 	new UpdateResourceCommand({
	// 		TypeName: 'AWS::CloudFront::Distribution',
	// 		Identifier: 'E37OQ8BHIYOL36',
	// 		PatchDocument: JSON.stringify(operations),
	// 	})
	// )
	// console.log(response)
	// await new Promise(resolve => setTimeout(resolve, 5000))
	// const status = await client.send(
	// 	new GetResourceRequestStatusCommand({
	// 		RequestToken: response.ProgressEvent?.RequestToken,
	// 	})
	// )
	// console.log(status.ProgressEvent)
	// await workspace.deployApp(app)
	await workspace.deleteApp(app)
} catch (error) {
	if (error instanceof AppError) {
		for (const issue of error.issues) {
			console.error(issue)
		}
	}

	throw error
}

console.log('END')
