import { camelCase, constantCase, paramCase } from 'change-case'
import { Asset, aws, Node } from '@awsless/formation'
import { FileError } from '../../error.js'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { shortId } from '../../util/id.js'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'
import { formatFullDomainName } from '../domain/util.js'
import { createLambdaFunction } from '../function/util.js'
import { mebibytes } from '@awsless/size'
import { directories } from '../../util/path.js'
import { dirname, join, relative } from 'path'
import { fileURLToPath } from 'node:url'
import { createPrebuildLambdaFunction } from '../function/prebuild.js'
import { days, seconds } from '@awsless/duration'
import { getBuildPath } from '../../build/index.js'

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
						const varName = camelCase(`${stack.name}-${name}`)

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
				const list = names[id]!
				for (const name of Object.keys(queries ?? {})) {
					if (list.has(name)) {
						throw new FileError(stack.file, `Duplicate RPC API function "${id}.${name}"`)
					} else {
						list.add(name)
					}
				}
			}
		}
	},
	onApp(ctx) {
		for (const [id, props] of Object.entries(ctx.appConfig.defaults.rpc ?? {})) {
			const group = new Node(ctx.base, 'rpc', id)

			const name = formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'rpc',
				resourceName: id,
			})

			const { lambda, policy, code } = createPrebuildLambdaFunction(group, ctx, 'rpc', id, {
				bundleFile: join(__dirname, '/prebuild/rpc/bundle.zip'),
				bundleHash: join(__dirname, '/prebuild/rpc/HASH'),
				memorySize: mebibytes(256),
				warm: 3,
				log: props.log,
			})

			const table = new aws.dynamodb.Table(group, 'schema', {
				name,
				hash: 'query',
			})

			lambda.addEnvironment('SCHEMA_TABLE', table.name)

			policy.addStatement({
				effect: 'allow',
				actions: ['dynamodb:GetItem'],
				resources: [table.arn],
			})

			ctx.shared.set(`rpc-${id}-schema-table`, table)

			if (props.auth) {
				const authGroup = new Node(group, 'auth', 'authorizer')
				const auth = createLambdaFunction(authGroup, ctx, 'rpc', `${id}-auth`, props.auth)
				lambda.addEnvironment('AUTH', auth.lambda.name)

				new aws.lambda.SourceCodeUpdate(group, 'update', {
					functionName: lambda.name,
					version: Asset.fromFile(getBuildPath('function', auth.name, 'HASH')),
					architecture: 'arm64',
					code,
				})
			}

			const permission = new aws.lambda.Permission(group, 'permission', {
				principal: '*',
				action: 'lambda:InvokeFunctionUrl',
				functionArn: lambda.arn,
				urlAuthType: 'none',
			})

			const url = new aws.lambda.Url(group, 'url-2', {
				targetArn: lambda.arn,
				authType: 'none',
				cors: {
					allow: {
						origins: ['*'],
						methods: ['*'],
						headers: ['Authentication', 'Content-Type'],
						// credentials: true,
					},
				},
			}).dependsOn(permission)

			const domainName = props.domain
				? formatFullDomainName(ctx.appConfig, props.domain, props.subDomain)
				: undefined

			const certificateArn = props.domain
				? ctx.shared.get<aws.ARN>(`global-certificate-${props.domain}-arn`)
				: undefined

			const cache = new aws.cloudFront.CachePolicy(group, 'cache', {
				name,
				minTtl: seconds(1),
				maxTtl: days(365),
				defaultTtl: days(1),
			})

			const originRequest = new aws.cloudFront.OriginRequestPolicy(group, 'request', {
				name,
				header: {
					behavior: 'all-except',
					values: ['Host'],
				},
			})

			const cdn = new aws.cloudFront.Distribution(group, 'cdn-2', {
				name,
				compress: true,
				certificateArn,
				viewerProtocol: 'https-only',
				allowMethod: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'POST', 'DELETE'],
				aliases: domainName ? [domainName] : undefined,
				origins: [
					{
						id: 'default',
						domainName: url.url.apply<string>(url => url.split('/')[2]!),
						protocol: 'https-only',
					},
				],
				targetOriginId: 'default',
				cachePolicyId: cache.id,
				originRequestPolicyId: originRequest.id,
			})

			if (props.domain) {
				const fullDomainName = formatFullDomainName(ctx.appConfig, props.domain, props.subDomain)

				new aws.route53.RecordSet(group, 'record', {
					hostedZoneId: ctx.shared.get(`hosted-zone-${props.domain}-id`),
					type: 'A',
					name: fullDomainName,
					alias: cdn.aliasTarget,
				})

				ctx.bind(`RPC_${constantCase(id)}_ENDPOINT`, fullDomainName)
			} else {
				ctx.bind(`RPC_${constantCase(id)}_ENDPOINT`, cdn.aliasTarget.dnsName)
			}
		}
	},
	onStack(ctx) {
		for (const [id, queries] of Object.entries(ctx.stackConfig.rpc ?? {})) {
			const defaultProps = ctx.appConfig.defaults.rpc?.[id]

			if (!defaultProps) {
				throw new FileError(ctx.stackConfig.file, `RPC definition is not defined on app level for "${id}"`)
			}

			const table = ctx.shared.get<aws.dynamodb.Table>(`rpc-${id}-schema-table`)
			const group = new Node(ctx.stack, 'rpc', id)

			for (const [name, props] of Object.entries(queries ?? {})) {
				const queryGroup = new Node(group, 'query', name)
				const entryId = paramCase(`${id}-${shortId(name)}`)

				createLambdaFunction(queryGroup, ctx, `rpc`, entryId, {
					...props,
					description: `${id} ${name}`,
				})

				new aws.dynamodb.TableItem(queryGroup, 'query', {
					table,
					item: Asset.fromJSON({
						query: name,
						function: formatLocalResourceName({
							appName: ctx.app.name,
							stackName: ctx.stack.name,
							resourceType: 'rpc',
							resourceName: entryId,
						}),
					}),
				})
			}
		}
	},
})
