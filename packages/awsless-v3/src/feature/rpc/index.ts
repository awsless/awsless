import { camelCase, kebabCase } from 'change-case'
import { Group } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { FileError } from '../../error.js'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { shortId } from '../../util/id.js'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'
import { createLambdaFunction } from '../function/util.js'
import { mebibytes } from '@awsless/size'
import { directories } from '../../util/path.js'
import { dirname, join, relative } from 'path'
import { fileURLToPath } from 'node:url'
import { createPrebuildLambdaFunction } from '../function/prebuild.js'
import { toSeconds } from '@awsless/duration'
import { UpdateFunctionCode } from '../../formation/lambda.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const rpcFeature = defineFeature({
	name: 'rpc',
	async onTypeGen(ctx) {
		const types = new TypeFile('@awsless/awsless/client')

		types.addCode(`type Func = (...args: any[]) => any`)
		types.addCode(
			`type Handle<T extends Func, I = Parameters<T>[0], O = Promise<ReturnType<T>>> = undefined extends I ? (input?: I) => O : (input: I) => O`
		)

		const schemas = new TypeObject(1)

		for (const id of Object.keys(ctx.appConfig.defaults.rpc ?? {})) {
			const schema = new TypeObject(2)

			for (const stack of ctx.stackConfigs) {
				for (const [name, props] of Object.entries(stack.rpc?.[id] ?? {})) {
					if ('file' in props.code) {
						const relFile = relative(directories.types, props.code.file)
						const varName = camelCase(`${id}-${stack.name}-${name}`)

						types.addImport(varName, relFile)
						schema.addType(name, `Handle<typeof ${varName}>`)
					}
				}
			}

			schemas.addType(id, schema)
		}

		types.addInterface('RpcSchema', schemas)

		await ctx.write('rpc.d.ts', types, true)
	},
	onValidate(ctx) {
		const names: Record<string, Set<string>> = {}

		for (const id of Object.keys(ctx.appConfig.defaults.rpc ?? {})) {
			names[id] = new Set()
		}

		for (const stack of ctx.stackConfigs) {
			for (const [id, queries] of Object.entries(stack.rpc ?? {})) {
				const list = names[id]

				if (!list) {
					throw new FileError(stack.file, `The RPC API for "${id}" isn't defined on app level.`)
				}

				for (const [name, props] of Object.entries(queries ?? {})) {
					if (list.has(name)) {
						throw new FileError(stack.file, `Duplicate RPC API function "${id}.${name}"`)
					} else {
						list.add(name)
					}

					const timeout = toSeconds(props.timeout ?? ctx.appConfig.defaults.function.timeout)
					const maxTimeout = toSeconds(ctx.appConfig.defaults.rpc![id]!.timeout) * 0.8

					if (timeout > maxTimeout) {
						throw new FileError(
							stack.file,
							`Your RPC function "${id}.${name}" has a ${timeout} seconds timeout, the maximum is ${maxTimeout} seconds.`
						)
					}
				}
			}
		}
	},
	onApp(ctx) {
		for (const [id, props] of Object.entries(ctx.appConfig.defaults.rpc ?? {})) {
			const group = new Group(ctx.base, 'rpc', id)

			// ------------------------------------------------------
			// Create the RPC lambda

			// const name = formatGlobalResourceName({
			// 	appName: ctx.app.name,
			// 	resourceType: 'rpc',
			// 	resourceName: id,
			// })

			const result = createPrebuildLambdaFunction(group, ctx, 'rpc', id, {
				bundleFile: join(__dirname, '/prebuild/rpc/bundle.zip'),
				bundleHash: join(__dirname, '/prebuild/rpc/HASH'),
				memorySize: mebibytes(256),
				timeout: props.timeout,
				handler: 'index.default',
				runtime: 'nodejs22.x',
				warm: 3,
				log: props.log,
			})

			result.setEnvironment('TIMEOUT', toSeconds(props.timeout).toString())

			// ------------------------------------------------------
			// Create the schema table

			const schemaTable = new aws.dynamodb.Table(group, 'schema', {
				name: formatGlobalResourceName({
					appName: ctx.app.name,
					resourceType: 'rpc-schema',
					resourceName: id,
				}),
				hashKey: 'query',
				billingMode: 'PAY_PER_REQUEST',
				attribute: [
					{
						name: 'query',
						type: 'S',
					},
				],
			})

			result.setEnvironment('SCHEMA_TABLE', schemaTable.name)

			result.addPermission({
				effect: 'allow',
				actions: ['dynamodb:GetItem'],
				resources: [schemaTable.arn],
			})

			ctx.shared.add('rpc', `schema-table`, id, schemaTable)

			// ------------------------------------------------------
			// Create the lock table

			const lockTable = new aws.dynamodb.Table(group, 'lock', {
				name: formatGlobalResourceName({
					appName: ctx.app.name,
					resourceType: 'rpc-lock',
					resourceName: id,
				}),
				hashKey: 'key',
				billingMode: 'PAY_PER_REQUEST',
				ttl: {
					enabled: true,
					attributeName: 'ttl',
				},
				attribute: [
					{
						name: 'key',
						type: 'S',
					},
				],
			})

			result.setEnvironment('LOCK_TABLE', lockTable.name)

			result.addPermission({
				effect: 'allow',
				actions: ['dynamodb:UpdateItem', 'dynamodb:DeleteItem'],
				resources: [lockTable.arn],
			})

			// ------------------------------------------------------
			// Create the auth lambda

			if (props.auth) {
				const authGroup = new Group(group, 'auth', 'authorizer')
				const auth = createLambdaFunction(authGroup, ctx, 'rpc', `${id}-auth`, props.auth)

				result.setEnvironment('AUTH', auth.name)

				// we need a new way of forcing the lambda to update after the auth changed.

				new UpdateFunctionCode(group, 'update', {
					version: auth.code.sourceHash,

					functionName: result.lambda.functionName,
					architectures: result.lambda.architectures as any,
					s3Bucket: result.lambda.s3Bucket,
					s3Key: result.lambda.s3Key,
					s3ObjectVersion: result.lambda.s3ObjectVersion,
					imageUri: result.lambda.imageUri,
				})
			}

			// ------------------------------------------------------

			const permission = new aws.lambda.Permission(group, 'permission', {
				principal: 'cloudfront.amazonaws.com',
				action: 'lambda:InvokeFunctionUrl',
				functionName: result.lambda.functionName,
				functionUrlAuthType: 'AWS_IAM',
				sourceArn: `arn:aws:cloudfront::${ctx.accountId}:distribution/*`,
			})

			// ------------------------------------------------------

			const url = new aws.lambda.FunctionUrl(
				group,
				'url',
				{
					functionName: result.lambda.functionName,
					authorizationType: 'AWS_IAM',
					cors: {
						allowOrigins: ['*'],
						allowMethods: ['*'],
						allowHeaders: [
							//
							'authentication',
							'content-type',
							'x-amz-content-sha256',
						],
					},
				},
				{ dependsOn: [permission] }
			)

			// ------------------------------------------------------
			// Add the RPC route to the router

			const addRoutes = ctx.shared.entry('router', 'addRoutes', props.router)

			addRoutes(group, 'route', {
				[props.path]: {
					type: 'lambda',
					domainName: url.functionUrl.pipe(url => url.split('/')[2]!),
				},
			})
		}
	},
	onStack(ctx) {
		for (const [id, queries] of Object.entries(ctx.stackConfig.rpc ?? {})) {
			const defaultProps = ctx.appConfig.defaults.rpc?.[id]

			if (!defaultProps) {
				throw new FileError(ctx.stackConfig.file, `RPC definition is not defined on app level for "${id}"`)
			}

			const table = ctx.shared.entry('rpc', 'schema-table', id)
			const group = new Group(ctx.stack, 'rpc', id)

			for (const [name, props] of Object.entries(queries ?? {})) {
				const queryGroup = new Group(group, 'query', name)
				const entryId = kebabCase(`${id}-${shortId(name)}`)

				createLambdaFunction(queryGroup, ctx, `rpc`, entryId, {
					...props,
					description: `${id} ${name}`,
				})

				new aws.dynamodb.TableItem(queryGroup, 'query', {
					tableName: table.name,
					hashKey: table.hashKey,
					rangeKey: table.rangeKey,
					item: JSON.stringify({
						query: {
							S: name,
						},
						function: {
							S: formatLocalResourceName({
								appName: ctx.app.name,
								stackName: ctx.stack.name,
								resourceType: 'rpc',
								resourceName: entryId,
							}),
						},
						// permissions: {
						// 	L: props.permissions.map(permission => ({
						// 		S: permission,
						// 	})),
						// },
					}),
				})
			}
		}
	},
})
