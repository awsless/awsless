import { Asset, Node, aws } from '@awsless/formation'
import { StackContext } from '../../feature.js'
import { FunctionSchema } from './schema.js'
import { z } from 'zod'
import deepmerge from 'deepmerge'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'
import { bundleTypeScript } from './build/typescript/bundle.js'
import { zipFiles } from './build/zip.js'
import { fingerprintFromFile } from './build/typescript/fingerprint.js'
import { formatByteSize } from '../../util/byte-size.js'
import { getBuildPath } from '../../build/index.js'

export const createLambdaFunction = (
	group: Node,
	ctx: StackContext,
	ns: string,
	id: string,
	local: z.infer<typeof FunctionSchema>
) => {
	const name = formatLocalResourceName(ctx.appConfig.name, ctx.stackConfig.name, ns, id)
	const props = deepmerge(ctx.appConfig.defaults.function, local)

	// const group = new Node('function', id)
	// ctx.stack.add(group)

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

	const code = new aws.s3.BucketObject('code', {
		bucket: formatGlobalResourceName(ctx.appConfig.name, 'function', 'assets'),
		key: `/lambda/${name}.zip`,
		body: Asset.fromFile(getBuildPath('function', name, 'bundle.zip')),
	})

	group.add(code)

	const role = new aws.iam.Role('role', {
		name,
		assumedBy: 'lambda.amazonaws.com',
	})

	group.add(role)

	const policy = new aws.iam.RolePolicy('policy', {
		role: role.name,
		name: 'lambda-policy',
		statements: [
			{
				// Give lambda access to all lambda's inside your app.
				actions: ['lambda:InvokeFunction', 'lambda:InvokeAsync'],
				resources: [`arn:aws:lambda:*:*:function:${ctx.appConfig.name}--*`],
			},
		],
	})

	group.add(policy)

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

	const lambda = new aws.lambda.Function('function', {
		...props,
		name,
		code,
		role: role.arn,

		// Remove conflicting props.
		vpc: undefined,
		log: props.log as any,
	})

	group.add(lambda)

	// Register the lambda in Awsless...
	ctx.registerFunction(lambda, policy)

	// ------------------------------------------------------------
	// Env Vars

	lambda.addEnvironment('APP', ctx.appConfig.name)
	// lambda.addEnvironment('STAGE', ctx.stage)
	lambda.addEnvironment('STACK', ctx.stackConfig.name)

	// ------------------------------------------------------------
	// Async Invoke Config

	const invoke = new aws.lambda.EventInvokeConfig('async', {
		functionArn: lambda.arn,
		retryAttempts: props.retryAttempts,
		// onFailure: getGlobalOnFailure(ctx),
	})

	group.add(invoke)

	// if (hasOnFailure(ctx.appConfig)) {
	// 	policy.addStatement({
	// 		actions: ['sqs:SendMessage'],
	// 		resources: [getGlobalOnFailure(ctx)!],
	// 	})
	// }

	// ------------------------------------------------------------
	// Logging

	if (props.log.retention.value > 0n) {
		const logGroup = new aws.cloudWatch.LogGroup('log', {
			name: lambda.name.apply(name => `/aws/lambda/${name}`),
			retention: props.log.retention,
		})

		group.add(logGroup)

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
		const rule = new aws.events.Rule('warm', {
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

		group.add(rule)

		const permission = new aws.lambda.Permission(`warm`, {
			action: 'lambda:InvokeFunction',
			principal: 'events.amazonaws.com',
			functionArn: lambda.arn,
			sourceArn: rule.arn,
		})

		group.add(permission)
	}

	// ------------------------------------------------------------
	// VPC

	if (props.vpc) {
		lambda.setVpc({
			securityGroupIds: [ctx.app.import<string>('base', `vpc-security-group-id`)],
			subnetIds: [
				ctx.app.import<string>('base', `vpc-public-subnet-1`),
				ctx.app.import<string>('base', `vpc-public-subnet-2`),
			],
		})

		policy.addStatement({
			actions: [
				'ec2:CreateNetworkInterface',
				'ec2:DescribeNetworkInterfaces',
				'ec2:DeleteNetworkInterface',
				'ec2:AssignPrivateIpAddresses',
				'ec2:UnassignPrivateIpAddresses',
			],
			resources: ['arn:aws:ec2:*:*:*'],
		})
	}

	return { group, lambda, policy }
}
