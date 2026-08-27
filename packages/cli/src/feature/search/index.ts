import { aws } from '@terraforge/aws'
import { findInputDeps, Group, Output, resolveInputs } from '@terraforge/core'
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
		// Every search index in the app shares one OpenSearch Serverless
		// collection, like every table shares dynamodb. The collection
		// only exists when at least one stack declares an index.
		const hasIndexes = ctx.stackConfigs.some(stack => {
			return Object.keys(stack.searchs ?? {}).length > 0
		})

		if (!hasIndexes) {
			return
		}

		const group = new Group(ctx.base, 'search', 'main')
		const name = `${ctx.app.name}-${shortId([ctx.app.name, 'search', 'main'].join('--'))}`
		const props = ctx.appConfig.search
		// const retainOnDelete = ctx.appConfig.removal === 'retain'

		// The deploy assumes this role to manage the indexes, so
		// deployers only need sts:AssumeRole instead of a principal
		// entry in the data access policy.
		const accessRole = new aws.iam.Role(
			group,
			'access-role',
			{
				name: `${name}-search-access`,
				description: `Search data access ${ctx.app.name}`,
				assumeRolePolicy: JSON.stringify({
					Version: '2012-10-17',
					Statement: [
						{
							Effect: 'Allow',
							Action: 'sts:AssumeRole',
							Principal: {
								AWS: `arn:aws:iam::${ctx.accountId}:root`,
							},
						},
					],
				}),
				inlinePolicy: [
					{
						name: 'search-access',
						policy: JSON.stringify({
							Version: '2012-10-17',
							Statement: [
								{
									Effect: 'Allow',
									Action: ['aoss:APIAccessAll'],
									Resource: [`arn:aws:aoss:${ctx.appConfig.region}:${ctx.accountId}:collection/*`],
								},
							],
						}),
					},
				],
			},
			{
				replaceOnChanges: ['name'],
			}
		)

		const encryption = new aws.opensearchserverless.SecurityPolicy(group, 'encryption', {
			name,
			type: 'encryption',
			policy: JSON.stringify({
				Rules: [
					{
						ResourceType: 'collection',
						Resource: [`collection/${name}`],
					},
				],
				AWSOwnedKey: true,
			}),
		})

		const network = new aws.opensearchserverless.SecurityPolicy(group, 'network', {
			name,
			type: 'network',
			policy: JSON.stringify([
				{
					Rules: [
						{
							ResourceType: 'collection',
							Resource: [`collection/${name}`],
						},
					],
					AllowFromPublic: true,
				},
			]),
		})

		// Resources that have access to opensearch
		const principals = () => [accessRole, ...ctx.shared.list('function', 'role')]

		// The standalone function roles only exist after every stack has synthed.
		const principalDeps: Set<any> = new Set()
		ctx.onReady(() => {
			for (const dep of findInputDeps(principals().map(role => role.arn))) {
				principalDeps.add(dep)
			}
		})

		const access = new aws.opensearchserverless.AccessPolicy(group, 'access', {
			name,
			type: 'data',
			policy: new Output(principalDeps, async (resolve: (value: string) => void) => {
				const roleArns = (await resolveInputs(principals().map(role => role.arn))) as unknown as string[]

				resolve(
					JSON.stringify([
						{
							Rules: [
								{
									ResourceType: 'collection',
									Resource: [`collection/${name}`],
									Permission: ['aoss:*'],
								},
								{
									ResourceType: 'index',
									Resource: [`index/${name}/*`],
									Permission: ['aoss:*'],
								},
							],
							Principal: [...roleArns, `arn:aws:iam::${ctx.accountId}:root`],
						},
					])
				)
			}),
		})

		// A nextgen collection group scales to zero when idle, unlike
		// the classic generation with its always-on capacity floor.
		const collectionGroup = new aws.opensearchserverless.CollectionGroup(
			group,
			'group',
			{
				name,
				generation: 'NEXTGEN',
				standbyReplicas: 'ENABLED',
				capacityLimits: [
					{
						minSearchCapacityInOcu: props.capacity.search.min,
						maxSearchCapacityInOcu: props.capacity.search.max,
						minIndexingCapacityInOcu: props.capacity.indexing.min,
						maxIndexingCapacityInOcu: props.capacity.indexing.max,
					},
				],
			},
			{
				// retainOnDelete,
				replaceOnChanges: ['name', 'generation'],
			}
		)

		const collection = new aws.opensearchserverless.Collection(
			group,
			'collection',
			{
				name,
				type: 'SEARCH',
				collectionGroupName: collectionGroup.name,
			},
			{
				// retainOnDelete,
				dependsOn: [encryption, network, access],
				replaceOnChanges: ['name', 'collectionGroupName'],
			}
		)

		const endpoint = collection.collectionEndpoint

		ctx.addEnv('SEARCH_DOMAIN', endpoint)

		ctx.addPermission({
			actions: ['aoss:APIAccessAll'],
			resources: [collection.arn],
		})

		ctx.shared.set('search', 'endpoint', endpoint)
		ctx.shared.set('search', 'accessRole', accessRole)
	},
	onStack(ctx) {
		const indexes = Object.entries(ctx.stackConfig.searchs ?? {})

		if (indexes.length === 0) {
			return
		}

		const endpoint = ctx.shared.get('search', 'endpoint')
		const accessRole = ctx.shared.get('search', 'accessRole')

		// The indexes are managed like tables: the deploy creates missing
		// indexes & applies the mappings, with the physical name prefixed
		// by the stack name.
		for (const [id, props] of indexes) {
			const group = new Group(ctx.stack, 'search', id)

			new SearchIndex(
				group,
				'index',
				{
					endpoint,
					role: accessRole.arn,
					index: formatSearchIndexName(ctx.stackConfig.name, id),
					mappings: JSON.stringify(resolveSearchMappings(props) ?? {}),
					settings: JSON.stringify(props.settings ?? {}),
				},
				{
					// retainOnDelete: ctx.appConfig.removal === 'retain',
					replaceOnChanges: ['endpoint', 'index'],
					dependsOn: [accessRole],
				}
			)
		}
	},
})
