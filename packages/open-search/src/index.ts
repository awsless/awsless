import type * as Types from '@opensearch-project/opensearch/api/types'
export type { Types }
export type { AnySchema, Schema, SchemaProps, Mapping } from './schema/schema'

export { searchClient, mockClient } from './client'

// mock
export { mockOpenSearch } from './mock'

// local server, used by the awsless local dev environment
export { download } from './server/download'
export { downloadJdk } from './server/jdk'
export { launch } from './server/launch'
export { wait } from './server/wait'
export { VERSION_2_8_0 } from './server/version'
export type { VersionArgs } from './server/version'

// table
export { define, Table, AnyTable } from './table'

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
