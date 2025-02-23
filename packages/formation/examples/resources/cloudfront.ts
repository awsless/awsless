import { days, seconds } from '@awsless/duration'
import { App, AppError, aws, Stack } from '../../src'
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
	sourceArn: 'arn:aws:cloudfront::468004125411:distribution/E2BOP5M7LX3FAL',
	// sourceArn: `arn:aws:cloudfront::468004125411:distribution/${distribution.id.apply<string>(id => id)}`,
})

console.log('START')

try {
	await workspace.deployApp(app)
	// await workspace.deleteApp(app)
} catch (error) {
	if (error instanceof AppError) {
		for (const issue of error.issues) {
			console.error(issue)
		}
	}

	throw error
}

console.log('END')
