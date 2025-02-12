import type * as Types from '@opensearch-project/opensearch/api/types'
export type { Types }
export type { AnySchema, Schema, SchemaProps, Mapping } from './schema/schema'

export { searchClient } from './client'

// mock
export { mockOpenSearch } from './mock'

// table
export { define, Table, AnyTable } from './table'

// ops
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
