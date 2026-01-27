import { cmp, parse } from '@awsless/big-float'
import { ValidationException } from '../errors/index.js'
import { getHashKey, getRangeKey } from '../store/item.js'
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
}

export function parseKeyCondition(
	expression: string,
	keySchema: KeySchemaElement[],
	context: KeyConditionContext
): ParsedKeyCondition {
	const hashKeyName = getHashKey(keySchema)
	const rangeKeyName = getRangeKey(keySchema)

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

	// Strip balanced outer parentheses from the entire expression
	function stripOuterParens(expr: string): string {
		let s = expr.trim()
		while (s.startsWith('(') && s.endsWith(')')) {
			// Check if the parens are balanced (the opening paren matches the closing one)
			let depth = 0
			let balanced = true
			for (let i = 0; i < s.length - 1; i++) {
				if (s[i] === '(') depth++
				else if (s[i] === ')') depth--
				if (depth === 0) {
					// Found a closing paren before the end, so outer parens don't match
					balanced = false
					break
				}
			}
			if (balanced) {
				s = s.slice(1, -1).trim()
			} else {
				break
			}
		}
		return s
	}

	const normalizedExpression = stripOuterParens(expression)
	const parts = normalizedExpression.split(/\s+AND\s+/i)

	let hashValue: AttributeValue | undefined
	let rangeCondition: ParsedKeyCondition['rangeCondition']

	for (const part of parts) {
		const trimmed = stripOuterParens(part)

		const beginsWithMatch = trimmed.match(/^begins_with\s*\(\s*([#\w]+)\s*,\s*(:\w+)\s*\)$/i)
		if (beginsWithMatch) {
			const attrName = resolveName(beginsWithMatch[1]!)
			const value = resolveValue(beginsWithMatch[2]!)

			if (attrName === rangeKeyName) {
				rangeCondition = { operator: 'begins_with', value }
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

			if (attrName === rangeKeyName) {
				rangeCondition = { operator: 'BETWEEN', value: value1, value2 }
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

			if (attrName === hashKeyName) {
				if (operator !== '=') {
					throw new ValidationException(`Hash key condition must use = operator`)
				}
				hashValue = value
			} else if (attrName === rangeKeyName) {
				rangeCondition = { operator, value }
			} else {
				throw new ValidationException(`Key condition references unknown attribute: ${attrName}`)
			}
			continue
		}

		throw new ValidationException(`Invalid key condition expression: ${trimmed}`)
	}

	if (!hashValue) {
		throw new ValidationException(`Key condition must specify hash key equality`)
	}

	return {
		hashKey: hashKeyName,
		hashValue,
		rangeKey: rangeKeyName,
		rangeCondition,
	}
}

export function matchesKeyCondition(item: AttributeMap, condition: ParsedKeyCondition): boolean {
	const itemHashValue = item[condition.hashKey]
	if (!itemHashValue || !attributeEquals(itemHashValue, condition.hashValue)) {
		return false
	}

	if (condition.rangeCondition && condition.rangeKey) {
		const itemRangeValue = item[condition.rangeKey]
		if (!itemRangeValue) {
			return false
		}

		return matchesRangeCondition(itemRangeValue, condition.rangeCondition)
	}

	return true
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
