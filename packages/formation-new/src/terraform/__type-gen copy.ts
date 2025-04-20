import { camelCase, pascalCase } from 'change-case'
import type { Property } from './plugin/schema.ts'

export const generateTypes = (
	providers: Record<string, Property>,
	resources: Record<string, Property>,
	dataSources: Record<string, Property>
) => {
	const code: string[] = [`import { Input, OptionalInput, Output, ResourceClass, DataSource } from './base.ts'`]

	code.push(declareGlobalInterface({ ...resources, ...dataSources }))

	code.push(
		generateInterfaces(
			dataSources,
			(propName, typeName) => `get${propName}: DataSource<${typeName}Props, ${typeName}>`
		)
	)
	code.push(
		generateInterfaces(
			resources,
			(propName, typeName, type) => `${propName}: ResourceClass<${typeName}Props, ${typeName}, "${type}">`
		)
	)

	for (const [type, props] of Object.entries(resources)) {
		const input = generateResourceInputTypes(type, props)
		const output = generateResourceOutputTypes(type, props)

		code.push(input)
		code.push(output)
	}

	for (const [type, props] of Object.entries(dataSources)) {
		const input = generateResourceInputTypes(type, props)
		const output = generateResourceOutputTypes(type, props)

		code.push(input)
		code.push(output)
	}

	code.push(generateProviderInterface(providers))

	return code.join('\n\n')
}

const declareGlobalInterface = (ns: Record<string, unknown>) => {
	const code: string[] = [`declare global {`, `\texport namespace $terraform {`]
	const unique = new Set<string>([])
	for (const type of Object.keys(ns)) {
		const parts = type.split('_')
		if (parts.length > 0) {
			unique.add(parts[0]!)
		}
	}

	for (const type of unique) {
		const typeName = pascalCase(type)
		code.push(`\t\t${type}: ${typeName}`)
	}

	code.push(`\t}`, `}`)
	return code.join('\n')
}

const generateProviderInterface = (providers: Record<string, Property>) => {
	const code: string[] = [`declare global {\n`, `\tinterface TerraformProviders {\n`]

	for (const [ns, props] of Object.entries(providers)) {
		code.push(`\t\t${ns}: `)
		code.push(
			generateValue(props, {
				depth: 0,
				indent: 3,
				wrap: v => v,
				filter: () => true,
				optional: p => p.optional ?? false,
			})
		)

		// code.push("}\n");
	}

	code.push('\t}\n')
	code.push('}\n')

	return code.join('')
}

const groupByNamespace = (resources: Record<string, Property>, minLevel: number, maxLevel: number) => {
	const grouped: NamespaceGroup = {}
	const types = Object.keys(resources).sort()

	for (const type of types) {
		const names = type.split('_')

		if (names.length < minLevel) {
			throw new Error(`Resource not properly namespaced: ${type}`)
		}

		let current = grouped
		let count = Math.min(maxLevel, names.length - 1)

		while (count--) {
			const ns = camelCase(names.shift()!)
			if (!current[ns]) {
				current[ns] = {}
			}
			current = current[ns] as {}
		}

		const name = pascalCase(names.join('_'))
		current[name] = type
	}

	return grouped
}

// const generateDataInterface = (dataSources: Record<string, Property>) => {
// 	const grouped = groupByNamespace(dataSources, 1, 2)

// 	const code: string[] = []

// 	const renderRoot = (name: string, group: NamespaceGroup, indent: number) => {
// 		code.push(`interface ${pascalCase(name)} {\n`)
// 		for (const [ns, entry] of Object.entries(group)) {
// 			if (typeof entry === 'string') {
// 				renderResource(ns, entry, indent + 1)
// 			} else {
// 				renderNamespace(ns, entry, indent + 1)
// 			}
// 		}
// 		code.push(`}\n`)
// 	}

// 	const renderNamespace = (name: string, group: NamespaceGroup, indent: number) => {
// 		const tabs = `\t`.repeat(indent)
// 		code.push(`${tabs}${name}: {\n`)
// 		for (const [ns, entry] of Object.entries(group)) {
// 			if (typeof entry === 'string') {
// 				renderResource(ns, entry, indent + 1)
// 			} else {
// 				renderNamespace(ns, entry, indent + 1)
// 			}
// 		}
// 		code.push(`${tabs}}\n`)
// 	}

// 	const renderResource = (name: string, type: string, indent: number) => {
// 		const tabs = `\t`.repeat(indent)
// 		const propName = pascalCase(name)
// 		const className = pascalCase(type)
// 		code.push(
// 			`${tabs}get${propName}: DataSource<${className}Props, ${className}>\n`
// 			// `${tabs}get${propName}: string\n`
// 		)
// 	}

// 	for (const [ns, entry] of Object.entries(grouped)) {
// 		renderRoot(ns, entry as {}, 0)
// 	}

// 	// code.push('\t}\n')
// 	// code.push('}\n')

// 	return code.join('')
// }

type NamespaceGroup = {
	[key: string]: string | NamespaceGroup
}

const generateInterfaces = (
	resources: Record<string, Property>,
	render: (attrName: string, typeName: string, type: string) => string
) => {
	const grouped = groupByNamespace(resources, 1, 2)

	const renderInterface = (parents: string[], name: string, group: NamespaceGroup) => {
		const typeName = pascalCase([...parents, name].join('-'))
		code.push(`interface ${typeName} {\n`)
		for (const [ns, entry] of Object.entries(group)) {
			if (typeof entry === 'string') {
				renderResource(ns, entry)
			} else {
				renderNamespace([...parents, name], ns)
			}
		}
		code.push(`}\n\n`)

		for (const [ns, entry] of Object.entries(group)) {
			if (typeof entry !== 'string') {
				renderInterface([...parents, name], ns, entry)
			}
		}
	}

	const renderNamespace = (parents: string[], name: string) => {
		// const attrName = pascalCase(name)
		const typeName = pascalCase([...parents, name].join('-'))
		code.push(`\t${name}: ${typeName}\n`)
	}

	const renderResource = (name: string, type: string) => {
		const attrName = pascalCase(name)
		const className = pascalCase(type)
		code.push(`\t${render(attrName, className, type)}\n`)
	}

	const code: string[] = []

	for (const [ns, entry] of Object.entries(grouped)) {
		renderInterface([], ns, entry as {})
	}

	return code.join('')
}

const generateResourceInputTypes = (type: string, prop: Property) => {
	const code: string[] = [
		`type ${pascalCase(type)}Props = `,
		generateValue(prop, {
			depth: 0,
			indent: 1,
			// wrap: (v, p, ctx) => (ctx.depth > 1 ? `Input<${p.optional ? `${v} | undefined` : v}>` : v),
			wrap: (v, p, ctx) => {
				return ctx.depth > 1 ? (p.optional ? `OptionalInput<${v}>` : `Input<${v}>`) : v
			},
			filter: prop =>
				!(prop.computed && typeof prop.optional === 'undefined' && typeof prop.required === 'undefined'),
			optional: p => p.optional ?? false,
		}),
	].flat()

	return code.join('')
}

const generateResourceOutputTypes = (type: string, prop: Property) => {
	const code: string[] = [
		`type ${pascalCase(type)} = `,
		generateValue(prop, {
			indent: 1,
			depth: 0,
			wrap: (v, p, ctx) =>
				ctx.depth === 2 ? `Output<${p.optional && !p.computed ? `${v} | undefined` : v}>` : v,
			filter: () => true,
			readonly: true,
			// required: true,
			optional: (p, ctx) => (ctx.depth > 2 && p.optional && !p.computed) || false,
		}),
	].flat()

	return code.join('')
}

type Context = {
	indent: number
	depth: number
	wrap: (type: string, prop: Property, ctx: Context) => string
	filter: (prop: Property) => boolean
	readonly?: boolean
	optional: (prop: Property, ctx: Context) => boolean
}

const generateValue = (prop: Property, ctx: Context): string => {
	ctx.depth++

	// if (prop.optional && prop.required) {
	//   console.log(prop);
	// }

	if (['string', 'number', 'boolean', 'unknown'].includes(prop.type)) {
		return ctx.wrap(prop.type, prop, ctx)
	}

	if (prop.type === 'array') {
		const type = generateValue(prop.item, ctx)
		const array = ctx.readonly ? `ReadonlyArray<${type}>` : `Array<${type}>`
		return ctx.wrap(array, prop, ctx)
	}

	if (prop.type === 'record') {
		const type = generateValue(prop.item, ctx)
		const record = ctx.readonly ? `Readonly<Record<string, ${type}>>` : `Record<string, ${type}>`
		return ctx.wrap(record, prop, ctx)
	}

	if (prop.type === 'object') {
		const type = [
			'{',
			Object.entries(prop.properties)
				.filter(([_, p]) => ctx.filter(p))
				.map(([name, prop]) =>
					[
						prop.description
							? [`\n`, `\t`.repeat(ctx.indent), `/** `, prop.description.trim(), ' */', '\n'].join('')
							: '',
						`\t`.repeat(ctx.indent),
						// ctx.readonly ? "readonly " : "",
						camelCase(name),
						ctx.optional(prop, ctx) ? '?' : '',
						': ',
						generateValue(prop, { ...ctx, indent: ctx.indent + 1 }),
					].join('')
				)
				.join('\n'),
			`${`\t`.repeat(ctx.indent - 1)}}`,
		].join('\n')

		const object = ctx.readonly ? `Readonly<${type}>` : type

		return ctx.wrap(object, prop, ctx)
	}

	throw new Error(`Unknown property type: ${prop.type}`)
}
