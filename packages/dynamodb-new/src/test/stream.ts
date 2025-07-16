import {
	BatchWriteItemCommand,
	DeleteItemCommand,
	PutItemCommand,
	TransactWriteItemsCommand,
	UpdateItemCommand,
} from '@aws-sdk/client-dynamodb'
import { getItem } from '../operations/get-item'
import { AnyTable, Output } from '../table'
import { PrimaryKey } from '../types/key'

type StreamData<T extends AnyTable> = {
	Keys: PrimaryKey<T>
	OldImage?: Output<T>
	NewImage?: Output<T>
}

export type StreamRequest<T extends AnyTable> = {
	Records: {
		eventName: 'MODIFY' | 'INSERT' | 'REMOVE'
		dynamodb: StreamData<T>
	}[]
}

export type Stream<T extends AnyTable> = {
	table: T
	fn: (payload: StreamRequest<T>) => unknown | void
}

export const streamTable = <T extends AnyTable>(
	table: T,
	fn: (payload: StreamRequest<T>) => unknown | void
): Stream<AnyTable> => {
	return { table, fn } as any
}

const getPrimaryKey = (table: AnyTable, item: any): PrimaryKey<AnyTable> => {
	const key: PrimaryKey<AnyTable> = {
		[table.hash]: item[table.hash],
	}

	if (table.sort) {
		key[table.sort] = item[table.sort]
	}

	return key
}

const getEventName = (OldImage: unknown, NewImage: unknown) => {
	if (NewImage) {
		if (OldImage) {
			return 'MODIFY'
		}

		return 'INSERT'
	}

	return 'REMOVE'
}

const emit = (stream: Stream<AnyTable>, items: StreamData<AnyTable>[]) => {
	return stream.fn({
		Records: items.map(({ Keys, OldImage, NewImage }) => ({
			eventName: getEventName(OldImage, NewImage),
			dynamodb: {
				Keys,
				OldImage,
				NewImage,
			},
		})),
	})
}

export const pipeStream = (streams: Stream<AnyTable>[], command: any, send: <T>() => T) => {
	if (command instanceof PutItemCommand) {
		return pipeToTable({
			streams,
			command,
			send,
			getKey: (command, table) => {
				const key = getPrimaryKey(table, command.input.Item!)
				return table.unmarshall(key)
			},
		})
	}

	if (command instanceof UpdateItemCommand || command instanceof DeleteItemCommand) {
		return pipeToTable({
			streams,
			command,
			send,
			getKey: (command, table) => {
				return table.unmarshall(command.input.Key!)
			},
		})
	}

	if (command instanceof BatchWriteItemCommand) {
		return pipeToTables({
			command,
			send,
			getEntries: command => {
				return Object.entries(command.input.RequestItems!).map(([tableName, items]) => {
					const stream = streams.find(stream => stream.table.name === tableName)
					if (!stream) return

					return {
						...stream,
						items: items.map(item => {
							if (item.PutRequest) {
								const key = getPrimaryKey(stream.table, item.PutRequest.Item)
								return { key: stream.table.unmarshall(key) }
							} else if (item.DeleteRequest) {
								return { key: stream.table.unmarshall(item.DeleteRequest.Key!) }
							}
							return
						}),
					}
				})
			},
		})
	}

	if (command instanceof TransactWriteItemsCommand) {
		return pipeToTables({
			command,
			send,
			getEntries: command => {
				return command.input.TransactItems!.map(item => {
					if (item.ConditionCheck) return

					const keyed = item.Delete || item.Update
					const tableName = (keyed?.TableName || item.Put?.TableName)!
					const stream = streams.find(stream => stream.table.name === tableName)

					if (!stream) return

					const marshall = keyed ? keyed.Key! : getPrimaryKey(stream.table, item.Put!.Item)

					return {
						...stream,
						items: [{ key: stream.table.unmarshall(marshall) }],
					}
				})
			},
		})
	}

	return send()
}

const pipeToTables = async <Command>({
	command,
	send,
	getEntries,
}: {
	command: Command
	send: <T>() => T
	getEntries: (command: Command) => Array<
		| (Stream<AnyTable> & {
				items: Array<
					| {
							key: any
							OldImage?: any
							NewImage?: any
					  }
					| undefined
				>
		  })
		| undefined
	>
}) => {
	const entries = getEntries(command)

	await Promise.all(
		entries.map(async entry => {
			if (entry) {
				await Promise.all(
					entry.items.map(async item => {
						if (item) {
							item.OldImage = await getItem(entry.table, item.key)
						}
					})
				)
			}
		})
	)

	const result = await send()

	await Promise.all(
		entries.map(async entry => {
			if (entry) {
				await Promise.all(
					entry.items.map(async item => {
						if (item) {
							item.NewImage = await getItem(entry.table, item.key)
						}
					})
				)
			}
		})
	)

	await Promise.all(
		entries.map(entry => {
			if (!entry) {
				return
			}

			return emit(
				entry,
				entry.items
					.map(item => {
						if (item) {
							return {
								Keys: entry.table.marshall(item.key),
								OldImage: item.OldImage ? entry.table.marshall(item.OldImage) : undefined,
								NewImage: item.NewImage ? entry.table.marshall(item.NewImage) : undefined,
							}
						}

						return
					})
					.filter(Boolean) as { Keys: any; OldImage: any; NewImage: any }[]
			)
		})
	)

	return result
}

const pipeToTable = async <Command extends { input: { TableName?: string } }>({
	streams,
	command,
	send,
	getKey,
}: {
	streams: Stream<AnyTable>[]
	command: Command
	send: <T>() => T
	getKey: (command: Command, table: AnyTable) => any
}) => {
	const listeners = streams.filter(stream => stream.table.name === command.input.TableName)

	if (listeners.length === 0) {
		return send()
	}

	const table = listeners[0]!.table
	const key = getKey(command, table)

	const image1 = await getItem(table, key)
	const result = await send()
	const image2 = await getItem(table, key)

	await Promise.all(
		listeners.map(stream => {
			return emit(stream, [
				{
					Keys: table.marshall(key)!,
					OldImage: image1 ? table.marshall(image1) : undefined,
					NewImage: image2 ? table.marshall(image2) : undefined,
				},
			])
		})
	)

	return result
}
