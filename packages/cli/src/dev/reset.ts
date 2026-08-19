import { readdir, rm } from 'fs/promises'
import { join } from 'path'
import { DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import type { DynamoDBServer } from '@awsless/dynamodb-server'
import { Client } from '@opensearch-project/opensearch'
import { Redis } from 'ioredis'
import { StackConfig } from '../config/stack.js'
import { formatSearchIndexName, resolveSearchMappings } from '../feature/search/util.js'
import { applySearchIndex } from '../formation/open-search.js'
import { directories } from '../util/path.js'
import { ServerPool } from './pool.js'

// While the reset wipes the tables, the table streams stay silent -
// the deletes are bookkeeping, not app activity.
let wiping = false

export const isWiping = () => wiping

// Wipes every local data store back to empty, so a reseed lands on a
// known state instead of upserting into leftovers.
export const createDataReset = (props: { pool: ServerPool; stackConfigs: StackConfig[] }) => {
	return async () => {
		wiping = true

		try {
			// Tables clear item by item, since recreating them would drop
			// the attached stream listeners of the pooled server.
			const dynamo = props.pool.peek<{ server: DynamoDBServer; tableFingerprints: Map<string, string> }>('dynamo')

			if (dynamo) {
				const client = dynamo.server.getDocumentClient()

				for (const [name, fingerprint] of dynamo.tableFingerprints) {
					const keys = (JSON.parse(fingerprint).KeySchema as { AttributeName: string }[]).map(
						key => key.AttributeName
					)

					let cursor: Record<string, unknown> | undefined

					do {
						const result = await client.send(
							new ScanCommand({ TableName: name, ExclusiveStartKey: cursor })
						)

						for (const item of result.Items ?? []) {
							await client.send(
								new DeleteCommand({
									TableName: name,
									Key: Object.fromEntries(keys.map(key => [key, item[key]])),
								})
							)
						}

						cursor = result.LastEvaluatedKey
					} while (cursor)
				}
			}

			// Every cache redis flushes completely.
			for (const stack of props.stackConfigs) {
				for (const id of Object.keys(stack.caches ?? {})) {
					const port = props.pool.peek<number>(`cache:${stack.name}:${id}`)

					if (!port) {
						continue
					}

					const redis = new Redis({ host: '127.0.0.1', port, lazyConnect: true })

					await redis.connect()
					await redis.flushall()
					redis.disconnect()
				}
			}

			// Search indexes recreate empty with their declared mappings.
			const search = props.pool.peek<{ port: number }>('opensearch')

			if (search) {
				const client = new Client({ node: `http://localhost:${search.port}` })

				for (const stack of props.stackConfigs) {
					for (const [id, searchProps] of Object.entries(stack.searchs ?? {})) {
						const index = formatSearchIndexName(stack.name, id)

						try {
							await client.indices.delete({ index })
						} catch (_) {}

						await applySearchIndex(client, {
							index,
							mappings: resolveSearchMappings(searchProps),
							settings: searchProps.settings,
						})
					}
				}
			}

			// The store files clear, except the image & icon origins that
			// seed from the local static folders on boot.
			const storeRoot = join(directories.output, 'local', 'store')

			try {
				for (const bucket of await readdir(storeRoot)) {
					for (const entry of await readdir(join(storeRoot, bucket))) {
						if (entry === 'image' || entry === 'icon') {
							continue
						}

						await rm(join(storeRoot, bucket, entry), { recursive: true, force: true })
					}
				}
			} catch (_) {}
		} finally {
			wiping = false
		}
	}
}
