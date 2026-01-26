import type {
	AttributeDefinition,
	AttributeMap,
	GlobalSecondaryIndex,
	GlobalSecondaryIndexDescription,
	KeySchemaElement,
	LocalSecondaryIndex,
	LocalSecondaryIndexDescription,
	Projection,
	ProvisionedThroughput,
	StreamCallback,
	StreamRecord,
	StreamSpecification,
	TableDescription,
	TimeToLiveSpecification,
} from '../types.js'
import { deepClone, estimateItemSize, extractKey, getHashKey, getRangeKey, serializeKey } from './item.js'

let sequenceCounter = 0

function generateSequenceNumber(): string {
	return String(++sequenceCounter).padStart(21, '0')
}

function generateEventId(): string {
	return crypto.randomUUID().replace(/-/g, '')
}

interface IndexData {
	keySchema: KeySchemaElement[]
	projection: Projection
	provisionedThroughput?: ProvisionedThroughput
	items: Map<string, Set<string>>
}

export class Table {
	readonly name: string
	readonly keySchema: KeySchemaElement[]
	readonly attributeDefinitions: AttributeDefinition[]
	readonly provisionedThroughput?: ProvisionedThroughput
	readonly billingMode: 'PROVISIONED' | 'PAY_PER_REQUEST'
	readonly createdAt: number
	readonly tableId: string
	readonly streamSpecification?: StreamSpecification
	readonly latestStreamArn?: string
	readonly latestStreamLabel?: string

	private ttlSpecification?: TimeToLiveSpecification
	private items: Map<string, AttributeMap> = new Map()
	private globalSecondaryIndexes: Map<string, IndexData> = new Map()
	private localSecondaryIndexes: Map<string, IndexData> = new Map()
	private streamCallbacks: Set<StreamCallback> = new Set()
	private region: string

	constructor(
		options: {
			tableName: string
			keySchema: KeySchemaElement[]
			attributeDefinitions: AttributeDefinition[]
			provisionedThroughput?: ProvisionedThroughput
			billingMode?: 'PROVISIONED' | 'PAY_PER_REQUEST'
			globalSecondaryIndexes?: GlobalSecondaryIndex[]
			localSecondaryIndexes?: LocalSecondaryIndex[]
			streamSpecification?: StreamSpecification
			timeToLiveSpecification?: TimeToLiveSpecification
		},
		region: string = 'us-east-1'
	) {
		this.name = options.tableName
		this.keySchema = options.keySchema
		this.attributeDefinitions = options.attributeDefinitions
		this.provisionedThroughput = options.provisionedThroughput
		this.billingMode = options.billingMode ?? (options.provisionedThroughput ? 'PROVISIONED' : 'PAY_PER_REQUEST')
		this.createdAt = Date.now()
		this.tableId = crypto.randomUUID()
		this.region = region
		this.streamSpecification = options.streamSpecification
		this.ttlSpecification = options.timeToLiveSpecification

		if (options.streamSpecification?.StreamEnabled) {
			this.latestStreamLabel = new Date().toISOString().replace(/[:.]/g, '-')
			this.latestStreamArn = `arn:aws:dynamodb:${region}:000000000000:table/${this.name}/stream/${this.latestStreamLabel}`
		}

		if (options.globalSecondaryIndexes) {
			for (const gsi of options.globalSecondaryIndexes) {
				this.globalSecondaryIndexes.set(gsi.IndexName, {
					keySchema: gsi.KeySchema,
					projection: gsi.Projection,
					provisionedThroughput: gsi.ProvisionedThroughput,
					items: new Map(),
				})
			}
		}

		if (options.localSecondaryIndexes) {
			for (const lsi of options.localSecondaryIndexes) {
				this.localSecondaryIndexes.set(lsi.IndexName, {
					keySchema: lsi.KeySchema,
					projection: lsi.Projection,
					items: new Map(),
				})
			}
		}
	}

	getHashKeyName(): string {
		return getHashKey(this.keySchema)
	}

	getRangeKeyName(): string | undefined {
		return getRangeKey(this.keySchema)
	}

	getTtlAttributeName(): string | undefined {
		if (this.ttlSpecification?.Enabled) {
			return this.ttlSpecification.AttributeName
		}
		return undefined
	}

	setTtlSpecification(spec: TimeToLiveSpecification): void {
		this.ttlSpecification = spec
	}

	getTtlSpecification(): TimeToLiveSpecification | undefined {
		return this.ttlSpecification
	}

	describe(): TableDescription {
		const desc: TableDescription = {
			TableName: this.name,
			TableStatus: 'ACTIVE',
			CreationDateTime: this.createdAt / 1000,
			TableArn: `arn:aws:dynamodb:${this.region}:000000000000:table/${this.name}`,
			TableId: this.tableId,
			KeySchema: this.keySchema,
			AttributeDefinitions: this.attributeDefinitions,
			ItemCount: this.items.size,
			TableSizeBytes: this.estimateTableSize(),
		}

		if (this.billingMode === 'PROVISIONED' && this.provisionedThroughput) {
			desc.ProvisionedThroughput = {
				ReadCapacityUnits: this.provisionedThroughput.ReadCapacityUnits,
				WriteCapacityUnits: this.provisionedThroughput.WriteCapacityUnits,
				NumberOfDecreasesToday: 0,
			}
		} else {
			desc.BillingModeSummary = {
				BillingMode: 'PAY_PER_REQUEST',
			}
		}

		if (this.globalSecondaryIndexes.size > 0) {
			desc.GlobalSecondaryIndexes = this.describeGlobalSecondaryIndexes()
		}

		if (this.localSecondaryIndexes.size > 0) {
			desc.LocalSecondaryIndexes = this.describeLocalSecondaryIndexes()
		}

		if (this.streamSpecification) {
			desc.StreamSpecification = this.streamSpecification
			if (this.latestStreamArn) {
				desc.LatestStreamArn = this.latestStreamArn
				desc.LatestStreamLabel = this.latestStreamLabel
			}
		}

		return desc
	}

	private describeGlobalSecondaryIndexes(): GlobalSecondaryIndexDescription[] {
		const indexes: GlobalSecondaryIndexDescription[] = []
		for (const [name, data] of this.globalSecondaryIndexes) {
			let itemCount = 0
			for (const keys of data.items.values()) {
				itemCount += keys.size
			}
			indexes.push({
				IndexName: name,
				KeySchema: data.keySchema,
				Projection: data.projection,
				IndexStatus: 'ACTIVE',
				ProvisionedThroughput: data.provisionedThroughput,
				IndexSizeBytes: 0,
				ItemCount: itemCount,
				IndexArn: `arn:aws:dynamodb:${this.region}:000000000000:table/${this.name}/index/${name}`,
			})
		}
		return indexes
	}

	private describeLocalSecondaryIndexes(): LocalSecondaryIndexDescription[] {
		const indexes: LocalSecondaryIndexDescription[] = []
		for (const [name, data] of this.localSecondaryIndexes) {
			let itemCount = 0
			for (const keys of data.items.values()) {
				itemCount += keys.size
			}
			indexes.push({
				IndexName: name,
				KeySchema: data.keySchema,
				Projection: data.projection,
				IndexSizeBytes: 0,
				ItemCount: itemCount,
				IndexArn: `arn:aws:dynamodb:${this.region}:000000000000:table/${this.name}/index/${name}`,
			})
		}
		return indexes
	}

	private estimateTableSize(): number {
		let size = 0
		for (const item of this.items.values()) {
			size += estimateItemSize(item)
		}
		return size
	}

	getItem(key: AttributeMap): AttributeMap | undefined {
		const keyString = serializeKey(key, this.keySchema)
		const item = this.items.get(keyString)
		return item ? deepClone(item) : undefined
	}

	putItem(item: AttributeMap): AttributeMap | undefined {
		const key = extractKey(item, this.keySchema)
		const keyString = serializeKey(key, this.keySchema)
		const oldItem = this.items.get(keyString)

		this.items.set(keyString, deepClone(item))
		this.updateIndexes(item, oldItem)
		this.emitStreamRecord(oldItem ? 'MODIFY' : 'INSERT', key, oldItem, item)

		return oldItem ? deepClone(oldItem) : undefined
	}

	deleteItem(key: AttributeMap): AttributeMap | undefined {
		const keyString = serializeKey(key, this.keySchema)
		const oldItem = this.items.get(keyString)

		if (oldItem) {
			this.items.delete(keyString)
			this.removeFromIndexes(oldItem)
			this.emitStreamRecord('REMOVE', key, oldItem, undefined)
		}

		return oldItem ? deepClone(oldItem) : undefined
	}

	updateItem(key: AttributeMap, updatedItem: AttributeMap): AttributeMap | undefined {
		const keyString = serializeKey(key, this.keySchema)
		const oldItem = this.items.get(keyString)

		this.items.set(keyString, deepClone(updatedItem))
		this.updateIndexes(updatedItem, oldItem)
		this.emitStreamRecord(oldItem ? 'MODIFY' : 'INSERT', key, oldItem, updatedItem)

		return oldItem ? deepClone(oldItem) : undefined
	}

	private updateIndexes(newItem: AttributeMap, oldItem?: AttributeMap): void {
		if (oldItem) {
			this.removeFromIndexes(oldItem)
		}
		this.addToIndexes(newItem)
	}

	private addToIndexes(item: AttributeMap): void {
		const primaryKey = serializeKey(extractKey(item, this.keySchema), this.keySchema)

		for (const [, indexData] of this.globalSecondaryIndexes) {
			const indexKey = this.buildIndexKey(item, indexData.keySchema)
			if (indexKey) {
				let keys = indexData.items.get(indexKey)
				if (!keys) {
					keys = new Set()
					indexData.items.set(indexKey, keys)
				}
				keys.add(primaryKey)
			}
		}

		for (const [, indexData] of this.localSecondaryIndexes) {
			const indexKey = this.buildIndexKey(item, indexData.keySchema)
			if (indexKey) {
				let keys = indexData.items.get(indexKey)
				if (!keys) {
					keys = new Set()
					indexData.items.set(indexKey, keys)
				}
				keys.add(primaryKey)
			}
		}
	}

	private removeFromIndexes(item: AttributeMap): void {
		const primaryKey = serializeKey(extractKey(item, this.keySchema), this.keySchema)

		for (const [, indexData] of this.globalSecondaryIndexes) {
			const indexKey = this.buildIndexKey(item, indexData.keySchema)
			if (indexKey) {
				const keys = indexData.items.get(indexKey)
				if (keys) {
					keys.delete(primaryKey)
					if (keys.size === 0) {
						indexData.items.delete(indexKey)
					}
				}
			}
		}

		for (const [, indexData] of this.localSecondaryIndexes) {
			const indexKey = this.buildIndexKey(item, indexData.keySchema)
			if (indexKey) {
				const keys = indexData.items.get(indexKey)
				if (keys) {
					keys.delete(primaryKey)
					if (keys.size === 0) {
						indexData.items.delete(indexKey)
					}
				}
			}
		}
	}

	private buildIndexKey(item: AttributeMap, keySchema: KeySchemaElement[]): string | null {
		const hashAttr = getHashKey(keySchema)
		if (!item[hashAttr]) {
			return null
		}

		const rangeAttr = getRangeKey(keySchema)
		if (rangeAttr && !item[rangeAttr]) {
			return null
		}

		return serializeKey(extractKey(item, keySchema), keySchema)
	}

	scan(limit?: number, exclusiveStartKey?: AttributeMap): { items: AttributeMap[]; lastEvaluatedKey?: AttributeMap } {
		const hashAttr = this.getHashKeyName()
		const rangeAttr = this.getRangeKeyName()

		const allItems = Array.from(this.items.values()).map(item => deepClone(item))
		allItems.sort((a, b) => {
			const hashA = a[hashAttr]
			const hashB = b[hashAttr]
			if (hashA && hashB) {
				const hashCmp = this.compareAttributes(hashA, hashB)
				if (hashCmp !== 0) return hashCmp
			}
			if (rangeAttr) {
				const rangeA = a[rangeAttr]
				const rangeB = b[rangeAttr]
				if (rangeA && rangeB) {
					return this.compareAttributes(rangeA, rangeB)
				}
			}
			return 0
		})

		// Find start index if exclusiveStartKey is provided
		let startIdx = 0
		if (exclusiveStartKey) {
			const startKey = serializeKey(exclusiveStartKey, this.keySchema)
			startIdx = allItems.findIndex(
				item => serializeKey(extractKey(item, this.keySchema), this.keySchema) === startKey
			)
			if (startIdx !== -1) {
				startIdx++ // Start after the exclusive start key
			} else {
				startIdx = 0
			}
		}

		// Apply limit
		const items = limit ? allItems.slice(startIdx, startIdx + limit) : allItems.slice(startIdx)

		const hasMore = limit ? startIdx + limit < allItems.length : false
		const lastItem = items[items.length - 1]

		return {
			items,
			lastEvaluatedKey: hasMore && lastItem ? extractKey(lastItem, this.keySchema) : undefined,
		}
	}

	queryByHashKey(
		hashValue: AttributeMap,
		options?: {
			limit?: number
			scanIndexForward?: boolean
			exclusiveStartKey?: AttributeMap
		}
	): { items: AttributeMap[]; lastEvaluatedKey?: AttributeMap } {
		const hashAttr = this.getHashKeyName()
		const rangeAttr = this.getRangeKeyName()

		const matchingItems: AttributeMap[] = []

		for (const item of this.items.values()) {
			const itemHashValue = item[hashAttr]
			const queryHashValue = hashValue[hashAttr]

			if (itemHashValue && queryHashValue && this.attributeEquals(itemHashValue, queryHashValue)) {
				matchingItems.push(deepClone(item))
			}
		}

		if (rangeAttr) {
			matchingItems.sort((a, b) => {
				const aVal = a[rangeAttr]
				const bVal = b[rangeAttr]
				if (!aVal && !bVal) return 0
				if (!aVal) return 1
				if (!bVal) return -1
				const cmp = this.compareAttributes(aVal, bVal)
				return options?.scanIndexForward === false ? -cmp : cmp
			})
		}

		let startIdx = 0
		if (options?.exclusiveStartKey) {
			const startKey = serializeKey(options.exclusiveStartKey, this.keySchema)
			startIdx = matchingItems.findIndex(
				item => serializeKey(extractKey(item, this.keySchema), this.keySchema) === startKey
			)
			if (startIdx !== -1) {
				startIdx++
			} else {
				startIdx = 0
			}
		}

		const limit = options?.limit
		const sliced = limit ? matchingItems.slice(startIdx, startIdx + limit) : matchingItems.slice(startIdx)

		const hasMore = limit ? startIdx + limit < matchingItems.length : false
		const lastItem = sliced[sliced.length - 1]

		return {
			items: sliced,
			lastEvaluatedKey: hasMore && lastItem ? extractKey(lastItem, this.keySchema) : undefined,
		}
	}

	queryIndex(
		indexName: string,
		hashValue: AttributeMap,
		options?: {
			limit?: number
			scanIndexForward?: boolean
			exclusiveStartKey?: AttributeMap
		}
	): { items: AttributeMap[]; lastEvaluatedKey?: AttributeMap; indexKeySchema: KeySchemaElement[] } {
		const gsi = this.globalSecondaryIndexes.get(indexName)
		const lsi = this.localSecondaryIndexes.get(indexName)
		const indexData = gsi || lsi

		if (!indexData) {
			throw new Error(`Index ${indexName} not found`)
		}

		const indexHashAttr = getHashKey(indexData.keySchema)
		const indexRangeAttr = getRangeKey(indexData.keySchema)

		const matchingItems: AttributeMap[] = []

		for (const item of this.items.values()) {
			const itemHashValue = item[indexHashAttr]
			const queryHashValue = hashValue[indexHashAttr]

			// Check if item matches the query hash value
			if (!itemHashValue || !queryHashValue || !this.attributeEquals(itemHashValue, queryHashValue)) {
				continue
			}

			// For GSIs, items with missing range key attribute are not projected to the index
			if (indexRangeAttr && !item[indexRangeAttr]) {
				continue
			}

			matchingItems.push(deepClone(item))
		}

		if (indexRangeAttr) {
			matchingItems.sort((a, b) => {
				const aVal = a[indexRangeAttr]
				const bVal = b[indexRangeAttr]
				if (!aVal && !bVal) return 0
				if (!aVal) return 1
				if (!bVal) return -1
				const cmp = this.compareAttributes(aVal, bVal)
				return options?.scanIndexForward === false ? -cmp : cmp
			})
		}

		let startIdx = 0
		if (options?.exclusiveStartKey) {
			const combinedKeySchema = [...indexData.keySchema]
			const tableRangeKey = this.getRangeKeyName()
			if (tableRangeKey && !combinedKeySchema.some(k => k.AttributeName === tableRangeKey)) {
				combinedKeySchema.push({ AttributeName: tableRangeKey, KeyType: 'RANGE' })
			}
			const tableHashKey = this.getHashKeyName()
			if (!combinedKeySchema.some(k => k.AttributeName === tableHashKey)) {
				combinedKeySchema.push({ AttributeName: tableHashKey, KeyType: 'HASH' })
			}

			const startKey = serializeKey(options.exclusiveStartKey, combinedKeySchema)
			startIdx = matchingItems.findIndex(
				item => serializeKey(extractKey(item, combinedKeySchema), combinedKeySchema) === startKey
			)
			if (startIdx !== -1) {
				startIdx++
			} else {
				startIdx = 0
			}
		}

		const limit = options?.limit
		const sliced = limit ? matchingItems.slice(startIdx, startIdx + limit) : matchingItems.slice(startIdx)

		const hasMore = limit ? startIdx + limit < matchingItems.length : false
		const lastItem = sliced[sliced.length - 1]

		let lastEvaluatedKey: AttributeMap | undefined
		if (hasMore && lastItem) {
			lastEvaluatedKey = extractKey(lastItem, this.keySchema)
			for (const keyElement of indexData.keySchema) {
				const attrValue = lastItem[keyElement.AttributeName]
				if (attrValue) {
					lastEvaluatedKey[keyElement.AttributeName] = attrValue
				}
			}
		}

		return {
			items: sliced,
			lastEvaluatedKey,
			indexKeySchema: indexData.keySchema,
		}
	}

	scanIndex(
		indexName: string,
		limit?: number,
		exclusiveStartKey?: AttributeMap
	): { items: AttributeMap[]; lastEvaluatedKey?: AttributeMap; indexKeySchema: KeySchemaElement[] } {
		const gsi = this.globalSecondaryIndexes.get(indexName)
		const lsi = this.localSecondaryIndexes.get(indexName)
		const indexData = gsi || lsi

		if (!indexData) {
			throw new Error(`Index ${indexName} not found`)
		}

		const indexHashAttr = getHashKey(indexData.keySchema)
		const matchingItems: AttributeMap[] = []

		for (const item of this.items.values()) {
			if (item[indexHashAttr]) {
				matchingItems.push(deepClone(item))
			}
		}

		let startIdx = 0
		if (exclusiveStartKey) {
			const startKey = serializeKey(exclusiveStartKey, this.keySchema)
			startIdx = matchingItems.findIndex(
				item => serializeKey(extractKey(item, this.keySchema), this.keySchema) === startKey
			)
			if (startIdx !== -1) {
				startIdx++
			} else {
				startIdx = 0
			}
		}

		const sliced = limit ? matchingItems.slice(startIdx, startIdx + limit) : matchingItems.slice(startIdx)

		const hasMore = limit ? startIdx + limit < matchingItems.length : false
		const lastItem = sliced[sliced.length - 1]

		let lastEvaluatedKey: AttributeMap | undefined
		if (hasMore && lastItem) {
			lastEvaluatedKey = extractKey(lastItem, this.keySchema)
			for (const keyElement of indexData.keySchema) {
				const attrValue = lastItem[keyElement.AttributeName]
				if (attrValue) {
					lastEvaluatedKey[keyElement.AttributeName] = attrValue
				}
			}
		}

		return {
			items: sliced,
			lastEvaluatedKey,
			indexKeySchema: indexData.keySchema,
		}
	}

	hasIndex(indexName: string): boolean {
		return this.globalSecondaryIndexes.has(indexName) || this.localSecondaryIndexes.has(indexName)
	}

	getIndexKeySchema(indexName: string): KeySchemaElement[] | undefined {
		return (
			this.globalSecondaryIndexes.get(indexName)?.keySchema ||
			this.localSecondaryIndexes.get(indexName)?.keySchema
		)
	}

	private attributeEquals(a: AttributeMap[string], b: AttributeMap[string]): boolean {
		if ('S' in a && 'S' in b) return a.S === b.S
		if ('N' in a && 'N' in b) return a.N === b.N
		if ('B' in a && 'B' in b) return a.B === b.B
		return JSON.stringify(a) === JSON.stringify(b)
	}

	private compareAttributes(a: AttributeMap[string], b: AttributeMap[string]): number {
		if ('S' in a && 'S' in b) return a.S.localeCompare(b.S)
		if ('N' in a && 'N' in b) return parseFloat(a.N) - parseFloat(b.N)
		if ('B' in a && 'B' in b) return a.B.localeCompare(b.B)
		return 0
	}

	getAllItems(): AttributeMap[] {
		return Array.from(this.items.values()).map(item => deepClone(item))
	}

	clear(): void {
		this.items.clear()
		for (const index of this.globalSecondaryIndexes.values()) {
			index.items.clear()
		}
		for (const index of this.localSecondaryIndexes.values()) {
			index.items.clear()
		}
	}

	onStreamRecord(callback: StreamCallback): () => void {
		this.streamCallbacks.add(callback)
		return () => {
			this.streamCallbacks.delete(callback)
		}
	}

	private emitStreamRecord(
		eventName: 'INSERT' | 'MODIFY' | 'REMOVE',
		keys: AttributeMap,
		oldImage?: AttributeMap,
		newImage?: AttributeMap
	): void {
		if (!this.streamSpecification?.StreamEnabled || this.streamCallbacks.size === 0) {
			return
		}

		const viewType = this.streamSpecification.StreamViewType || 'NEW_AND_OLD_IMAGES'

		const record: StreamRecord = {
			eventID: generateEventId(),
			eventName,
			eventVersion: '1.1',
			eventSource: 'aws:dynamodb',
			awsRegion: this.region,
			dynamodb: {
				ApproximateCreationDateTime: Date.now() / 1000,
				Keys: keys,
				SequenceNumber: generateSequenceNumber(),
				SizeBytes: estimateItemSize(keys),
				StreamViewType: viewType,
			},
		}

		if (viewType === 'NEW_IMAGE' || viewType === 'NEW_AND_OLD_IMAGES') {
			if (newImage) {
				record.dynamodb.NewImage = deepClone(newImage)
			}
		}

		if (viewType === 'OLD_IMAGE' || viewType === 'NEW_AND_OLD_IMAGES') {
			if (oldImage) {
				record.dynamodb.OldImage = deepClone(oldImage)
			}
		}

		for (const callback of this.streamCallbacks) {
			try {
				callback(record)
			} catch {
				// Ignore callback errors
			}
		}
	}

	expireTtlItems(currentTimeSeconds: number): AttributeMap[] {
		const ttlAttr = this.getTtlAttributeName()
		if (!ttlAttr) {
			return []
		}

		const expiredItems: AttributeMap[] = []

		for (const [keyString, item] of this.items) {
			const ttlValue = item[ttlAttr]
			if (ttlValue && 'N' in ttlValue) {
				const ttlTimestamp = parseInt(ttlValue.N, 10)
				if (ttlTimestamp <= currentTimeSeconds) {
					expiredItems.push(deepClone(item))
					const key = extractKey(item, this.keySchema)
					this.items.delete(keyString)
					this.removeFromIndexes(item)
					this.emitStreamRecord('REMOVE', key, item, undefined)
				}
			}
		}

		return expiredItems
	}
}
