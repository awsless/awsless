export type JsonSchema = {
	$schema?: string
	title?: string
	description?: string
	markdownDescription?: string
	type?: string | string[]
	enum?: unknown[]
	const?: unknown
	default?: unknown
	required?: string[]
	properties?: Record<string, JsonSchema>
	additionalProperties?: boolean | JsonSchema
	patternProperties?: Record<string, JsonSchema>
	propertyNames?: JsonSchema
	items?: JsonSchema | JsonSchema[]
	prefixItems?: JsonSchema[]
	anyOf?: JsonSchema[]
	oneOf?: JsonSchema[]
	allOf?: JsonSchema[]
	definitions?: Record<string, JsonSchema>
	[key: string]: unknown
}

type PointerEntry = {
	path: string
	pattern?: string
	schema: JsonSchema
	addOnly?: boolean
}

const clone = <Value>(value: Value): Value => {
	return JSON.parse(JSON.stringify(value))
}

const escapePointerSegment = (value: string) => {
	return value.replaceAll('~', '~0').replaceAll('/', '~1')
}

const escapeRegexSegment = (value: string) => {
	return value.replace(/[|\\{}()[\]^$+*?.-]/g, '\\$&')
}

const makeExactPath = (prefix: string, segment: string) => {
	return `${prefix}/${escapePointerSegment(segment)}`
}

const makeExactPattern = (path: string) => {
	return `^${path.split('/').map(escapeRegexSegment).join('/')}$`
}

const makePatternPath = (prefix: string, segmentPattern: string) => {
	return prefix ? `${prefix}/${segmentPattern}` : `/${segmentPattern}`
}

const appendExactPattern = (pattern: string, segment: string) => {
	const base = pattern.slice(1, -1)
	return `^${base}/${escapeRegexSegment(segment)}$`
}

const appendRegexPattern = (pattern: string, segmentPattern: string) => {
	const base = pattern.slice(1, -1)
	return `^${base}/${segmentPattern}$`
}

const mergeSchemas = (schemas: JsonSchema[]) => {
	const list = schemas.map(schema => clone(schema))
	if (list.length === 1) {
		return list[0]!
	}

	return {
		anyOf: list,
	} satisfies JsonSchema
}

const dereference = (schema: JsonSchema, root: JsonSchema): JsonSchema => {
	if (typeof schema.$ref !== 'string' || !schema.$ref.startsWith('#/')) {
		return schema
	}

	const target = schema.$ref
		.slice(2)
		.split('/')
		.map(segment => segment.replaceAll('~1', '/').replaceAll('~0', '~'))
		.reduce<unknown>((value, segment) => {
			if (typeof value === 'object' && value !== null) {
				return (value as Record<string, unknown>)[segment]
			}

			return undefined
		}, root)

	if (!target || typeof target !== 'object') {
		return schema
	}

	const { $ref: _, ...rest } = schema
	return {
		...clone(target as JsonSchema),
		...rest,
	}
}

const listBranches = (schema: JsonSchema) => {
	const groups = [schema.anyOf, schema.oneOf, schema.allOf].filter(Boolean)
	if (groups.length === 0) {
		return [schema]
	}

	return groups.flatMap(group => group!)
}

const childSegmentPattern = (schema: JsonSchema) => {
	const propertyNameSchema = schema.propertyNames
	if (propertyNameSchema && typeof propertyNameSchema.pattern === 'string') {
		return propertyNameSchema.pattern
	}

	const firstPattern = Object.keys(schema.patternProperties ?? {})[0]
	if (firstPattern) {
		return firstPattern
	}

	return '[^/]+'
}

const joinEntries = (entries: PointerEntry[]) => {
	const map = new Map<string, PointerEntry>()

	for (const entry of entries) {
		const key = [entry.path, entry.pattern ?? '', entry.addOnly ? '1' : '0'].join('|')
		const previous = map.get(key)

		if (!previous) {
			map.set(key, {
				...entry,
				schema: clone(entry.schema),
			})
			continue
		}

		previous.schema = mergeSchemas([previous.schema, entry.schema])
	}

	return [...map.values()]
}

const collectEntries = (
	schema: JsonSchema,
	pointer = '',
	pattern = makeExactPattern(pointer),
	root: JsonSchema = schema
): PointerEntry[] => {
	const resolved = dereference(schema, root)
	const entries: PointerEntry[] = [
		{
			path: pointer,
			pattern,
			schema: clone(resolved),
		},
	]

	for (const branch of listBranches(resolved)) {
		const branchType = Array.isArray(branch.type) ? branch.type : branch.type ? [branch.type] : []
		const isObject =
			branchType.includes('object') ||
			branch.properties !== undefined ||
			branch.additionalProperties !== undefined ||
			branch.patternProperties !== undefined
		const isArray =
			branchType.includes('array') ||
			branch.items !== undefined ||
			branch.prefixItems !== undefined

		if (isObject) {
			for (const [property, propertySchema] of Object.entries(branch.properties ?? {})) {
				const path = makeExactPath(pointer, property)
				entries.push(...collectEntries(propertySchema, path, appendExactPattern(pattern, property), root))
			}

			for (const [propertyPattern, propertySchema] of Object.entries(branch.patternProperties ?? {})) {
				const path = makePatternPath(pointer, propertyPattern)
				entries.push(...collectEntries(propertySchema, path, appendRegexPattern(pattern, propertyPattern), root))
			}

			if (branch.additionalProperties && typeof branch.additionalProperties === 'object') {
				const segmentPattern = childSegmentPattern(branch)
				const path = makePatternPath(pointer, segmentPattern)
				entries.push(...collectEntries(branch.additionalProperties, path, appendRegexPattern(pattern, segmentPattern), root))
			}
		}

		if (isArray) {
			if (Array.isArray(branch.items)) {
				branch.items.forEach((itemSchema, index) => {
					entries.push(...collectEntries(itemSchema, `${pointer}/${index}`, appendExactPattern(pattern, `${index}`), root))
				})
			} else if (branch.items && typeof branch.items === 'object') {
				entries.push(...collectEntries(branch.items, `${pointer}/\\d+`, appendRegexPattern(pattern, '\\d+'), root))
				entries.push({
					path: `${pointer}/-`,
					pattern: makeExactPattern(`${pointer}/-`),
					schema: clone(branch.items),
					addOnly: true,
				})
			}

			for (const [index, itemSchema] of (branch.prefixItems ?? []).entries()) {
				entries.push(...collectEntries(itemSchema, `${pointer}/${index}`, appendExactPattern(pattern, `${index}`), root))
			}
		}
	}

	return joinEntries(entries)
}

const pathMatcherSchema = (entry: PointerEntry) => {
	if (entry.pattern && entry.pattern !== makeExactPattern(entry.path)) {
		return {
			type: 'string',
			pattern: entry.pattern,
		} satisfies JsonSchema
	}

	return {
		type: 'string',
		const: entry.path,
	} satisfies JsonSchema
}

const objectSchema = (properties: Record<string, JsonSchema>, required: string[]): JsonSchema => {
	return {
		type: 'object',
		properties,
		required,
		additionalProperties: false,
	}
}

const conditionalValueSchema = (entry: PointerEntry): JsonSchema => {
	return {
		if: {
			type: 'object',
			properties: {
				path: pathMatcherSchema(entry),
			},
			required: ['path'],
		},
		then: {
			properties: {
				value: clone(entry.schema),
			},
		},
	}
}

const matchersSchema = (entries: PointerEntry[]) => {
	return {
		oneOf: entries.map(pathMatcherSchema),
	} satisfies JsonSchema
}

const patchOperationSchema = (op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test', entries: PointerEntry[]) => {
	const props: Record<string, JsonSchema> = {
		op: {
			type: 'string',
			const: op,
		},
		path: matchersSchema(entries),
	}
	const required = ['op', 'path']
	const schema: JsonSchema = objectSchema(props, required)

	switch (op) {
		case 'add':
		case 'replace':
		case 'test':
			schema.properties = {
				...schema.properties,
				value: {},
			}
			schema.required = [...required, 'value']
			schema.allOf = entries.map(conditionalValueSchema)
			return schema
		case 'move':
		case 'copy':
			schema.properties = {
				...schema.properties,
				from: matchersSchema(entries),
			}
			schema.required = ['op', 'from', 'path']
			return schema
		default:
			return schema
	}
}

const normalizeEntry = (entry: PointerEntry): PointerEntry => {
	return {
		...entry,
		pattern: entry.pattern ?? makeExactPattern(entry.path),
	}
}

const isSchemaMetadataPath = (entry: PointerEntry) => {
	return entry.path === '/$schema' || entry.path.startsWith('/$schema/')
}

export const createStagePatchJsonSchema = (baseSchema: JsonSchema, title: string) => {
	const entries = collectEntries(baseSchema).map(normalizeEntry).filter(entry => !isSchemaMetadataPath(entry))
	const standardEntries = entries.filter(entry => !entry.addOnly)
	const addEntries = entries
	const moveCopyEntries = standardEntries.filter(entry => entry.path !== '')

	return {
		$schema: 'http://json-schema.org/draft-07/schema#',
		title,
		type: 'object',
		additionalProperties: false,
		properties: {
			$schema: {
				type: 'string',
			},
			operations: {
				type: 'array',
				items: {
					oneOf: [
						patchOperationSchema('add', addEntries),
						patchOperationSchema('remove', standardEntries),
						patchOperationSchema('replace', standardEntries),
						patchOperationSchema('move', moveCopyEntries),
						patchOperationSchema('copy', moveCopyEntries),
						patchOperationSchema('test', standardEntries),
					],
				},
			},
		},
		required: ['operations'],
	} satisfies JsonSchema
}
