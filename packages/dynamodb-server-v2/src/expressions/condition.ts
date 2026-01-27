import { cmp, parse } from '@awsless/big-float'
import { ValidationException } from '../errors/index.js'
import type { AttributeMap, AttributeValue } from '../types.js'
import { getValueAtPath, parsePath } from './path.js'

export interface ConditionContext {
	expressionAttributeNames?: Record<string, string>
	expressionAttributeValues?: Record<string, AttributeValue>
}

type TokenType =
	| 'LPAREN'
	| 'RPAREN'
	| 'AND'
	| 'OR'
	| 'NOT'
	| 'BETWEEN'
	| 'IN'
	| 'COMMA'
	| 'COMPARATOR'
	| 'FUNCTION'
	| 'PATH'
	| 'VALUE'

interface Token {
	type: TokenType
	value: string
}

function tokenize(expression: string): Token[] {
	const tokens: Token[] = []
	let i = 0

	const keywords: Record<string, TokenType> = {
		AND: 'AND',
		OR: 'OR',
		NOT: 'NOT',
		BETWEEN: 'BETWEEN',
		IN: 'IN',
	}

	const functions = ['attribute_exists', 'attribute_not_exists', 'attribute_type', 'begins_with', 'contains', 'size']

	while (i < expression.length) {
		const char = expression[i]!

		if (/\s/.test(char)) {
			i++
			continue
		}

		if (char === '(') {
			tokens.push({ type: 'LPAREN', value: '(' })
			i++
			continue
		}

		if (char === ')') {
			tokens.push({ type: 'RPAREN', value: ')' })
			i++
			continue
		}

		if (char === ',') {
			tokens.push({ type: 'COMMA', value: ',' })
			i++
			continue
		}

		if (char === '=' || char === '<' || char === '>') {
			let op = char
			if (expression[i + 1] === '=') {
				op += '='
				i++
			} else if (char === '<' && expression[i + 1] === '>') {
				op = '<>'
				i++
			}
			tokens.push({ type: 'COMPARATOR', value: op })
			i++
			continue
		}

		if (char === ':') {
			let value = ':'
			i++
			while (i < expression.length && /[a-zA-Z0-9_]/.test(expression[i]!)) {
				value += expression[i]
				i++
			}
			tokens.push({ type: 'VALUE', value })
			continue
		}

		if (char === '#') {
			let value = '#'
			i++
			while (i < expression.length && /[a-zA-Z0-9_]/.test(expression[i]!)) {
				value += expression[i]
				i++
			}
			tokens.push({ type: 'PATH', value })
			continue
		}

		if (/[a-zA-Z_]/.test(char)) {
			let word = ''
			while (i < expression.length && /[a-zA-Z0-9_]/.test(expression[i]!)) {
				word += expression[i]
				i++
			}

			const upper = word.toUpperCase()
			if (keywords[upper]) {
				tokens.push({ type: keywords[upper]!, value: upper })
			} else if (functions.includes(word)) {
				tokens.push({ type: 'FUNCTION', value: word })
			} else {
				tokens.push({ type: 'PATH', value: word })
			}
			continue
		}

		if (char === '[') {
			let value = ''
			while (i < expression.length && expression[i] !== ']') {
				value += expression[i]
				i++
			}
			value += ']'
			i++
			if (tokens.length > 0 && tokens[tokens.length - 1]!.type === 'PATH') {
				tokens[tokens.length - 1]!.value += value
			}
			continue
		}

		if (char === '.') {
			if (tokens.length > 0 && tokens[tokens.length - 1]!.type === 'PATH') {
				i++
				let pathPart = '.'
				while (i < expression.length && /[a-zA-Z0-9_#\[\]]/.test(expression[i]!)) {
					pathPart += expression[i]
					i++
				}
				tokens[tokens.length - 1]!.value += pathPart
			} else {
				i++
			}
			continue
		}

		i++
	}

	return tokens
}

export function evaluateCondition(
	expression: string | undefined,
	item: AttributeMap,
	context: ConditionContext
): boolean {
	if (!expression || expression.trim() === '') {
		return true
	}

	const tokens = tokenize(expression)
	let pos = 0

	function current(): Token | undefined {
		return tokens[pos]
	}

	function consume(type?: TokenType): Token {
		const token = tokens[pos]
		if (!token) {
			throw new ValidationException('Unexpected end of expression')
		}
		if (type && token.type !== type) {
			throw new ValidationException(`Expected ${type} but got ${token.type}`)
		}
		pos++
		return token
	}

	function parseExpression(): boolean {
		return parseOr()
	}

	function parseOr(): boolean {
		let left = parseAnd()
		while (current()?.type === 'OR') {
			consume('OR')
			const right = parseAnd()
			left = left || right
		}
		return left
	}

	function parseAnd(): boolean {
		let left = parseNot()
		while (current()?.type === 'AND') {
			consume('AND')
			const right = parseNot()
			left = left && right
		}
		return left
	}

	function parseNot(): boolean {
		if (current()?.type === 'NOT') {
			consume('NOT')
			return !parseNot()
		}
		return parsePrimary()
	}

	function parsePrimary(): boolean {
		const token = current()

		if (!token) {
			return true
		}

		if (token.type === 'LPAREN') {
			consume('LPAREN')
			const result = parseExpression()
			consume('RPAREN')
			return result
		}

		if (token.type === 'FUNCTION') {
			return parseFunction()
		}

		if (token.type === 'PATH' || token.type === 'VALUE') {
			return parseComparison()
		}

		throw new ValidationException(`Unexpected token: ${token.type}`)
	}

	function parseFunction(): boolean {
		const funcToken = consume('FUNCTION')
		consume('LPAREN')

		const funcName = funcToken.value

		if (funcName === 'attribute_exists') {
			const pathToken = consume('PATH')
			consume('RPAREN')
			const segments = parsePath(pathToken.value, context.expressionAttributeNames)
			const value = getValueAtPath(item, segments)
			return value !== undefined
		}

		if (funcName === 'attribute_not_exists') {
			const pathToken = consume('PATH')
			consume('RPAREN')
			const segments = parsePath(pathToken.value, context.expressionAttributeNames)
			const value = getValueAtPath(item, segments)
			return value === undefined
		}

		if (funcName === 'attribute_type') {
			const pathToken = consume('PATH')
			consume('COMMA')
			const typeToken = consume('VALUE')
			consume('RPAREN')

			const segments = parsePath(pathToken.value, context.expressionAttributeNames)
			const value = getValueAtPath(item, segments)
			const expectedType = resolveValue(typeToken.value)

			if (!value || !expectedType || !('S' in expectedType)) {
				return false
			}

			const typeMap: Record<string, string> = {
				S: 'S',
				N: 'N',
				B: 'B',
				SS: 'SS',
				NS: 'NS',
				BS: 'BS',
				M: 'M',
				L: 'L',
				NULL: 'NULL',
				BOOL: 'BOOL',
			}

			const actualType = Object.keys(value)[0]
			return typeMap[expectedType.S] === actualType
		}

		if (funcName === 'begins_with') {
			const pathToken = consume('PATH')
			consume('COMMA')
			const prefixToken = consume('VALUE')
			consume('RPAREN')

			const segments = parsePath(pathToken.value, context.expressionAttributeNames)
			const value = getValueAtPath(item, segments)
			const prefix = resolveValue(prefixToken.value)

			if (!value || !prefix) {
				return false
			}

			if ('S' in value && 'S' in prefix) {
				return value.S.startsWith(prefix.S)
			}
			if ('B' in value && 'B' in prefix) {
				return value.B.startsWith(prefix.B)
			}

			return false
		}

		if (funcName === 'contains') {
			const pathToken = consume('PATH')
			consume('COMMA')
			const operandToken = consume('VALUE')
			consume('RPAREN')

			const segments = parsePath(pathToken.value, context.expressionAttributeNames)
			const value = getValueAtPath(item, segments)
			const operand = resolveValue(operandToken.value)

			if (!value || !operand) {
				return false
			}

			if ('S' in value && 'S' in operand) {
				return value.S.includes(operand.S)
			}
			if ('SS' in value && 'S' in operand) {
				return value.SS.includes(operand.S)
			}
			if ('NS' in value && 'N' in operand) {
				return value.NS.includes(operand.N)
			}
			if ('BS' in value && 'B' in operand) {
				return value.BS.includes(operand.B)
			}
			if ('L' in value) {
				return value.L.some(v => compareValues(v, operand) === 0)
			}

			return false
		}

		if (funcName === 'size') {
			const pathToken = consume('PATH')
			consume('RPAREN')

			const segments = parsePath(pathToken.value, context.expressionAttributeNames)
			const value = getValueAtPath(item, segments)

			if (!value) {
				return false
			}

			let size = 0
			if ('S' in value) size = value.S.length
			else if ('B' in value) size = value.B.length
			else if ('SS' in value) size = value.SS.length
			else if ('NS' in value) size = value.NS.length
			else if ('BS' in value) size = value.BS.length
			else if ('L' in value) size = value.L.length
			else if ('M' in value) size = Object.keys(value.M).length

			const nextToken = current()
			if (nextToken?.type === 'COMPARATOR') {
				consume('COMPARATOR')
				const rightToken = consume('VALUE')
				const rightValue = resolveValue(rightToken.value)
				if (!rightValue || !('N' in rightValue)) {
					throw new ValidationException('Size comparison requires numeric operand')
				}
				return compareNumbers(size, Number(rightValue.N), nextToken.value)
			}

			return size > 0
		}

		throw new ValidationException(`Unknown function: ${funcName}`)
	}

	function parseComparison(): boolean {
		const leftToken = consume()
		const leftValue = resolveOperand(leftToken)

		const nextToken = current()

		if (nextToken?.type === 'COMPARATOR') {
			const op = consume('COMPARATOR').value
			const rightToken = consume()
			const rightValue = resolveOperand(rightToken)
			return compare(leftValue, rightValue, op)
		}

		if (nextToken?.type === 'BETWEEN') {
			consume('BETWEEN')
			const lowToken = consume()
			const lowValue = resolveOperand(lowToken)
			consume('AND')
			const highToken = consume()
			const highValue = resolveOperand(highToken)

			if (!leftValue || !lowValue || !highValue) {
				return false
			}

			return compareValues(leftValue, lowValue) >= 0 && compareValues(leftValue, highValue) <= 0
		}

		if (nextToken?.type === 'IN') {
			consume('IN')
			consume('LPAREN')
			const values: (AttributeValue | undefined)[] = []
			values.push(resolveOperand(consume()))
			while (current()?.type === 'COMMA') {
				consume('COMMA')
				values.push(resolveOperand(consume()))
			}
			consume('RPAREN')

			if (!leftValue) {
				return false
			}

			return values.some(v => v && compareValues(leftValue, v) === 0)
		}

		return leftValue !== undefined
	}

	function resolveOperand(token: Token): AttributeValue | undefined {
		if (token.type === 'VALUE') {
			return resolveValue(token.value)
		}
		if (token.type === 'PATH') {
			const segments = parsePath(token.value, context.expressionAttributeNames)
			return getValueAtPath(item, segments)
		}
		return undefined
	}

	function resolveValue(ref: string): AttributeValue | undefined {
		if (ref.startsWith(':') && context.expressionAttributeValues) {
			return context.expressionAttributeValues[ref]
		}
		return undefined
	}

	function compare(left: AttributeValue | undefined, right: AttributeValue | undefined, op: string): boolean {
		if (!left || !right) {
			if (op === '<>') {
				return left !== right
			}
			return false
		}

		const cmp = compareValues(left, right)

		switch (op) {
			case '=':
				return cmp === 0
			case '<>':
				return cmp !== 0
			case '<':
				return cmp < 0
			case '<=':
				return cmp <= 0
			case '>':
				return cmp > 0
			case '>=':
				return cmp >= 0
			default:
				return false
		}
	}

	function compareNumbers(left: number, right: number, op: string): boolean {
		switch (op) {
			case '=':
				return left === right
			case '<>':
				return left !== right
			case '<':
				return left < right
			case '<=':
				return left <= right
			case '>':
				return left > right
			case '>=':
				return left >= right
			default:
				return false
		}
	}

	return parseExpression()
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
	if ('BOOL' in a && 'BOOL' in b) {
		return Number(a.BOOL) - Number(b.BOOL)
	}
	if ('NULL' in a && 'NULL' in b) {
		return 0
	}

	const aStr = JSON.stringify(a)
	const bStr = JSON.stringify(b)
	return aStr.localeCompare(bStr)
}
