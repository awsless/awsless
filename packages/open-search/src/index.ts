export type { Types } from '@opensearch-project/opensearch'
export type { AnySchema, Schema, SchemaProps, Mapping } from './schema/schema'

export { searchClient, isServerlessEndpoint } from './client'

// mock
export { mockOpenSearch } from './mock'

// The local server helpers live in the server package, re-exported so
// existing callers keep working.
export { download, launch, VERSION_3_5_0_MIN, type VersionArgs } from '@awsless/open-search-server'

// table
export { define, type Table, type AnyTable } from './table'

// ops
export {
	bulk,
	bulkIndexItem,
	bulkDeleteItem,
	bulkCreateItem,
	bulkUpdateItem,
	BulkError,
	BulkItemError,
} from './ops/bulk'

export { total } from './ops/total'
export { search } from './ops/search'
export { indexItem } from './ops/index-item'
export { deleteItem } from './ops/delete-item'
export { updateItem } from './ops/update-item'
export { createIndex } from './ops/create-index'
export { deleteIndex } from './ops/delete-index'

// types
export { array } from './schema/array'
export { bigfloat } from './schema/bigfloat'
export { bigint } from './schema/bigint'
export { boolean } from './schema/boolean'
export { date } from './schema/date'
// export { enums } from './structs/__enums'
export { number } from './schema/number'
export { object } from './schema/object'
export { set } from './schema/set'
export { string } from './schema/string'
export { uuid } from './schema/uuid'
