import { Asset, aws, Node } from '@awsless/formation'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { AppContext, StackContext } from '../../feature.js'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'
import { bundleTypeScript } from './build/typescript/bundle.js'
import { zipFiles } from './build/zip.js'
import { FunctionProps } from './schema.js'

type Function = aws.lambda.Function
type Policy = aws.iam.RolePolicy
type Code = aws.lambda.Code

export const prebuild = async (file: string, output: string) => {
	const bundle = await bundleTypeScript({
		file,
		minify: true,
		external: [],
	})

	const archive = await zipFiles(bundle.files)

	await writeFile(join(output, 'HASH'), bundle.hash)
	await writeFile(join(output, 'bundle.zip'), archive)
}

export const createPrebuildLambdaFunction = (
	group: Node,
	ctx: StackContext | AppContext,
	ns: string,
	id: string,
	local: Omit<FunctionProps, 'file'> & {
		bundleFile: string
		bundleHash: string
	}
): { lambda: Function; policy: Policy; code: Code; name: string } => {
	let name: string
	if ('stack' in ctx) {
		name = formatLocalResourceName({
			appName: ctx.app.name,
			stackName: ctx.stack.name,
			resourceType: ns,
			resourceName: id,
		})
	} else {
		name = formatGlobalResourceName({
			appName: ctx.appConfig.name,
			resourceType: ns,
			resourceName: id,
		})
	}

	const props = {
		architecture: 'arm64',
		runtime: 'nodejs20.x',
		...local,
	} as const

	const code = new aws.s3.BucketObject(group, 'code', {
		bucket: ctx.shared.get('function-bucket-name'),
		key: `/lambda/${name}.zip`,
		body: Asset.fromFile(props.bundleFile),
	})

	const role = new aws.iam.Role(group, 'role', {
		name,
		assumedBy: 'lambda.amazonaws.com',
	})

	const policy = new aws.iam.RolePolicy(group, 'policy', {
		role: role.name,
		name: 'lambda-policy',
		version: '2012-10-17',
	})

	const lambda = new aws.lambda.Function(group, `function`, {
		...props,
		name,
		role: role.arn,
		code,
		runtime: props.runtime === 'container' ? undefined : props.runtime,

		// Remove conflicting props.
		vpc: undefined,
		log: props.log as any,
	})

	new aws.lambda.SourceCodeUpdate(group, 'update', {
		functionName: lambda.name,
		version: Asset.fromFile(props.bundleHash),
		architecture: props.architecture,
		code,
	})

	ctx.onEnv((name, value) => {
		lambda.addEnvironment(name, value)
	})

	ctx.registerPolicy(policy)

	// ------------------------------------------------------------
	// Env Vars

	lambda.addEnvironment('APP', ctx.appConfig.name)
	lambda.addEnvironment('APP_ID', ctx.appId)

	if ('stackConfig' in ctx) {
		lambda.addEnvironment('STACK', ctx.stackConfig.name)
	}

	// ------------------------------------------------------------
	// Logging

	if (props.log?.retention && props.log?.retention?.value > 0n) {
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

	// if (ctx.appConfig.defaults.function.permissions) {
	// 	policy.addStatement(...ctx.appConfig.defaults.function.permissions)
	// }

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
	}

	return {
		name,
		lambda,
		policy,
		code,
	}
}
