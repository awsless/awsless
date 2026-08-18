// Generate the json schema files for the app & stack config into the
// published dist folder.

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { AppSchema } from '../src/config/app.js'
import { StackSchema } from '../src/config/stack.js'
import { createStagePatchJsonSchema, zodSchemaToJsonSchema } from '../src/config/stage-patch-json-schema.js'

type GenerateProps = {
	schema: z.ZodType
	title: string
	name: string
}

const generateJsonSchema = (props: GenerateProps) => {
	const file = join(process.cwd(), `dist/${props.name}.json`)
	const schema = zodSchemaToJsonSchema(props.schema)

	appendDefaults(schema)
	schema.title = props.title
	writeFileSync(file, JSON.stringify(schema))

	return schema
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

const appSchema = generateJsonSchema({
	schema: AppSchema,
	name: 'app',
	title: 'Awsless App Config',
})

const stackSchema = generateJsonSchema({
	schema: StackSchema,
	name: 'stack',
	title: 'Awsless Stack Config',
})

writeFileSync(
	join(process.cwd(), 'dist/app.stage.json'),
	JSON.stringify(createStagePatchJsonSchema(appSchema, 'Awsless App Stage Patch Config'))
)

writeFileSync(
	join(process.cwd(), 'dist/stack.stage.json'),
	JSON.stringify(createStagePatchJsonSchema(stackSchema, 'Awsless Stack Stage Patch Config'))
)
