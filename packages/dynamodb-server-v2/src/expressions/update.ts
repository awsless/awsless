import { ValidationException } from '../errors/index.js'
import type { AttributeMap, AttributeValue } from '../types.js'
import { deleteValueAtPath, getValueAtPath, parsePath, setValueAtPath } from './path.js'

export interface UpdateContext {
	expressionAttributeNames?: Record<string, string>
	expressionAttributeValues?: Record<string, AttributeValue>
}

interface SetAction {
	type: 'SET'
	path: string
	value: string
	operation?: 'plus' | 'minus' | 'if_not_exists' | 'list_append'
	operands?: string[]
}

interface RemoveAction {
	type: 'REMOVE'
	path: string
}

interface AddAction {
	type: 'ADD'
	path: string
	value: string
}

interface DeleteAction {
	type: 'DELETE'
	path: string
	value: string
}

type UpdateAction = SetAction | RemoveAction | AddAction | DeleteAction

function parseUpdateExpression(expression: string): UpdateAction[] {
	const actions: UpdateAction[] = []
	let remaining = expression.trim()

	while (remaining.length > 0) {
		const setMatch = remaining.match(/^SET\s+/i)
		const removeMatch = remaining.match(/^REMOVE\s+/i)
		const addMatch = remaining.match(/^ADD\s+/i)
		const deleteMatch = remaining.match(/^DELETE\s+/i)

		if (setMatch) {
			remaining = remaining.slice(setMatch[0].length)
			const { items, rest } = parseActionList(remaining)

			for (const item of items) {
				const eqIdx = item.indexOf('=')
				if (eqIdx === -1) {
					throw new ValidationException(`Invalid SET action: ${item}`)
				}
				const path = item.slice(0, eqIdx).trim()
				const valueExpr = item.slice(eqIdx + 1).trim()

				const ifNotExistsMatch = valueExpr.match(/^if_not_exists\s*\(\s*([^,]+)\s*,\s*(.+)\s*\)$/i)
				if (ifNotExistsMatch) {
					actions.push({
						type: 'SET',
						path,
						value: valueExpr,
						operation: 'if_not_exists',
						operands: [ifNotExistsMatch[1]!.trim(), ifNotExistsMatch[2]!.trim()],
					})
					continue
				}

				const listAppendMatch = valueExpr.match(/^list_append\s*\(\s*([^,]+)\s*,\s*(.+)\s*\)$/i)
				if (listAppendMatch) {
					actions.push({
						type: 'SET',
						path,
						value: valueExpr,
						operation: 'list_append',
						operands: [listAppendMatch[1]!.trim(), listAppendMatch[2]!.trim()],
					})
					continue
				}

				const plusMatch = valueExpr.match(/^(.+?)\s*\+\s*(.+)$/)
				if (plusMatch) {
					actions.push({
						type: 'SET',
						path,
						value: valueExpr,
						operation: 'plus',
						operands: [plusMatch[1]!.trim(), plusMatch[2]!.trim()],
					})
					continue
				}

				const minusMatch = valueExpr.match(/^(.+?)\s*-\s*(.+)$/)
				if (minusMatch) {
					actions.push({
						type: 'SET',
						path,
						value: valueExpr,
						operation: 'minus',
						operands: [minusMatch[1]!.trim(), minusMatch[2]!.trim()],
					})
					continue
				}

				actions.push({ type: 'SET', path, value: valueExpr })
			}

			remaining = rest
		} else if (removeMatch) {
			remaining = remaining.slice(removeMatch[0].length)
			const { items, rest } = parseActionList(remaining)

			for (const item of items) {
				actions.push({ type: 'REMOVE', path: item.trim() })
			}

			remaining = rest
		} else if (addMatch) {
			remaining = remaining.slice(addMatch[0].length)
			const { items, rest } = parseActionList(remaining)

			for (const item of items) {
				const parts = item.trim().split(/\s+/)
				if (parts.length < 2) {
					throw new ValidationException(`Invalid ADD action: ${item}`)
				}
				actions.push({ type: 'ADD', path: parts[0]!, value: parts.slice(1).join(' ') })
			}

			remaining = rest
		} else if (deleteMatch) {
			remaining = remaining.slice(deleteMatch[0].length)
			const { items, rest } = parseActionList(remaining)

			for (const item of items) {
				const parts = item.trim().split(/\s+/)
				if (parts.length < 2) {
					throw new ValidationException(`Invalid DELETE action: ${item}`)
				}
				actions.push({ type: 'DELETE', path: parts[0]!, value: parts.slice(1).join(' ') })
			}

			remaining = rest
		} else {
			remaining = remaining.slice(1)
		}
	}

	return actions
}

function parseActionList(expression: string): { items: string[]; rest: string } {
	const items: string[] = []
	let current = ''
	let depth = 0
	let i = 0

	const stopKeywords = ['SET', 'REMOVE', 'ADD', 'DELETE']

	while (i < expression.length) {
		const char = expression[i]!

		for (const keyword of stopKeywords) {
			if (
				expression
					.slice(i)
					.toUpperCase()
					.startsWith(keyword + ' ') &&
				depth === 0 &&
				current.trim()
			) {
				items.push(current.trim())
				return { items, rest: expression.slice(i) }
			}
		}

		if (char === '(') {
			depth++
			current += char
		} else if (char === ')') {
			depth--
			current += char
		} else if (char === ',' && depth === 0) {
			if (current.trim()) {
				items.push(current.trim())
			}
			current = ''
		} else {
			current += char
		}

		i++
	}

	if (current.trim()) {
		items.push(current.trim())
	}

	return { items, rest: '' }
}

export function applyUpdateExpression(
	item: AttributeMap,
	expression: string | undefined,
	context: UpdateContext
): AttributeMap {
	if (!expression || expression.trim() === '') {
		return item
	}

	const result = JSON.parse(JSON.stringify(item)) as AttributeMap
	const actions = parseUpdateExpression(expression)

	// Separate REMOVE actions from others since they need special handling for list indices
	const removeActions: RemoveAction[] = []
	const otherActions: UpdateAction[] = []

	for (const action of actions) {
		if (action.type === 'REMOVE') {
			removeActions.push(action)
		} else {
			otherActions.push(action)
		}
	}

	// Apply non-REMOVE actions first
	for (const action of otherActions) {
		switch (action.type) {
			case 'SET':
				applySetAction(result, action, context)
				break
			case 'ADD':
				applyAddAction(result, action, context)
				break
			case 'DELETE':
				applyDeleteAction(result, action, context)
				break
		}
	}

	// Sort REMOVE actions by list index in descending order to avoid index shifting issues
	// When removing list[2] and list[1], we should remove list[2] first
	removeActions.sort((a, b) => {
		const aSegments = parsePath(a.path, context.expressionAttributeNames)
		const bSegments = parsePath(b.path, context.expressionAttributeNames)

		// Find the last index segment in each path
		let aLastIdx: number | undefined
		let bLastIdx: number | undefined

		for (const seg of aSegments) {
			if (seg.type === 'index') {
				aLastIdx = seg.value as number
			}
		}
		for (const seg of bSegments) {
			if (seg.type === 'index') {
				bLastIdx = seg.value as number
			}
		}

		if (aLastIdx !== undefined && bLastIdx !== undefined) {
			// Both have indices - sort by descending index
			return bLastIdx - aLastIdx
		}

		return 0
	})

	// Apply REMOVE actions
	for (const action of removeActions) {
		applyRemoveAction(result, action, context)
	}

	return result
}

function resolveOperand(item: AttributeMap, operand: string, context: UpdateContext): AttributeValue | undefined {
	operand = operand.trim()

	if (operand.startsWith(':')) {
		return context.expressionAttributeValues?.[operand]
	}

	const ifNotExistsMatch = operand.match(/^if_not_exists\s*\(\s*([^,]+)\s*,\s*(.+)\s*\)$/i)
	if (ifNotExistsMatch) {
		const existing = resolveOperand(item, ifNotExistsMatch[1]!.trim(), context)
		return existing !== undefined ? existing : resolveOperand(item, ifNotExistsMatch[2]!.trim(), context)
	}

	const listAppendMatch = operand.match(/^list_append\s*\(\s*([^,]+)\s*,\s*(.+)\s*\)$/i)
	if (listAppendMatch) {
		const list1 = resolveOperand(item, listAppendMatch[1]!.trim(), context)
		const list2 = resolveOperand(item, listAppendMatch[2]!.trim(), context)
		if (list1 && 'L' in list1 && list2 && 'L' in list2) {
			return { L: [...list1.L, ...list2.L] }
		}
		return list1 && 'L' in list1 ? list1 : list2
	}

	const segments = parsePath(operand, context.expressionAttributeNames)
	return getValueAtPath(item, segments)
}

function applySetAction(item: AttributeMap, action: SetAction, context: UpdateContext): void {
	const segments = parsePath(action.path, context.expressionAttributeNames)
	let value: AttributeValue | undefined

	if (action.operation === 'if_not_exists') {
		const existingValue = resolveOperand(item, action.operands![0]!, context)
		if (existingValue !== undefined) {
			value = existingValue
		} else {
			value = resolveOperand(item, action.operands![1]!, context)
		}
	} else if (action.operation === 'list_append') {
		const list1 = resolveOperand(item, action.operands![0]!, context)
		const list2 = resolveOperand(item, action.operands![1]!, context)

		if (list1 && 'L' in list1 && list2 && 'L' in list2) {
			value = { L: [...list1.L, ...list2.L] }
		} else if (list1 && 'L' in list1) {
			value = list1
		} else if (list2 && 'L' in list2) {
			value = list2
		}
	} else if (action.operation === 'plus') {
		const left = resolveOperand(item, action.operands![0]!, context)
		const right = resolveOperand(item, action.operands![1]!, context)

		if (left && 'N' in left && right && 'N' in right) {
			const result = parseFloat(left.N) + parseFloat(right.N)
			value = { N: String(result) }
		}
	} else if (action.operation === 'minus') {
		const left = resolveOperand(item, action.operands![0]!, context)
		const right = resolveOperand(item, action.operands![1]!, context)

		if (left && 'N' in left && right && 'N' in right) {
			const result = parseFloat(left.N) - parseFloat(right.N)
			value = { N: String(result) }
		}
	} else {
		value = resolveOperand(item, action.value, context)
	}

	if (value !== undefined) {
		setValueAtPath(item, segments, value)
	}
}

function applyRemoveAction(item: AttributeMap, action: RemoveAction, context: UpdateContext): void {
	const segments = parsePath(action.path, context.expressionAttributeNames)
	deleteValueAtPath(item, segments)
}

function applyAddAction(item: AttributeMap, action: AddAction, context: UpdateContext): void {
	const segments = parsePath(action.path, context.expressionAttributeNames)
	const addValue = resolveOperand(item, action.value, context)
	const existingValue = getValueAtPath(item, segments)

	if (!addValue) {
		return
	}

	if ('N' in addValue) {
		if (existingValue && 'N' in existingValue) {
			const result = parseFloat(existingValue.N) + parseFloat(addValue.N)
			setValueAtPath(item, segments, { N: String(result) })
		} else if (!existingValue) {
			setValueAtPath(item, segments, addValue)
		}
	} else if ('SS' in addValue) {
		if (existingValue && 'SS' in existingValue) {
			const combined = new Set([...existingValue.SS, ...addValue.SS])
			setValueAtPath(item, segments, { SS: Array.from(combined) })
		} else if (!existingValue) {
			setValueAtPath(item, segments, addValue)
		}
	} else if ('NS' in addValue) {
		if (existingValue && 'NS' in existingValue) {
			const combined = new Set([...existingValue.NS, ...addValue.NS])
			setValueAtPath(item, segments, { NS: Array.from(combined) })
		} else if (!existingValue) {
			setValueAtPath(item, segments, addValue)
		}
	} else if ('BS' in addValue) {
		if (existingValue && 'BS' in existingValue) {
			const combined = new Set([...existingValue.BS, ...addValue.BS])
			setValueAtPath(item, segments, { BS: Array.from(combined) })
		} else if (!existingValue) {
			setValueAtPath(item, segments, addValue)
		}
	}
}

function applyDeleteAction(item: AttributeMap, action: DeleteAction, context: UpdateContext): void {
	const segments = parsePath(action.path, context.expressionAttributeNames)
	const deleteValue = resolveOperand(item, action.value, context)
	const existingValue = getValueAtPath(item, segments)

	if (!deleteValue || !existingValue) {
		return
	}

	if ('SS' in deleteValue && 'SS' in existingValue) {
		const toDelete = new Set(deleteValue.SS)
		const remaining = existingValue.SS.filter(s => !toDelete.has(s))
		if (remaining.length > 0) {
			setValueAtPath(item, segments, { SS: remaining })
		} else {
			deleteValueAtPath(item, segments)
		}
	} else if ('NS' in deleteValue && 'NS' in existingValue) {
		const toDelete = new Set(deleteValue.NS)
		const remaining = existingValue.NS.filter(n => !toDelete.has(n))
		if (remaining.length > 0) {
			setValueAtPath(item, segments, { NS: remaining })
		} else {
			deleteValueAtPath(item, segments)
		}
	} else if ('BS' in deleteValue && 'BS' in existingValue) {
		const toDelete = new Set(deleteValue.BS)
		const remaining = existingValue.BS.filter(b => !toDelete.has(b))
		if (remaining.length > 0) {
			setValueAtPath(item, segments, { BS: remaining })
		} else {
			deleteValueAtPath(item, segments)
		}
	}
}
