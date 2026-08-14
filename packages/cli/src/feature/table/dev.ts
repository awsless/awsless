import { CreateTableCommand, DeleteTableCommand } from '@aws-sdk/client-dynamodb'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { constantCase } from 'change-case'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { StackConfig } from '../../config/stack.js'
import { isWiping } from '../../dev/reset.js'
import { parseTraceHeader } from '../../dev/util.js'
import { DevContext } from '../../feature.js'
import { formatLocalResourceName } from '../../util/name.js'
import { directories } from '../../util/path.js'
import { formatRouteKey } from '../bundle/util.js'
import { formatTableKeys } from './util.js'

type TableProps = NonNullable<StackConfig['tables']>[string]

const attributeTypes = {
	string: 'S',
	number: 'N',
	binary: 'B',
} as const

// Also feeds the auto test environment, which creates every table of
// the app from the same config-derived definition.
export const createTableInput = (name: string, props: TableProps) => {
	const attributes = new Set(
		[
			props.hash,
			props.sort,
			...Object.values(props.indexes ?? {}).map(index => [
				//
				index.hash,
				index.sort,
			]),
		]
			.flat(2)
			.filter(v => !!v) as string[]
	)

	return {
		TableName: name,
		BillingMode: 'PAY_PER_REQUEST' as const,
		KeySchema: [
			{ AttributeName: props.hash, KeyType: 'HASH' as const },
			...(props.sort ? [{ AttributeName: props.sort, KeyType: 'RANGE' as const }] : []),
		],
		AttributeDefinitions: [...attributes].map(name => ({
			AttributeName: name,
			AttributeType: attributeTypes[props.fields?.[name] ?? 'string'],
		})),
		GlobalSecondaryIndexes:
			props.indexes && Object.keys(props.indexes).length > 0
				? Object.entries(props.indexes).map(([name, index]) => ({
						IndexName: name,
						Projection: { ProjectionType: constantCase(index.projection) as 'ALL' | 'KEYS_ONLY' },
						KeySchema: [
							...index.hash.map(name => ({ AttributeName: name, KeyType: 'HASH' as const })),
							...(index.sort ?? []).map(name => ({ AttributeName: name, KeyType: 'RANGE' as const })),
						],
					}))
				: undefined,
		StreamSpecification: props.stream
			? {
					StreamEnabled: true,
					StreamViewType: constantCase(props.stream.type) as
						| 'KEYS_ONLY'
						| 'NEW_IMAGE'
						| 'OLD_IMAGE'
						| 'NEW_AND_OLD_IMAGES',
				}
			: undefined,
	}
}

const loadSeed = async (stackName: string, id: string) => {
	const file = join(directories.output, 'local', 'seed', 'table', stackName, `${id}.json`)

	try {
		const items = JSON.parse(await readFile(file, 'utf8'))

		return Array.isArray(items) ? items : []
	} catch (_) {
		return []
	}
}

export const tableOnDev = async (ctx: DevContext) => {
	const tables = ctx.stackConfigs.flatMap(stack => {
		return Object.entries(stack.tables ?? {}).map(([id, props]) => ({
			stackName: stack.name,
			id,
			props,
		}))
	})

	if (tables.length === 0) {
		return
	}

	const { server, tableFingerprints } = await ctx.useDynamo()

	const tableName = (stackName: string, id: string) => {
		return formatLocalResourceName({
			appName: ctx.appConfig.name,
			stackName,
			resourceType: 'table',
			resourceName: id,
		})
	}

	for (const { stackName, id, props } of tables) {
		ctx.addEnv(`TABLE_${constantCase(stackName)}_${constantCase(id)}_KEYS`, JSON.stringify(formatTableKeys(props)))

		ctx.registerResource({
			kind: 'table',
			stack: stackName,
			id,
			routeKey: props.stream ? formatRouteKey(stackName, 'table', id) : undefined,
			detail: tableName(stackName, id),
		})
	}

	// The stream listeners re-attach every run against the new
	// dispatch, so the pooled server never stacks stale listeners.
	const unsubscribes: (() => void)[] = []

	ctx.registerServer({
		name: 'tables',
		async start({ dispatch, reportFailure }) {
			const client = server.getClient()
			const documentClient = server.getDocumentClient()
			const wanted = new Set(tables.map(({ stackName, id }) => tableName(stackName, id)))

			// Tables removed from the config drop off the pooled server.
			for (const name of [...tableFingerprints.keys()]) {
				if (!wanted.has(name)) {
					await client.send(new DeleteTableCommand({ TableName: name }))
					tableFingerprints.delete(name)
				}
			}

			for (const { stackName, id, props } of tables) {
				const name = tableName(stackName, id)
				const input = createTableInput(name, props)
				const fingerprint = JSON.stringify(input)

				// An unchanged table survives with its data - only a
				// changed table config recreates it.
				if (tableFingerprints.get(name) !== fingerprint) {
					if (tableFingerprints.has(name)) {
						await client.send(new DeleteTableCommand({ TableName: name }))
					}

					await client.send(new CreateTableCommand(input))
					tableFingerprints.set(name, fingerprint)

					// Seeds load before the stream consumers attach, so the
					// baseline data never triggers consumers.
					for (const item of await loadSeed(stackName, id)) {
						await documentClient.send(new PutCommand({ TableName: name, Item: item }))
					}
				}

				if (props.stream) {
					const routeKey = formatRouteKey(stackName, 'table', id)
					const eventSourceARN = `arn:aws:dynamodb:${ctx.appConfig.region}:000000000000:table/${name}/stream/local`

					const unsubscribe = server.onStreamRecord(name, (record, context) => {
						// Reset wipes are bookkeeping, not app activity.
						if (isWiping()) {
							return
						}

						const event = { Records: [{ ...record, eventSourceARN }] }

						// The write that caused this record carried its trace
						// as the request context, so the stream consumer joins
						// the writer's trace.
						dispatch(event, parseTraceHeader(context)).catch(error => {
							reportFailure({
								kind: 'stream',
								routeKey,
								event,
								error,
							})
						})
					})

					unsubscribes.push(unsubscribe)
				}
			}
		},
		stop() {
			for (const unsubscribe of unsubscribes.splice(0)) {
				unsubscribe()
			}
		},
	})
}
