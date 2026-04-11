import { cmp, parse } from '@awsless/big-float'
import { ValidationException } from '../errors/index.js'
import { getHashKeys, getRangeKeys } from '../store/item.js'
import type { AttributeMap, AttributeValue, KeySchemaElement } from '../types.js'

export interface KeyConditionContext {
	expressionAttributeNames?: Record<string, string>
	expressionAttributeValues?: Record<string, AttributeValue>
}

export interface ParsedKeyCondition {
	hashKey: string
	hashValue: AttributeValue
	rangeKey?: string
	rangeCondition?: {
		operator: '=' | '<' | '<=' | '>' | '>=' | 'BETWEEN' | 'begins_with'
		value: AttributeValue
		value2?: AttributeValue
	}
	hashConditions: Array<{
		key: string
		value: AttributeValue
	}>
	rangeConditions: Array<{
		key: string
		operator: '=' | '<' | '<=' | '>' | '>=' | 'BETWEEN' | 'begins_with'
		value: AttributeValue
		value2?: AttributeValue
	}>
}

function stripOuterParens(expression: string): string {
	let normalized = expression.trim()
	while (normalized.startsWith('(') && normalized.endsWith(')')) {
		let depth = 0
		let balanced = true
		for (let index = 0; index < normalized.length - 1; index++) {
			if (normalized[index] === '(') depth++
			else if (normalized[index] === ')') depth--
			if (depth === 0) {
				balanced = false
				break
			}
		}
		if (!balanced) {
			break
		}
		normalized = normalized.slice(1, -1).trim()
	}
	return normalized
}

export function parseKeyCondition(
	expression: string,
	keySchema: KeySchemaElement[],
	context: KeyConditionContext
): ParsedKeyCondition {
	const hashKeyNames = getHashKeys(keySchema)
	const rangeKeyNames = getRangeKeys(keySchema)
	const hashKeyName = hashKeyNames[0]
	const rangeKeyName = rangeKeyNames[0]

	const resolvedNames = context.expressionAttributeNames || {}
	const resolvedValues = context.expressionAttributeValues || {}

	function resolveName(name: string): string {
		if (name.startsWith('#')) {
			const resolved = resolvedNames[name]
			if (resolved === undefined) {
				throw new ValidationException(`Expression attribute name ${name} is not defined`)
			}
			return resolved
		}
		return name
	}

	function resolveValue(ref: string): AttributeValue {
		if (ref.startsWith(':')) {
			const value = resolvedValues[ref]
			if (value === undefined) {
				throw new ValidationException(`Expression attribute value ${ref} is not defined`)
			}
			return value
		}
		throw new ValidationException(`Invalid value reference: ${ref}`)
	}

	const normalizedExpression = stripOuterParens(expression)
	const parts = flattenKeyConditions(normalizedExpression)

	const hashConditions = new Map<string, AttributeValue>()
	const rangeConditions = new Map<
		string,
		{
			operator: '=' | '<' | '<=' | '>' | '>=' | 'BETWEEN' | 'begins_with'
			value: AttributeValue
			value2?: AttributeValue
		}
	>()

	for (const part of parts) {
		const trimmed = stripOuterParens(part)

		const beginsWithMatch = trimmed.match(/^begins_with\s*\(\s*([#\w]+)\s*,\s*(:\w+)\s*\)$/i)
		if (beginsWithMatch) {
			const attrName = resolveName(beginsWithMatch[1]!)
			const value = resolveValue(beginsWithMatch[2]!)

			if (rangeKeyNames.includes(attrName)) {
				rangeConditions.set(attrName, { operator: 'begins_with', value })
			} else {
				throw new ValidationException(`begins_with can only be used on sort key`)
			}
			continue
		}

		const betweenMatch = trimmed.match(/^([#\w]+)\s+BETWEEN\s+(:\w+)\s+AND\s+(:\w+)$/i)
		if (betweenMatch) {
			const attrName = resolveName(betweenMatch[1]!)
			const value1 = resolveValue(betweenMatch[2]!)
			const value2 = resolveValue(betweenMatch[3]!)

			if (rangeKeyNames.includes(attrName)) {
				rangeConditions.set(attrName, { operator: 'BETWEEN', value: value1, value2 })
			} else {
				throw new ValidationException(`BETWEEN can only be used on sort key`)
			}
			continue
		}

		const comparisonMatch = trimmed.match(/^([#\w]+)\s*(=|<>|<=|>=|<|>)\s*(:\w+)$/)
		if (comparisonMatch) {
			const attrName = resolveName(comparisonMatch[1]!)
			const operator = comparisonMatch[2]! as '=' | '<' | '<=' | '>' | '>='
			const value = resolveValue(comparisonMatch[3]!)

			if (hashKeyNames.includes(attrName)) {
				if (operator !== '=') {
					throw new ValidationException(`Partition key condition must use = operator`)
				}
				hashConditions.set(attrName, value)
			} else if (rangeKeyNames.includes(attrName)) {
				rangeConditions.set(attrName, { operator, value })
			} else {
				throw new ValidationException(`Key condition references unknown attribute: ${attrName}`)
			}
			continue
		}

		throw new ValidationException(`Invalid key condition expression: ${trimmed}`)
	}

	for (const key of hashKeyNames) {
		if (!hashConditions.has(key)) {
			throw new ValidationException(`Key condition must specify equality for partition key ${key}`)
		}
	}

	let lastSortKeyIndex = -1
	for (const [index, key] of rangeKeyNames.entries()) {
		const condition = rangeConditions.get(key)
		if (!condition) {
			if (lastSortKeyIndex !== -1) {
				throw new ValidationException(`Sort key conditions must reference a contiguous prefix of the key schema`)
			}
			continue
		}

		if (index > 0 && !rangeConditions.has(rangeKeyNames[index - 1]!)) {
			throw new ValidationException(`Sort key conditions must reference a contiguous prefix of the key schema`)
		}

		if (lastSortKeyIndex !== -1) {
			const previous = rangeConditions.get(rangeKeyNames[lastSortKeyIndex]!)
			if (previous && previous.operator !== '=') {
				throw new ValidationException(`Only the last sort key condition can use a range operator`)
			}
		}

		lastSortKeyIndex = index
	}

	const orderedHashConditions = hashKeyNames.map(key => ({
		key,
		value: hashConditions.get(key)!,
	}))

	const orderedRangeConditions = rangeKeyNames
		.filter(key => rangeConditions.has(key))
		.map(key => {
			const condition = rangeConditions.get(key)!
			return {
				key,
				operator: condition.operator,
				value: condition.value,
				value2: condition.value2,
			}
		})

	return {
		hashKey: hashKeyName!,
		hashValue: hashConditions.get(hashKeyName!)!,
		rangeKey: rangeKeyName,
		rangeCondition: orderedRangeConditions[0]
			? {
					operator: orderedRangeConditions[0].operator,
					value: orderedRangeConditions[0].value,
					value2: orderedRangeConditions[0].value2,
				}
			: undefined,
		hashConditions: orderedHashConditions,
		rangeConditions: orderedRangeConditions,
	}
}

export function matchesKeyCondition(item: AttributeMap, condition: ParsedKeyCondition): boolean {
	for (const hashCondition of condition.hashConditions) {
		const itemHashValue = item[hashCondition.key]
		if (!itemHashValue || !attributeEquals(itemHashValue, hashCondition.value)) {
			return false
		}
	}

	for (const rangeCondition of condition.rangeConditions) {
		const itemRangeValue = item[rangeCondition.key]
		if (!itemRangeValue) {
			return false
		}

		if (!matchesRangeCondition(itemRangeValue, rangeCondition)) {
			return false
		}
	}

	return true
}

function flattenKeyConditions(expression: string): string[] {
	const normalized = stripOuterParens(expression)
	const parts = splitTopLevelAndConditions(normalized)

	if (parts.length === 1) {
		return [normalized]
	}

	return parts.flatMap(part => flattenKeyConditions(part))
}

function splitTopLevelAndConditions(expression: string): string[] {
	const parts: string[] = []
	let depth = 0
	let segmentStart = 0
	let betweenPending = false

	for (let index = 0; index < expression.length; index++) {
		const char = expression[index]
		if (char === '(') {
			depth++
			continue
		}
		if (char === ')') {
			depth--
			continue
		}
		if (depth !== 0) {
			continue
		}

		if (/^BETWEEN\b/i.test(expression.slice(index))) {
			betweenPending = true
			index += 'BETWEEN'.length - 1
			continue
		}

		if (/^\s+AND\s+/i.test(expression.slice(index))) {
			if (betweenPending) {
				betweenPending = false
				continue
			}

			parts.push(expression.slice(segmentStart, index).trim())
			const andMatch = expression.slice(index).match(/^\s+AND\s+/i)!
			index += andMatch[0].length - 1
			segmentStart = index + 1
		}
	}

	parts.push(expression.slice(segmentStart).trim())
	return parts.filter(Boolean)
}

function matchesRangeCondition(
	value: AttributeValue,
	condition: NonNullable<ParsedKeyCondition['rangeCondition']>
): boolean {
	const cmp = compareValues(value, condition.value)

	switch (condition.operator) {
		case '=':
			return cmp === 0
		case '<':
			return cmp < 0
		case '<=':
			return cmp <= 0
		case '>':
			return cmp > 0
		case '>=':
			return cmp >= 0
		case 'BETWEEN':
			if (!condition.value2) return false
			return cmp >= 0 && compareValues(value, condition.value2) <= 0
		case 'begins_with':
			if ('S' in value && 'S' in condition.value) {
				return value.S.startsWith(condition.value.S)
			}
			if ('B' in value && 'B' in condition.value) {
				return value.B.startsWith(condition.value.B)
			}
			return false
		default:
			return false
	}
}

function attributeEquals(a: AttributeValue, b: AttributeValue): boolean {
	if ('S' in a && 'S' in b) return a.S === b.S
	if ('N' in a && 'N' in b) return a.N === b.N
	if ('B' in a && 'B' in b) return a.B === b.B
	return JSON.stringify(a) === JSON.stringify(b)
}

function compareValues(a: AttributeValue, b: AttributeValue): number {
	if ('S' in a && 'S' in b) {
		return a.S.localeCompare(b.S)
	}
	if ('N' in a && 'N' in b) {
		return cmp(parse(a.N), parse(b.N))
	}
	if ('B' in a && 'B' in b) {
		return a.B.localeCompare(b.B)
	}
	return 0
}
