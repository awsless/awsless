import { Group } from '@awsless/formation'
import { constantCase } from 'change-case'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { shortId } from '../../util/id.js'
import { $ } from '@awsless/formation'
import { toGibibytes } from '@awsless/size'

const typeGenCode = `
import { AnyStruct, Table } from '@awsless/open-search'

type Search = {
	readonly domain: string
	readonly defineTable: <N extends string, S extends AnyStruct>(tableName: N, schema: S) => Table<N, S>
}
`

export const searchFeature = defineFeature({
	name: 'search',
	async onTypeGen(ctx) {
		const gen = new TypeFile('@awsless/awsless')
		const resources = new TypeObject(1)

		for (const stack of ctx.stackConfigs) {
			const list = new TypeObject(2)

			for (const id of Object.keys(stack.searchs ?? {})) {
				list.addType(id, `Search`)
			}

			resources.addType(stack.name, list)
		}

		gen.addCode(typeGenCode)
		gen.addInterface('SearchResources', resources)

		await ctx.write('search.d.ts', gen, true)
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.searchs ?? {})) {
			const group = new Group(ctx.stack, 'search', id)
			const name = `${ctx.app.name}-${shortId([ctx.app.name, ctx.stack.name, 'search', id].join('--'))}`

			const openSearch = new $.aws.opensearch.Domain(
				group,
				'domain',
				{
					domainName: name,
					engineVersion: `OpenSearch_${props.version}`,
					ipAddressType: 'ipv4',
					clusterConfig: {
						instanceType: `${props.type}.search`,
						instanceCount: props.count,
					},
					ebsOptions: {
						ebsEnabled: true,
						volumeSize: toGibibytes(props.storage),
						volumeType: 'gp2',
					},
					domainEndpointOptions: {
						enforceHttps: true,
					},
					softwareUpdateOptions: {
						autoSoftwareUpdateEnabled: true,
					},
					nodeToNodeEncryption: {
						enabled: false,
					},
					encryptAtRest: {
						enabled: false,
					},
					accessPolicies: JSON.stringify({
						Version: '2012-10-17',
						Statement: [
							{
								Effect: 'Allow',
								Action: 'es:*',
								Principal: { AWS: '*' },
								Resource: [`arn:aws:es:${ctx.appConfig.region}:${ctx.accountId}:domain/${name}/*`],
								Condition: {
									StringLike: {
										'AWS:PrincipalArn': `this-will-never-work`,
									},
								},
							},
							// {
							// 	Effect: 'Allow',
							// 	Action: 'es:*',
							// 	Principal: { AWS: '*' },
							// 	Resource: [`arn:aws:es:${ctx.appConfig.region}:${ctx.accountId}:domain/${name}/*`],
							// 	Condition: {
							// 		StringLike: {
							// 			'AWS:PrincipalArn': `arn:aws:iam::${ctx.accountId}:role/${ctx.app.name}--*`,
							// 		},
							// 	},
							// },
						],
					}),
				},
				{
					import: ctx.import ? name : undefined,
					retainOnDelete: ctx.appConfig.removal === 'retain',
				}
			)

			ctx.addEnv(`SEARCH_${constantCase(ctx.stack.name)}_${constantCase(id)}_DOMAIN`, openSearch.endpoint)

			ctx.addStackPermission({
				actions: ['es:ESHttp*'],
				resources: [
					//
					// openSearch.arn,
					openSearch.arn.pipe(arn => `${arn}/*`),
				],
			})
		}
	},
})
