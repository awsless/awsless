import { gibibytes } from '@awsless/size'
import { z } from 'zod'
import { sizeMax, sizeMin, SizeSchema } from '../../config/schema/size.js'

const VersionSchema = z
	.union([
		//
		z.enum(['2.13', '2.11', '2.9', '2.7', '2.5', '2.3', '1.3']),
		z.string(),
	])
	.describe('Specify the OpenSearch engine version.')

const TypeSchema = z
	.union([
		z.enum([
			't3.small',
			't3.medium',
			'm3.medium',
			'm3.large',
			'm3.xlarge',
			'm3.2xlarge',
			'm4.large',
			'm4.xlarge',
			'm4.2xlarge',
			'm4.4xlarge',
			'm4.10xlarge',
			'm5.large',
			'm5.xlarge',
			'm5.2xlarge',
			'm5.4xlarge',
			'm5.12xlarge',
			'm5.24xlarge',
			'r5.large',
			'r5.xlarge',
			'r5.2xlarge',
			'r5.4xlarge',
			'r5.12xlarge',
			'r5.24xlarge',
			'c5.large',
			'c5.xlarge',
			'c5.2xlarge',
			'c5.4xlarge',
			'c5.9xlarge',
			'c5.18xlarge',
		]),
		z.string(),
	])
	.describe('Instance type of data nodes in the cluster.')

const CountSchema = z.number().int().min(1).max(10).describe('Number of instances in the cluster.')

const StorageSizeSchema = SizeSchema.refine(sizeMin(gibibytes(10)), 'Minimum storage size is 10 GB')
	.refine(sizeMax(gibibytes(100)), 'Maximum storage size is 100 GB')
	.describe('The storage size of every data node in the cluster.')

// The one shared OpenSearch domain of the app, created as soon as any
// stack declares a search index.
export const SearchDefaultSchema = z
	.object({
		type: TypeSchema.default('t3.small'),
		count: CountSchema.default(1),
		version: VersionSchema.default('2.13'),
		storage: StorageSizeSchema.default('10 GB'),
	})
	.strict()
	.default({})
	.describe('Configure the shared OpenSearch domain that backs every search index in your app.')

const IndexNameSchema = z
	.string()
	.regex(
		/^[a-z0-9][a-z0-9\-_.]*$/,
		'Index names must be lowercase & start with a letter or number, like "users" or "game-events".'
	)

// The subset of OpenSearch field options that gets typed editor
// support - every other option passes through untouched, so the full
// mapping api stays usable.

const FieldTypeSchema = z
	.union([
		z.enum([
			// strings
			'text',
			'keyword',
			'match_only_text',
			'wildcard',
			'search_as_you_type',
			'completion',
			// numbers
			'long',
			'integer',
			'short',
			'byte',
			'unsigned_long',
			'double',
			'float',
			'half_float',
			'scaled_float',
			// dates & other scalars
			'boolean',
			'date',
			'date_nanos',
			'ip',
			'binary',
			'token_count',
			// objects
			'object',
			'nested',
			'flat_object',
			'join',
			'alias',
			// geo & specialized
			'geo_point',
			'geo_shape',
			'percolator',
			'rank_feature',
			'rank_features',
			'knn_vector',
		]),
		z.string(),
	])
	.describe('The OpenSearch field type.')

// The json schema generator can't express recursion, so the typed
// editor support bottoms out after a few nesting levels - deeper
// mappings still validate through the catchall passthrough.
const mappingProperty = (child?: z.ZodTypeAny) =>
	z
		.object({
			type: FieldTypeSchema.optional(),
			...(child
				? {
						properties: z
							.record(z.string(), child)
							.optional()
							.describe('The sub fields of an object or nested field.'),
						fields: z
							.record(z.string(), child)
							.optional()
							.describe(
								'Multi-fields that index the same value in different ways, like a keyword sub field.'
							),
					}
				: {}),
			analyzer: z.string().optional().describe('The analyzer for text fields.'),
			format: z.string().optional().describe('The date format, like "epoch_millis" or "strict_date_time".'),
			index: z.boolean().optional().describe('Whether the field is searchable.'),
			doc_values: z.boolean().optional().describe('Whether the field supports sorting & aggregations.'),
			null_value: z.unknown().optional().describe('The value used when the field is null.'),
			copy_to: z
				.union([z.string(), z.string().array()])
				.optional()
				.describe('Copy the field value into another field.'),
			dimension: z.number().int().optional().describe('The vector dimension of a knn_vector field.'),
		})
		.catchall(z.unknown())

const MappingPropertySchema = mappingProperty(mappingProperty(mappingProperty(mappingProperty())))

const MappingsSchema = z
	.object({
		properties: z
			.record(z.string(), MappingPropertySchema)
			.optional()
			.describe('The field mappings of the index.'),
		dynamic: z
			.union([z.boolean(), z.enum(['strict', 'runtime'])])
			.optional()
			.describe('How new fields are handled: true (map them), false (store only), or "strict" (reject them).'),
		dynamic_templates: z
			.array(z.record(z.string(), z.unknown()))
			.optional()
			.describe('Rules that map dynamically added fields by name or type.'),
		_source: z.record(z.string(), z.unknown()).optional().describe('Control how the document source is stored.'),
		_meta: z.record(z.string(), z.unknown()).optional().describe('Free-form metadata stored with the mapping.'),
	})
	.catchall(z.unknown())
	.describe('The OpenSearch mappings of the index. Additive changes deploy, breaking changes fail the deploy.')

// The shorthand schema: a field is just its type, objects nest
// naturally & wrapping in [ ... ] means an array of them (nested).
// { "$type": ... } passes a raw field definition through untouched.
const rawFieldSchema = z
	.object({
		$type: FieldTypeSchema.describe('The OpenSearch field type, with every other option passed through as-is.'),
	})
	.catchall(z.unknown())

const schemaField = (child?: z.ZodTypeAny): z.ZodTypeAny => {
	const fields = child ? z.record(z.string(), child) : z.record(z.string(), z.unknown())

	return z.union([
		FieldTypeSchema,
		rawFieldSchema,
		z
			.tuple([fields])
			.describe('An array of objects, indexed as a nested field so queries match within one element.'),
		fields.describe('An object field with sub fields.'),
	])
}

const SchemaSchema = z
	.record(z.string(), schemaField(schemaField(schemaField(schemaField()))))
	.describe(
		'The shorthand schema of the index: a field is its type ("keyword"), an object nests ({ ... }), an array of objects becomes a nested field ([{ ... }]), and { "$type": ... } passes a raw field definition through. "text" fields get a ".keyword" sub field automatically.'
	)

const IndexSchema = z
	.object({
		schema: SchemaSchema.optional(),
		strict: z
			.boolean()
			.optional()
			.describe('Reject documents with fields that are missing from the schema.'),
		mappings: MappingsSchema.optional(),
		settings: z
			.record(z.string(), z.unknown())
			.optional()
			.describe('The OpenSearch index settings, applied when the index is created.'),
	})
	.refine(props => !(props.schema && props.mappings), {
		message: 'Define either "schema" or "mappings" for an index, not both.',
	})
	.refine(props => !(props.strict && !props.schema), {
		message: 'The "strict" option only works together with "schema".',
	})

export const SearchsSchema = z
	.record(IndexNameSchema, IndexSchema)
	.optional()
	.describe(
		'Define the search indexes in your stack, backed by the one shared OpenSearch domain of your app. The physical index name is prefixed with the stack name.'
	)
