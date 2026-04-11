import type { AttributeMap, AttributeValue } from '../types.js'

export interface PathSegment {
	type: 'attribute' | 'index'
	value: string | number
}

export function parsePath(path: string, attributeNames?: Record<string, string>): PathSegment[] {
	const segments: PathSegment[] = []
	let current = ''
	let i = 0

	while (i < path.length) {
		const char = path[i]

		if (char === '.') {
			if (current) {
				segments.push({ type: 'attribute', value: resolveAttributeName(current, attributeNames) })
				current = ''
			}
			i++
		} else if (char === '[') {
			if (current) {
				segments.push({ type: 'attribute', value: resolveAttributeName(current, attributeNames) })
				current = ''
			}
			i++
			let indexStr = ''
			while (i < path.length && path[i] !== ']') {
				indexStr += path[i]
				i++
			}
			i++
			segments.push({ type: 'index', value: parseInt(indexStr, 10) })
		} else {
			current += char
			i++
		}
	}

	if (current) {
		segments.push({ type: 'attribute', value: resolveAttributeName(current, attributeNames) })
	}

	return segments
}

function resolveAttributeName(name: string, attributeNames?: Record<string, string>): string {
	if (name.startsWith('#') && attributeNames) {
		const resolved = attributeNames[name]
		if (resolved !== undefined) {
			return resolved
		}
	}
	return name
}

export function getValueAtPath(item: AttributeMap, segments: PathSegment[]): AttributeValue | undefined {
	let current: AttributeValue | undefined = { M: item }

	for (const segment of segments) {
		if (current === undefined) {
			return undefined
		}

		if (segment.type === 'attribute') {
			if ('M' in current) {
				const map = current.M as AttributeMap
				current = map[segment.value as string]
			} else {
				return undefined
			}
		} else if (segment.type === 'index') {
			if ('L' in current) {
				const list = current.L as AttributeValue[]
				current = list[segment.value as number]
			} else {
				return undefined
			}
		}
	}

	return current
}

export function setValueAtPath(item: AttributeMap, segments: PathSegment[], value: AttributeValue): void {
	if (segments.length === 0) {
		return
	}

	let current: AttributeValue = { M: item }

	for (let i = 0; i < segments.length - 1; i++) {
		const segment = segments[i]!
		const nextSegment = segments[i + 1]!

		if (segment.type === 'attribute') {
			if (!('M' in current)) {
				return
			}
			const map = current.M as AttributeMap
			const attrName = segment.value as string
			if (!map[attrName]) {
				if (nextSegment.type === 'attribute') {
					map[attrName] = { M: {} }
				} else {
					map[attrName] = { L: [] }
				}
			}
			current = map[attrName]!
		} else if (segment.type === 'index') {
			if (!('L' in current)) {
				return
			}
			const list = current.L as AttributeValue[]
			const idx = segment.value as number
			if (!list[idx]) {
				if (nextSegment.type === 'attribute') {
					list[idx] = { M: {} }
				} else {
					list[idx] = { L: [] }
				}
			}
			current = list[idx]!
		}
	}

	const lastSegment = segments[segments.length - 1]!

	if (lastSegment.type === 'attribute') {
		if ('M' in current) {
			const map = current.M as AttributeMap
			map[lastSegment.value as string] = value
		}
	} else if (lastSegment.type === 'index') {
		if ('L' in current) {
			const list = current.L as AttributeValue[]
			list[lastSegment.value as number] = value
		}
	}
}

export function deleteValueAtPath(item: AttributeMap, segments: PathSegment[]): boolean {
	if (segments.length === 0) {
		return false
	}

	let current: AttributeValue = { M: item }

	for (let i = 0; i < segments.length - 1; i++) {
		const segment = segments[i]!

		if (segment.type === 'attribute') {
			if (!('M' in current)) {
				return false
			}
			const map = current.M as AttributeMap
			if (!map[segment.value as string]) {
				return false
			}
			current = map[segment.value as string]!
		} else if (segment.type === 'index') {
			if (!('L' in current)) {
				return false
			}
			const list = current.L as AttributeValue[]
			if (list[segment.value as number] === undefined) {
				return false
			}
			current = list[segment.value as number]!
		}
	}

	const lastSegment = segments[segments.length - 1]!

	if (lastSegment.type === 'attribute') {
		if ('M' in current) {
			const map = current.M as AttributeMap
			delete map[lastSegment.value as string]
			return true
		}
	} else if (lastSegment.type === 'index') {
		if ('L' in current) {
			const list = current.L as AttributeValue[]
			list.splice(lastSegment.value as number, 1)
			return true
		}
	}

	return false
}
