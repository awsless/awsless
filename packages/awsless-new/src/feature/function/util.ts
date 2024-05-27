import { Asset, aws, Node } from '@awsless/formation'
import deepmerge from 'deepmerge'
import { basename, dirname, extname } from 'path'
import { exec } from 'promisify-child-process'
import { z } from 'zod'
import { getBuildPath } from '../../build/index.js'
import { AppContext, StackContext } from '../../feature.js'
import { formatByteSize } from '../../util/byte-size.js'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'
import { getGlobalOnFailure, hasOnFailure } from '../on-failure/util.js'
import { bundleTypeScript } from './build/typescript/bundle.js'
import { fingerprintFromFile } from './build/typescript/fingerprint.js'
import { zipFiles } from './build/zip.js'
import { FunctionSchema } from './schema.js'
// import { getGlobalOnFailure, hasOnFailure } from '../on-failure/util.js'

import { hashElement } from 'folder-hash'

type Function = aws.lambda.Function
type Policy = aws.iam.RolePolicy
type Code = aws.lambda.Code

export const createLambdaFunction = (
	group: Node,
	ctx: StackContext | AppContext,
	ns: string,
	id: string,
	local: z.infer<typeof FunctionSchema>
): { lambda: Function; policy: Policy; code: Code } => {
	let name: string
	if ('stackConfig' in ctx) {
		name = formatLocalResourceName(ctx.appConfig.name, ctx.stackConfig.name, ns, id)
	} else {
		name = formatGlobalResourceName(ctx.appConfig.name, ns, id)
	}

	const props = deepmerge(ctx.appConfig.defaults.function, local)
	const ext = extname(props.file)
	let code: aws.lambda.Code | undefined

	if (['.ts', '.js', '.tsx', '.sx'].includes(ext)) {
		ctx.registerBuild('function', name, async build => {
			const version = await fingerprintFromFile(props.file)

			return build(version, async write => {
				const bundle = await bundleTypeScript({ file: props.file })
				const archive = await zipFiles(bundle.files)

				await Promise.all([
					write('bundle.zip', archive),
					...bundle.files.map(file => write(`files/${file.name}`, file.code)),
					...bundle.files.map(file => file.map && write(`files/${file.name}.map`, file.map)),
				])

				return {
					size: formatByteSize(archive.byteLength),
				}
			})
		})

		code = new aws.s3.BucketObject(group, 'code', {
			bucket: ctx.shared.get('function-bucket-name'),
			key: `/lambda/${name}.zip`,
			body: Asset.fromFile(getBuildPath('function', name, 'bundle.zip')),
		})
	} else if (basename(props.file) === 'dockerfile') {
		ctx.registerBuild('function', name, async build => {
			const basePath = dirname(props.file)
			const version = await hashElement(basePath, {
				files: {
					exclude: ['stack.json'],
				},
			})

			console.log(version)

			return build(version.hash, async () => {
				const repoName = formatGlobalResourceName(ctx.appConfig.name, 'function', 'repository', '-')

				await exec(`docker build -t ${name} .`, {
					cwd: basePath,
				})

				await exec(
					`docker tag ${name}:latest ${ctx.accountId}.dkr.ecr.${ctx.appConfig.region}.amazonaws.com/${repoName}:${name}`,
					{ cwd: basePath }
				)

				return {
					size: 'unknown',
				}
			})
		})

		const image = new aws.ecr.Image(group, 'image', {
			repository: ctx.shared.get('function-repository-name'),
			name: name,
			tag: name,
		})

		code = {
			imageUri: image.uri,
		}
	} else {
		throw new Error('Unknown Lambda Function type.')
	}

	// const inlinePolicies: aws.iam.PolicyDocument[] = []

	const role = new aws.iam.Role(group, 'role', {
		name,
		assumedBy: 'lambda.amazonaws.com',
		// policies: inlinePolicies,
	})

	const policy = new aws.iam.RolePolicy(group, 'policy', {
		role: role.name,
		name: 'lambda-policy',
		version: '2012-10-17',
		statements: [
			{
				// Give lambda access to all lambda's inside your app.
				actions: ['lambda:InvokeFunction', 'lambda:InvokeAsync'],
				resources: [`arn:aws:lambda:*:*:function:${ctx.appConfig.name}--*`],
			},
		],
	})

	// const policy = role.addPolicy('policy', {
	// 	name: 'lambda-policy',
	// 	statements: [
	// 		{
	// 			// Give lambda access to all lambda's inside your app.
	// 			actions: ['lambda:InvokeFunction', 'lambda:InvokeAsync'],
	// 			resources: [`arn:aws:lambda:*:*:function:${ctx.appConfig.name}--*`],
	// 		},
	// 	],
	// })

	const lambda = new aws.lambda.Function(group, `function`, {
		...props,
		name,
		role: role.arn,
		code,

		// Remove conflicting props.
		vpc: undefined,
		log: props.log as any,
	})

	// For some features lambda will complain that the policy need to be in place first.
	// lambda.dependsOn(policy)

	// Register the lambda in Awsless...
	ctx.registerFunction(lambda, policy)

	// ------------------------------------------------------------
	// Env Vars

	lambda.addEnvironment('APP', ctx.appConfig.name)
	// lambda.addEnvironment('STAGE', ctx.stage)

	if ('stackConfig' in ctx) {
		lambda.addEnvironment('STACK', ctx.stackConfig.name)
	}

	// ------------------------------------------------------------
	// Logging

	if (props.log.retention.value > 0n) {
		const logGroup = new aws.cloudWatch.LogGroup(group, 'log', {
			name: lambda.name.apply(name => `/aws/lambda/${name}`),
			retention: props.log.retention,
		})

		policy.addStatement(
			{
				actions: ['logs:CreateLogStream'],
				resources: [logGroup.arn],
			},
			{
				actions: ['logs:PutLogEvents'],
				resources: [logGroup.arn.apply(arn => `${arn}:*` as `arn:${string}`)],
			}
		)
	}

	// ------------------------------------------------------------
	// Permissions

	if (ctx.appConfig.defaults.function.permissions) {
		policy.addStatement(...ctx.appConfig.defaults.function.permissions)
	}

	if ('permissions' in local && local.permissions) {
		policy.addStatement(...local.permissions)
	}

	// ------------------------------------------------------------
	// Warm up cron

	if (props.warm) {
		const rule = new aws.events.Rule(group, 'warm', {
			name: `${name}--warm`,
			schedule: 'rate(5 minutes)',
			enabled: true,
			targets: [
				{
					id: 'warmer',
					arn: lambda.arn,
					input: {
						warmer: true,
						concurrency: props.warm,
					},
				},
			],
		})

		new aws.lambda.Permission(group, `warm`, {
			action: 'lambda:InvokeFunction',
			principal: 'events.amazonaws.com',
			functionArn: lambda.arn,
			sourceArn: rule.arn,
		})
	}

	// ------------------------------------------------------------
	// VPC

	if (props.vpc) {
		lambda.setVpc({
			securityGroupIds: [ctx.shared.get<string>(`vpc-security-group-id`)],
			subnetIds: [
				ctx.shared.get<string>(`vpc-public-subnet-id-1`),
				ctx.shared.get<string>(`vpc-public-subnet-id-2`),
			],
		})

		const vpcPolicy = new aws.iam.RolePolicy(group, 'vpc-policy', {
			role: role.name,
			name: 'lambda-vpc-policy',
			version: '2012-10-17',
			statements: [
				{
					actions: [
						'ec2:CreateNetworkInterface',
						'ec2:DescribeNetworkInterfaces',
						'ec2:DeleteNetworkInterface',
						'ec2:AssignPrivateIpAddresses',
						'ec2:UnassignPrivateIpAddresses',
					],
					resources: ['*'],
				},
			],
		})

		lambda.dependsOn(vpcPolicy)

		// inlinePolicies.push({
		// 	name: 'vpc',
		// 	statements: [
		// 		{
		// 			actions: [
		// 				'ec2:CreateNetworkInterface',
		// 				'ec2:DescribeNetworkInterfaces',
		// 				'ec2:DeleteNetworkInterface',
		// 				'ec2:AssignPrivateIpAddresses',
		// 				'ec2:UnassignPrivateIpAddresses',
		// 			],
		// 			resources: ['*'],
		// 		},
		// 	],
		// })

		// policy.addStatement({
		// 	actions: [
		// 		'ec2:CreateNetworkInterface',
		// 		'ec2:DescribeNetworkInterfaces',
		// 		'ec2:DeleteNetworkInterface',
		// 		'ec2:AssignPrivateIpAddresses',
		// 		'ec2:UnassignPrivateIpAddresses',
		// 	],
		// 	resources: ['*'],
		// })
	}

	return {
		lambda,
		policy,
		code,
	}
}

export const createAsyncLambdaFunction = (
	group: Node,
	ctx: StackContext | AppContext,
	ns: string,
	id: string,
	local: z.infer<typeof FunctionSchema>
) => {
	const result = createLambdaFunction(group, ctx, ns, id, local)
	const props = deepmerge(ctx.appConfig.defaults.function, local)

	// ------------------------------------------------------------
	// Make sure we always log errors inside async functions

	result.lambda.addEnvironment('LOG_VIEWABLE_ERROR', '1')

	// ------------------------------------------------------------
	// Async Invoke Config

	const invokeConfig = new aws.lambda.EventInvokeConfig(group, 'async', {
		functionArn: result.lambda.arn,
		retryAttempts: props.retryAttempts,
		onFailure: getGlobalOnFailure(ctx),
	})

	invokeConfig.dependsOn(result.policy)

	if (hasOnFailure(ctx.stackConfigs)) {
		result.policy.addStatement({
			actions: ['sqs:SendMessage', 'sqs:GetQueueUrl'],
			resources: [getGlobalOnFailure(ctx)!],
		})
	}

	return result
}
