import { days, seconds, toDays, toSeconds } from '@awsless/duration'
import { mebibytes, toMebibytes } from '@awsless/size'
import { aws } from '@terraforge/aws'
import { Future, Group, Input, resolveInputs } from '@terraforge/core'
import { pascalCase } from 'change-case'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { AppContext, Permission, StackContext } from '../../feature.js'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'
import { formatFilterPattern, getGlobalOnLog } from '../on-log/util.js'
import { bundleTypeScript } from './build/typescript/bundle.js'
import { bundleTypeScriptWithRolldown } from './build/typescript/rolldown.js'
import { zipFiles } from './build/zip.js'
import { FunctionProps } from './schema.js'

// type Function = aws.lambda.Function
// type Policy = aws.iam.RolePolicy
// type Code = aws.lambda.Code

export const prebuild = async (file: string, output: string, external: string[] = []) => {
	const bundle = await bundleTypeScript({
		file,
		minify: true,
		external,
	})

	const archive = await zipFiles(bundle.files)

	await writeFile(join(output, 'HASH'), bundle.hash)
	await writeFile(join(output, 'bundle.zip'), archive)
}

export const createPrebuildLambdaFunction = (
	group: Group,
	ctx: StackContext | AppContext,
	ns: string,
	id: string,
	props: Omit<FunctionProps, 'code'> & {
		bundleFile: string
		bundleHash: string
	},
	options?: { isManagedInstance?: boolean }
) => {
	let name: string
	let roleName: string
	if ('stack' in ctx) {
		name = formatLocalResourceName({
			appName: ctx.app.name,
			stackName: ctx.stack.name,
			resourceType: ns,
			resourceName: id,
		})

		roleName = formatLocalResourceName({
			appName: ctx.app.name,
			stackName: ctx.stack.name,
			resourceType: ns,
			resourceName: id,
			postfix: ctx.appId,
		})
	} else {
		name = formatGlobalResourceName({
			appName: ctx.appConfig.name,
			resourceType: ns,
			resourceName: id,
		})

		roleName = formatGlobalResourceName({
			appName: ctx.appConfig.name,
			resourceType: ns,
			resourceName: id,
			postfix: ctx.appId,
		})
	}

	const code = new aws.s3.BucketObject(group, 'code', {
		bucket: ctx.shared.get('function', 'bucket-name'),
		key: `/lambda/${name}.zip`,
		source: props.bundleFile,
		sourceHash: $hash(props.bundleFile),
		// body: Asset.fromFile(props.bundleFile),
	})

	const role = new aws.iam.Role(group, 'role', {
		name: roleName,
		assumeRolePolicy: JSON.stringify({
			Version: '2012-10-17',
			Statement: [
				{
					Effect: 'Allow',
					Action: 'sts:AssumeRole',
					Principal: {
						Service: ['lambda.amazonaws.com'],
					},
				},
			],
		}),
	})

	const statements: Permission[] = []

	const addPermission = (...permissions: Permission[]) => {
		statements.push(...permissions)
		// policy.attachDependencies(permissions)
	}

	ctx.onPermission(statement => {
		addPermission(statement)
	})

	const policy = new aws.iam.RolePolicy(group, 'policy', {
		role: role.name,
		name: 'lambda-policy',
		policy: new Future(async resolve => {
			const list = await resolveInputs(statements)

			resolve(
				JSON.stringify({
					Version: '2012-10-17',
					Statement: list.map(statement => ({
						Effect: pascalCase(statement.effect ?? 'allow'),
						Action: statement.actions,
						Resource: statement.resources,
					})),
				})
			)
		}),
	})

	const variables: Record<string, Input<string>> = {}

	const logFormats = {
		text: 'Text',
		json: 'JSON',
	}

	const lambda = new aws.lambda.Function(group, `function`, {
		functionName: name,
		role: role.arn,
		// code,
		// runtime: props.runtime === 'container' ? undefined : props.runtime,
		runtime: props.runtime,
		handler: props.handler,
		timeout: toSeconds(props.timeout ?? seconds(10)),
		memorySize: toMebibytes(props.memorySize ?? mebibytes(128)),
		architectures: [props.architecture ?? 'arm64'],

		layers: props.layers?.map(id => ctx.shared.entry('layer', 'arn', id)),
		s3Bucket: code.bucket,
		s3ObjectVersion: code.versionId,
		s3Key: code.key.pipe(name => {
			if (name.startsWith('/')) {
				return name.substring(1)
			}

			return name
		}),

		sourceCodeHash: $hash(props.bundleFile),

		environment: {
			variables,
		},

		loggingConfig: {
			logGroup: `/aws/lambda/${name}`,
			logFormat: logFormats[(props.log && 'format' in props.log && props.log.format) || 'json'],
			applicationLogLevel:
				props.log && 'format' in props.log && props.log.format === 'json'
					? props.log.level?.toUpperCase()
					: undefined,
			systemLogLevel:
				props.log && 'format' in props.log && props.log.format === 'json'
					? props.log.system?.toUpperCase()
					: undefined,
		},

		capacityProviderConfig: options?.isManagedInstance
			? {
					lambdaManagedInstancesCapacityProviderConfig: {
						capacityProviderArn: ctx.shared.get('function', 'capacity-provider-arn'),
					},
				}
			: undefined,
	})

	// ------------------------------------------------------------
	// Env Vars

	// lambda.addEnvironment('APP', ctx.appConfig.name)
	// lambda.addEnvironment('APP_ID', ctx.appId)

	// if ('stackConfig' in ctx) {
	// 	lambda.addEnvironment('STACK', ctx.stackConfig.name)
	// }

	ctx.onEnv((name, value) => {
		variables[name] = value
	})

	variables.APP = ctx.appConfig.name
	variables.APP_ID = ctx.appId
	variables.AWS_ACCOUNT_ID = ctx.accountId

	if ('stackConfig' in ctx) {
		variables.STACK = ctx.stackConfig.name
	}

	// ------------------------------------------------------------
	// Logging

	if (props.log?.retention && props.log?.retention?.value > 0n) {
		const logGroup = new aws.cloudwatch.LogGroup(group, 'log', {
			name: `/aws/lambda/${name}`,
			retentionInDays: toDays(props.log.retention ?? days(7)),
		})

		addPermission({
			actions: ['logs:PutLogEvents', 'logs:CreateLogStream'],
			resources: [logGroup.arn.pipe(arn => `${arn}:*`)],
		})

		// ------------------------------------------------------------
		// Add Log subscription

		const onLogArn = getGlobalOnLog(ctx)

		if (onLogArn && ctx.appConfig.defaults.onLog) {
			const logFilter = ctx.appConfig.defaults.onLog.filter

			new aws.cloudwatch.LogSubscriptionFilter(group, `on-log`, {
				name: 'log-subscription',
				destinationArn: onLogArn,
				logGroupName: logGroup.name,
				filterPattern: formatFilterPattern(logFilter),
			})
		}
	}

	// ------------------------------------------------------------
	// Warm up cron

	if (props.warm) {
		const rule = new aws.cloudwatch.EventRule(group, 'warm', {
			name: `${name}--warm`,
			description: 'Lambda Warmer',
			scheduleExpression: 'rate(5 minutes)',
			isEnabled: true,
		})

		new aws.cloudwatch.EventTarget(group, 'warm', {
			rule: rule.name,
			targetId: 'warmer',
			arn: lambda.arn,
			input: JSON.stringify({
				warmer: true,
				concurrency: props.warm,
			}),
		})

		new aws.lambda.Permission(group, `warm`, {
			action: 'lambda:InvokeFunction',
			principal: 'events.amazonaws.com',
			functionName: lambda.functionName,
			sourceArn: rule.arn,
		})
	}

	return {
		name,
		lambda,
		policy,
		code,
		setEnvironment(name: string, value: Input<string>) {
			variables[name] = value
		},
		addPermission(statement: Permission) {
			addPermission(statement)
		},
	}
}
