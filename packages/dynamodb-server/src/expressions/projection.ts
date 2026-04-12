import type { AttributeMap } from '../types.js'
import { getValueAtPath, parsePath, setValueAtPath } from './path.js'

export function applyProjection(
	item: AttributeMap,
	projectionExpression: string | undefined,
	expressionAttributeNames?: Record<string, string>
): AttributeMap {
	if (!projectionExpression || projectionExpression.trim() === '') {
		return item
	}

	const paths = projectionExpression.split(',').map(p => p.trim())
	const result: AttributeMap = {}

	for (const path of paths) {
		const segments = parsePath(path, expressionAttributeNames)
		const value = getValueAtPath(item, segments)

		if (value !== undefined) {
			setValueAtPath(result, segments, value)
		}
	}

	return result
}

export function applyIndexProjection(
	item: AttributeMap,
	projection: { ProjectionType?: string; NonKeyAttributes?: string[] },
	indexKeyAttributes: string[],
	tableKeyAttributes: string[]
): AttributeMap {
	const projectionType = projection.ProjectionType || 'ALL'

	if (projectionType === 'ALL') {
		return item
	}

	const result: AttributeMap = {}

	const keyAttrs = new Set([...indexKeyAttributes, ...tableKeyAttributes])
	for (const attr of keyAttrs) {
		if (item[attr]) {
			result[attr] = item[attr]
		}
	}

	if (projectionType === 'KEYS_ONLY') {
		return result
	}

	if (projectionType === 'INCLUDE' && projection.NonKeyAttributes) {
		for (const attr of projection.NonKeyAttributes) {
			if (item[attr]) {
				result[attr] = item[attr]
			}
		}
	}

	return result
}
