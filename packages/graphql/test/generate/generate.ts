import { buildSchema } from 'graphql'
import { generate } from '../../src/generate'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

describe('generate', () => {
	it('should generate types for graphql schema', async () => {
		const string = await readFile(join(__dirname, '../schema.gql'), 'utf8')
		const schema = buildSchema(string)
		const result = generate(schema, {
			package: '../src',
			scalarTypes: {
				AWSDateTime: 'string',
			},
		})

		await writeFile(join(__dirname, '../__types.ts'), result)
	})
})
