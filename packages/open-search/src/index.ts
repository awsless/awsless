import type * as Types from '@opensearch-project/opensearch/api/types'
export type { Types }
export type { AnyStruct, Struct, Props } from './structs/struct'

export { searchClient } from './client'

// mock
export { mockOpenSearch } from './mock'

// table
export { define, Table, AnyTable } from './table'

// ops
export { indexItem } from './ops/index-item'
export { deleteItem } from './ops/delete-item'
export { updateItem } from './ops/update-item'
export { migrate } from './ops/migrate'
export { search } from './ops/search'

// types
export { array } from './structs/array'
export { bigfloat } from './structs/bigfloat'
export { bigint } from './structs/bigint'
export { boolean } from './structs/boolean'
export { date } from './structs/date'
export { enums } from './structs/enums'
export { number } from './structs/number'
export { object } from './structs/object'
export { set } from './structs/set'
export { string } from './structs/string'
export { uuid } from './structs/uuid'

export const version = '2'
