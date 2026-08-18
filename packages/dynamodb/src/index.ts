// define
export { type AnyTable, define, type GenericMapSchema, type Infer, Table } from './table.js'

// types
export { type PrimaryKey, type HashKey, type SortKey } from './types/key.js'
export { type Transactable } from './command/transact-write.js'

// structs
export { optional } from './schema/optional.js'

export { any, type AnySchema } from './schema/any.js'
export { set, type SetSchema } from './schema/set.js'
export { uuid, type UuidSchema } from './schema/uuid.js'
export { string, type StringSchema } from './schema/string.js'
export { boolean, type BooleanSchema } from './schema/boolean.js'
export { number, type NumberSchema } from './schema/number.js'
export { bigint, type BigIntSchema } from './schema/bigint.js'
export { bigfloat, type BigFloatSchema } from './schema/bigfloat.js'
export { uint8array, type Uint8ArraySchema } from './schema/uint8-array.js'
export { object, type ObjectSchema } from './schema/object.js'
export { record, type RecordSchema } from './schema/record.js'
export { variant, type VariantSchema } from './schema/variant.js'
export { array, type ArraySchema } from './schema/array.js'
export { tuple, type TupleSchema, type TupleWithRestSchema } from './schema/tuple.js'
export { date, type DateSchema } from './schema/date.js'
export { enum_, type EnumSchema } from './schema/enum.js'
export { json, type JsonSchema } from './schema/json.js'
export { ttl, type TtlSchema } from './schema/ttl.js'
export { unknown, type UnknownSchema } from './schema/unknown.js'

// test
export { mockDynamoDB } from './test/mock.js'
export { migrate } from './test/migrate.js'
export { seedTable, seed } from './test/seed.js'
export { streamTable } from './test/stream.js'
export { DynamoDBServer } from '@awsless/dynamodb-server'

// client
export { dynamoDBClient, dynamoDBDocumentClient } from './client.js'
export { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
export { DynamoDBClient } from '@aws-sdk/client-dynamodb'

// raw commands
export { GetItemCommand, PutItemCommand, UpdateItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb'
export { QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb'
export { TransactWriteItemsCommand, TransactGetItemsCommand } from '@aws-sdk/client-dynamodb'
export { BatchGetItemCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb'

// errors
import './exception/transaction-canceled'
export {
	ConditionalCheckFailedException,
	TransactionInProgressException,
	TransactionCanceledException,
	TransactionConflictException,
	DynamoDBServiceException,
} from '@aws-sdk/client-dynamodb'

// fluent
export { Fluent, createFluent } from './expression/fluent.js'

// commands
export { getItem } from './command/get-item.js'
export { putItem } from './command/put-item.js'
export { updateItem } from './command/update-item.js'
export { deleteItem } from './command/delete-item.js'

export { getItems } from './command/get-items.js'
export { putItems } from './command/put-items.js'
export { deleteItems } from './command/delete-items.js'

export { getIndexItem } from './command/get-index-item.js'

export { query } from './command/query.js'
export { scan } from './command/scan.js'

export { conditionCheck } from './command/condition-check.js'
export { transactWrite } from './command/transact-write.js'
export { transactRead } from './command/transact-read.js'
