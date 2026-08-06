import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { toGibibytes } from '@awsless/size'
import { defineFeature } from '../../feature.js'
import { SearchIndex } from '../../formation/open-search.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { shortId } from '../../util/id.js'
import { searchOnDev } from './dev.js'
import { formatSearchIndexName, resolveSearchMappings } from './util.js'

const typeGenCode = `
import { AnySchema, Table } from '@awsless/open-search'

type SearchIndex = {
	readonly name: string
	readonly domain: string
	readonly define: <S extends AnySchema>(schema: S) => Table<string, S>
}
`

export const searchFeature = defineFeature({
	name: 'search',
	onDev: searchOnDev,
	async onTypeGen(ctx) {
		const gen = new TypeFile('awsless')
		const resources = new TypeObject(1)

		for (const stack of ctx.stackConfigs) {
			const list = new TypeObject(2)

			for (const id of Object.keys(stack.searchs ?? {})) {
				list.addType(id, `SearchIndex`)
			}

			resources.addType(stack.name, list)
		}

		gen.addCode(typeGenCode)
		gen.addInterface('SearchResources', resources)

		await ctx.write('search.d.ts', gen, true)
	},
	onApp(ctx) {
		// Every search index in the app shares one OpenSearch domain,
		// like every table shares dynamodb. The domain only exists when
		// at least one stack declares an index.
		const indexes = ctx.stackConfigs.flatMap(stack => {
			return Object.entries(stack.searchs ?? {}).map(([id, props]) => ({
				stackName: stack.name,
				id,
				props,
			}))
		})

		if (indexes.length === 0) {
			return
		}

		const group = new Group(ctx.base, 'search', 'main')
		const name = `${ctx.app.name}-${shortId([ctx.app.name, 'search', 'main'].join('--'))}`
		const props = ctx.appConfig.search

		const openSearch = new aws.opensearch.Domain(
			group,
			'domain',
			{
				domainName: name,
				engineVersion: `OpenSearch_${props.version}`,
				ipAddressType: 'dualstack',
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
					],
				}),
			},
			{
				retainOnDelete: ctx.appConfig.removal === 'retain',
				import: ctx.import ? name : undefined,
			}
		)

		ctx.addEnv('SEARCH_DOMAIN', openSearch.endpointV2)

		ctx.addGlobalPermission({
			actions: ['es:ESHttp*'],
			resources: [openSearch.arn.pipe(arn => `${arn}/*`)],
		})

		// The indexes are managed like tables: the deploy creates missing
		// indexes & applies the mappings, with the physical name prefixed
		// by the stack name.
		for (const { stackName, id, props: indexProps } of indexes) {
			new SearchIndex(group, `index-${stackName}-${id}`, {
				endpoint: openSearch.endpointV2,
				index: formatSearchIndexName(stackName, id),
				mappings: JSON.stringify(resolveSearchMappings(indexProps) ?? {}),
				settings: JSON.stringify(indexProps.settings ?? {}),
			})
		}
	},
})
