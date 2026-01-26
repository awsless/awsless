import type { AttributeMap, AttributeValue, KeySchemaElement } from '../types.js'

export function extractKey(item: AttributeMap, keySchema: KeySchemaElement[]): AttributeMap {
	const key: AttributeMap = {}
	for (const element of keySchema) {
		const value = item[element.AttributeName]
		if (value) {
			key[element.AttributeName] = value
		}
	}
	return key
}

export function serializeKey(key: AttributeMap, keySchema: KeySchemaElement[]): string {
	const parts: string[] = []
	for (const element of keySchema) {
		const value = key[element.AttributeName]
		if (value) {
			parts.push(serializeAttributeValue(value))
		}
	}
	return parts.join('#')
}

export function serializeAttributeValue(value: AttributeValue): string {
	if ('S' in value) return `S:${value.S}`
	if ('N' in value) return `N:${value.N}`
	if ('B' in value) return `B:${value.B}`
	if ('SS' in value) return `SS:${value.SS.sort().join(',')}`
	if ('NS' in value) return `NS:${value.NS.sort().join(',')}`
	if ('BS' in value) return `BS:${value.BS.sort().join(',')}`
	if ('BOOL' in value) return `BOOL:${value.BOOL}`
	if ('NULL' in value) return 'NULL'
	if ('L' in value) return `L:${JSON.stringify(value.L)}`
	if ('M' in value) return `M:${JSON.stringify(value.M)}`
	return ''
}

export function compareAttributeValues(a: AttributeValue, b: AttributeValue): number {
	if ('S' in a && 'S' in b) {
		return a.S.localeCompare(b.S)
	}
	if ('N' in a && 'N' in b) {
		return parseFloat(a.N) - parseFloat(b.N)
	}
	if ('B' in a && 'B' in b) {
		return a.B.localeCompare(b.B)
	}
	return 0
}

export function attributeValueEquals(a: AttributeValue, b: AttributeValue): boolean {
	return serializeAttributeValue(a) === serializeAttributeValue(b)
}

export function getHashKey(keySchema: KeySchemaElement[]): string {
	const hash = keySchema.find(k => k.KeyType === 'HASH')
	if (!hash) {
		throw new Error('No hash key found')
	}
	return hash.AttributeName
}

export function getRangeKey(keySchema: KeySchemaElement[]): string | undefined {
	const range = keySchema.find(k => k.KeyType === 'RANGE')
	return range?.AttributeName
}

export function deepClone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj))
}

export function estimateItemSize(item: AttributeMap): number {
	return JSON.stringify(item).length
}
