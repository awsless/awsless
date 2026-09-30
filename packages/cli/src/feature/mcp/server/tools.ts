import { getCurrentRoute, internalInvoke, MCP_DESCRIBE_PROPERTY, ToolContract } from 'awsless'
import { Session } from './auth.js'

export type Annotations = {
	readOnly: boolean
	destructive: boolean
	idempotent: boolean
	openWorld: boolean
}

export type Tool = {
	name: string
	function: string
	description: string
	title?: string
	omit: string[]
	permissions: string[]
	annotations: Annotations
}

const TOOL_PREFIX = 'TOOL:'

// The server fills these in on every call, so they're never the model's
// to provide - no matter what the exposed function's validator says.
const INJECTED_FIELDS = ['auth', 'viewer']

// Every tool is whitelisted in the baked bundle env, so the server can
// only ever dispatch what the stacks registered.
export const getTools = (): Tool[] => {
	const prefix = `${getCurrentRoute()}:${TOOL_PREFIX}`
	const tools: Tool[] = []

	for (const [key, value] of Object.entries(process.env)) {
		if (!key.startsWith(prefix) || !value) {
			continue
		}

		tools.push({ name: key.slice(prefix.length), ...JSON.parse(value) })
	}

	return tools.toSorted((a, b) => a.name.localeCompare(b.name))
}

export const getTool = (name: string) => {
	return getTools().find(tool => tool.name === name)
}

// A caller must hold every permission the tool declares. Tools without
// permissions are open to anyone who got past authentication.
export const isAllowed = (tool: Tool, session?: Session) => {
	if (tool.permissions.length === 0) {
		return true
	}

	if (!session) {
		return false
	}

	return tool.permissions.every(permission => session.permissions.includes(permission))
}

const contracts = new Map<string, ToolContract>()

// The input schema comes from the exposed function's own validator, so
// it can't drift from what the handler enforces. Each module loads once
// per container & is cached for the rest of its life.
const describe = async (tool: Tool) => {
	let contract = contracts.get(tool.function)

	if (!contract) {
		contract = (await internalInvoke(tool.function, { [MCP_DESCRIBE_PROPERTY]: true })) as ToolContract

		contracts.set(tool.function, contract)
	}

	return contract
}

// Hiding a field means dropping it from what the model is shown, and
// from what it's asked to provide.
const hideFields = (inputSchema: Record<string, unknown>, omit: string[]) => {
	const hidden = [...INJECTED_FIELDS, ...omit]
	const properties = inputSchema.properties as Record<string, unknown> | undefined
	const required = inputSchema.required as string[] | undefined

	if (!properties) {
		return inputSchema
	}

	return {
		...inputSchema,
		properties: Object.fromEntries(Object.entries(properties).filter(([name]) => !hidden.includes(name))),
		...(required ? { required: required.filter(name => !hidden.includes(name)) } : {}),
	}
}

const formatAnnotations = (tool: Tool) => {
	const { readOnly, destructive, idempotent, openWorld } = tool.annotations

	return {
		readOnlyHint: readOnly,

		// The spec only gives these meaning when the tool writes, and a
		// destructive hint next to a read only one reads as a contradiction.
		...(readOnly ? {} : { destructiveHint: destructive, idempotentHint: idempotent }),

		openWorldHint: openWorld,
	}
}

export const listTools = async (session?: Session) => {
	const allowed = getTools().filter(tool => isAllowed(tool, session))

	return Promise.all(
		allowed.map(async tool => {
			const contract = await describe(tool)

			return {
				name: tool.name,
				title: tool.title,
				description: tool.description,
				inputSchema: hideFields(contract.inputSchema, tool.omit),
				annotations: formatAnnotations(tool),
			}
		})
	)
}
