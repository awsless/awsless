import { Project, StructureKind, Writers } from 'ts-morph'

const provider = 'aws'
const project = new Project({})
const file = project.createSourceFile(`${provider}.types.d.ts`)

file.addImportDeclaration({
	moduleSpecifier: './base.js',
	namedImports: ['DataSource', 'Input', 'OptionalInput', 'Output', 'ResourceClass'],
})

// file.addTypeAliases([])

file.addTypeAlias({
	name: 'FunctionProps',
	type: Writers.object({
		account_id: Writers.unionType('string', 'undefined'),
		others: writer => {
			// const lol = Writers.object({})
			writer.write('Output<')
			writer.write('Readonly<')
			writer.inlineBlock(() => {})
			writer.write('>')
			writer.write('>')
		},
		other: Writers.objectType({
			properties: [
				{
					name: 'lol',
					kind: StructureKind.PropertySignature,
					isReadonly: true,
					type: writer => {
						writer.write
					},
				},
			],
		}),
	}),
})

// type.addTypeParameter()

file.addTypeAlias({
	name: 'Function',
	type: writer => {
		writer.block(() => {
			writer.write('account_id: ')
			writer.block()
			// writer.
		})
	},
})
