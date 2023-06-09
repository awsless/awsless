
import { Struct, array, coerce, enums, object, type, unknown } from "@awsless/validate"
import { AnyTableDefinition } from "../table"
import { PrimaryKey } from "../types/key"
import 'superstruct'

export const streamStruct = <T extends AnyTableDefinition>(table:T) => {
	const itemStruct = () => coerce(unknown(), object(), (value) => {
		return table.unmarshall(value)
	})

	return type({
		Records: array(
			type({
				eventName: enums([ 'MODIFY', 'INSERT', 'REMOVE' ]),
				dynamodb: type({
					Keys: itemStruct() as Struct<PrimaryKey<T>>,
					OldImage: itemStruct() as Struct<T['schema']['OUTPUT'] | undefined>,
					NewImage: itemStruct() as Struct<T['schema']['OUTPUT'] | undefined>,
				}),
			})
		),
	})
}
