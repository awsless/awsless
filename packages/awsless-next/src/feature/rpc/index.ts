import { camelCase, constantCase, kebabCase } from 'change-case'
import { $, Group } from '@awsless/formation'
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
import { days, seconds, toSeconds } from '@awsless/duration'

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
			const group = new Group(ctx.base, 'rpc', id)

			const name = formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'rpc',
				resourceName: id,
			})

			const result = createPrebuildLambdaFunction(group, ctx, 'rpc', id, {
				bundleFile: join(__dirname, '/prebuild/rpc/bundle.zip'),
				bundleHash: join(__dirname, '/prebuild/rpc/HASH'),
				memorySize: mebibytes(256),
				handler: 'index.default',
				runtime: 'nodejs22.x',
				warm: 3,
				log: props.log,
			})

			const table = new $.aws.dynamodb.Table(group, 'schema', {
				name,
				hashKey: 'query',
				billingMode: 'PAY_PER_REQUEST',
				attribute: [
					{
						name: 'query',
						type: 'S',
					},
				],
			})

			result.setEnvironment('SCHEMA_TABLE', table.name)

			result.addPermission({
				effect: 'allow',
				actions: ['dynamodb:GetItem'],
				resources: [table.arn],
			})

			ctx.shared.add('rpc', `schema-table`, id, table)

			if (props.auth) {
				const authGroup = new Group(group, 'auth', 'authorizer')
				const auth = createLambdaFunction(authGroup, ctx, 'rpc', `${id}-auth`, props.auth)

				result.setEnvironment('AUTH', auth.name)

				// we need a new way of forcing the lambda to update after the auth changed.

				// new $.aws.lambda.SourceCodeUpdate(group, 'update', {
				// 	functionName: lambda.name,
				// 	version: Asset.fromFile(getBuildPath('function', auth.name, 'HASH')),
				// 	architecture: 'arm64',
				// 	code,
				// })
			}

			// const permission = new $.aws.lambda.Permission(group, 'permission', {
			// 	principal: '*',
			// 	action: 'lambda:InvokeFunctionUrl',
			// 	functionName: result.lambda.functionName,
			// 	// urlAuthType: 'none',
			// })

			const permission = new $.aws.lambda.Permission(group, 'permission', {
				principal: 'cloudfront.amazonaws.com',
				action: 'lambda:InvokeFunctionUrl',
				functionName: result.lambda.functionName,
				functionUrlAuthType: 'AWS_IAM',
				sourceArn: `arn:aws:cloudfront::${ctx.accountId}:distribution/*`,
			})

			const url = new $.aws.lambda.FunctionUrl(
				group,
				'url',
				{
					functionName: result.lambda.functionName,
					authorizationType: 'AWS_IAM',
					cors: {
						allowOrigins: ['*'],
						allowMethods: ['*'],
						allowHeaders: ['Authentication', 'Content-Type'],
					},
				},
				{ dependsOn: [permission] }
			)

			const accessControl = new $.aws.cloudfront.OriginAccessControl(group, 'ssr-access', {
				name: `${name}-ssr`,
				originAccessControlOriginType: 'lambda',
				signingBehavior: 'always',
				signingProtocol: 'sigv4',
			})

			const domainName = props.domain
				? formatFullDomainName(ctx.appConfig, props.domain, props.subDomain)
				: undefined

			const certificateArn = props.domain
				? ctx.shared.entry('domain', `global-certificate-arn`, props.domain)
				: undefined

			const cache = new $.aws.cloudfront.CachePolicy(group, 'cache', {
				name,
				minTtl: toSeconds(seconds(1)),
				maxTtl: toSeconds(days(365)),
				defaultTtl: toSeconds(days(1)),
			})

			const originRequest = new $.aws.cloudfront.OriginRequestPolicy(group, 'request', {
				name,
				headersConfig: {
					headerBehavior: 'allExcept',
					headers: {
						items: ['host'],
					},
				},
				cookiesConfig: {
					cookieBehavior: 'all',
				},
				queryStringsConfig: {
					queryStringBehavior: 'all',
				},
			})

			const cdn = new $.aws.cloudfront.Distribution(group, 'cdn', {
				tags: {
					Name: name,
				},

				enabled: true,
				aliases: domainName ? [domainName] : undefined,
				priceClass: 'PriceClass_All',
				httpVersion: 'http2and3',
				viewerCertificate: certificateArn
					? {
							sslSupportMethod: 'sni-only',
							minimumProtocolVersion: 'TLSv1.2_2021',
							acmCertificateArn: certificateArn,
						}
					: {
							cloudfrontDefaultCertificate: true,
						},

				origin: [
					{
						originId: 'default',
						domainName: url.functionUrl.pipe(url => url.split('/')[2]!),
						originAccessControlId: accessControl.id,
						customOriginConfig: {
							originProtocolPolicy: 'https-only',
							httpPort: 80,
							httpsPort: 443,
							originSslProtocols: ['TLSv1.2'],
						},
					},
				],

				restrictions: {
					geoRestriction: {
						restrictionType: props.geoRestrictions.length > 0 ? 'blacklist' : 'none',
						locations: props.geoRestrictions,
					},
				},

				defaultCacheBehavior: {
					compress: true,
					targetOriginId: 'default',
					originRequestPolicyId: originRequest.id,
					cachePolicyId: cache.id,
					viewerProtocolPolicy: 'https-only',
					allowedMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'POST', 'DELETE'],
					cachedMethods: ['GET', 'HEAD'],
				},
			})

			if (props.domain) {
				const fullDomainName = formatFullDomainName(ctx.appConfig, props.domain, props.subDomain)

				new $.aws.route53.Record(group, 'record', {
					zoneId: ctx.shared.entry('domain', `zone-id`, props.domain),
					type: 'A',
					name: fullDomainName,
					// alias: cdn.aliasTarget,
					alias: {
						name: cdn.domainName,
						zoneId: cdn.hostedZoneId,
						evaluateTargetHealth: false,
					},
				})

				ctx.bind(`RPC_${constantCase(id)}_ENDPOINT`, fullDomainName)
			} else {
				ctx.bind(`RPC_${constantCase(id)}_ENDPOINT`, cdn.domainName)
			}
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

				new $.aws.dynamodb.TableItem(queryGroup, 'query', {
					tableName: table.name,
					hashKey: table.hashKey,
					rangeKey: table.rangeKey,
					item: JSON.stringify({
						query: { S: name },
						function: {
							S: formatLocalResourceName({
								appName: ctx.app.name,
								stackName: ctx.stack.name,
								resourceType: 'rpc',
								resourceName: entryId,
							}),
						},
					}),
				})
			}
		}
	},
})
