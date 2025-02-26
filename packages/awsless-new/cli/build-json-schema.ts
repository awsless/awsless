import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ZodSchema } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { AppSchema } from '../src/config/app.js'
import { StackSchema } from '../src/config/stack.js'

type GenerateProps = {
	schema: ZodSchema
	title: string
	name: string
}

const generateJsonSchema = (props: GenerateProps) => {
	const file = join(process.cwd(), `dist/${props.name}.json`)
	const schema = zodToJsonSchema(props.schema, {
		name: props.name,
		// errorMessages: true,
		markdownDescription: true,
		pipeStrategy: 'input',
		$refStrategy: 'none',
	}) as {
		title?: string
	}

	appendDefaults(schema)
	schema.title = props.title
	writeFileSync(file, JSON.stringify(schema))
}

const appendDefaults = (object: unknown) => {
	if (Array.isArray(object)) {
		object.forEach(appendDefaults)
	}

	if (typeof object === 'object' && object !== null) {
		if ('default' in object && 'type' in object) {
			if ('description' in object) {
				object.description += `\n\n@default ${JSON.stringify(object.default)}`
			}

			if ('markdownDescription' in object) {
				object.markdownDescription += `\n\n@default \`\`\`${JSON.stringify(object.default)}\`\`\``
			}
		} else {
			Object.values(object).forEach(appendDefaults)
		}
	}
}

generateJsonSchema({
	schema: AppSchema,
	name: 'app',
	title: 'Awsless App Config',
})

generateJsonSchema({
	schema: StackSchema,
	name: 'stack',
	title: 'Awsless Stack Config',
})
