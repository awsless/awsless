import { camelCase, constantCase, paramCase } from 'change-case'
import { Asset, aws, Node } from '@awsless/formation'
import { FileError } from '../../error.js'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { shortId } from '../../util/id.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { formatFullDomainName } from '../domain/util.js'
import { createLambdaFunction } from '../function/util.js'
import { mebibytes } from '@awsless/size'
import { directories } from '../../util/path.js'
import { relative } from 'path'

export const rpcFeature = defineFeature({
	name: 'rpc',
	async onTypeGen(ctx) {
		const types = new TypeFile('@awsless/awsless/client')
		const schemas = new TypeObject(1)

		for (const id of Object.keys(ctx.appConfig.defaults.rpc)) {
			const schema = new TypeObject(2)

			for (const stack in ctx.stackConfigs) {
				for (const [name, props] of Object.entries(stack.rpc?.[id] ?? {})) {
					const relFile = relative(directories.types, props.file)
					const varName = camelCase(`${stack.name}-${name}`)

					types.addImport(varName, relFile)
					schema.addType(name, `Infer<typeof ${varName}>`)
				}
			}

			schemas.addType(id, schema)
		}

		types.addInterface('RpcSchema', schemas)

		await ctx.write('rpc.d.ts', types, true)
	},
	onApp(ctx) {
		if (Object.keys(ctx.appConfig.defaults.rpc).length > 0) {
			const group = new Node(ctx.base, 'rpc', 'setup')
			const name = formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'rpc',
				resourceName: 'setup',
			})

			const table = new aws.dynamodb.Table(group, 'schema', {
				name,
				hash: 'id',
				sort: 'name',
			})

			ctx.shared.set('rpc-schema-table-name', table.name)
		}

		for (const [id, props] of Object.entries(ctx.appConfig.defaults.rpc ?? {})) {
			const group = new Node(ctx.base, 'rpc', id)

			// let authorizer
			// if (typeof props.auth === 'object') {
			// 	const { lambda } = createLambdaFunction(group, ctx, 'trpc-auth', id, props.auth.authorizer)
			// 	authorizer = lambda
			// }

			const name = formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'rpc',
				resourceName: id,
			})

			const { lambda } = createLambdaFunction(group, ctx, 'api', id, {
				file: __dirname + '/handle/rpc.js',
				memorySize: mebibytes(256),
			})

			const url = new aws.lambda.Url(group, 'url', {
				targetArn: lambda.arn,
				authType: 'none',
			})

			const domainName = props.domain
				? formatFullDomainName(ctx.appConfig, props.domain, props.subDomain)
				: undefined

			const certificateArn = props.domain
				? ctx.shared.get<aws.ARN>(`global-certificate-${props.domain}-arn`)
				: undefined

			const dns = new aws.cloudFront.Distribution(group, 'dns', {
				name,
				compress: true,
				certificateArn,
				aliases: domainName ? [domainName] : undefined,
				origins: [
					{
						id: 'default',
						domainName: url.url.apply<string>(url => url.split('/')[2]!),
						protocol: 'https-only',
					},
				],
				targetOriginId: 'default',
				// cachePolicyId: cache.id,
				// responseHeadersPolicyId: responseHeaders.id,
				// customErrorResponses: Object.entries(props.errors ?? {}).map(([errorCode, item]) => {
				// 	if (typeof item === 'string') {
				// 		return {
				// 			errorCode,
				// 			responsePath: item,
				// 			responseCode: Number(errorCode),
				// 		}
				// 	}

				// 	return {
				// 		errorCode,
				// 		cacheMinTTL: item.minTTL,
				// 		responsePath: item.path,
				// 		responseCode: item.statusCode ?? Number(errorCode),
				// 	}
				// }),
			})

			if (props.domain) {
				const domainName = formatFullDomainName(ctx.appConfig, props.domain, props.subDomain)

				new aws.route53.RecordSet(group, 'record', {
					hostedZoneId: ctx.shared.get(`hosted-zone-${props.domain}-id`),
					type: 'A',
					name: domainName,
					alias: dns.aliasTarget,
				})

				ctx.bind(`RPC_${constantCase(id)}_ENDPOINT`, domainName)
			} else {
				ctx.bind(`RPC_${constantCase(id)}_ENDPOINT`, url.url)
			}
		}
	},
	onStack(ctx) {
		for (const [id, queries] of Object.entries(ctx.stackConfig.rpc ?? {})) {
			const defaultProps = ctx.appConfig.defaults.rpc?.[id]

			if (!defaultProps) {
				throw new FileError(ctx.stackConfig.file, `RPC definition is not defined on app level for "${id}"`)
			}

			const group = new Node(ctx.stack, 'rpc', id)

			for (const [name, props] of Object.entries(queries ?? {})) {
				const resolverGroup = new Node(group, 'query', name)
				const entryId = paramCase(`${id}-${shortId(name)}`)

				const { lambda } = createLambdaFunction(resolverGroup, ctx, `rpc`, entryId, {
					...props.consumer,
					description: `${id} ${name}`,
				})

				new aws.dynamodb.TableItem(group, 'item', {
					table: ctx.shared.get('rpc-schema-table-name'),
					item: Asset.fromJSON({ id, name }),
				})
			}
		}
	},
})
