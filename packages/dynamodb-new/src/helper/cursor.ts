import { AnyTable, IndexNames } from '../table'
import { CursorKey } from '../types/key'

export const fromCursorString = <T extends AnyTable, I extends IndexNames<T> | undefined = undefined>(
	table: T,
	cursorStringValue?: string
): CursorKey<T, I> | undefined => {
	if (!cursorStringValue) {
		return
	}

	// The cursor input can't be trusted
	// and should be nulled if the parsing fails

	try {
		const buffer = Buffer.from(cursorStringValue, 'base64')
		const json = buffer.toString('utf-8')
		const cursor = JSON.parse(json)

		return table.unmarshall(cursor)
	} catch (error) {
		return
	}
}

export const toCursorString = <T extends AnyTable, I extends IndexNames<T> | undefined = undefined>(
	table: T,
	cursor?: CursorKey<T, I>
): string | undefined => {
	if (!cursor) {
		return
	}

	const marshalled = table.marshall(cursor)
	const json = JSON.stringify(marshalled)
	const buffer = Buffer.from(json, 'utf-8')

	return buffer.toString('base64')
}
