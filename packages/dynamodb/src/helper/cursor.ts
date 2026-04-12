import { AttributeValue } from '@aws-sdk/client-dynamodb'

export const fromCursorString = (cursorStringValue?: string): Record<string, AttributeValue> | undefined => {
	if (!cursorStringValue) {
		return
	}

	// The cursor input can't be trusted
	// and should be nulled if the parsing fails

	try {
		const buffer = Buffer.from(cursorStringValue, 'base64')
		const json = buffer.toString('utf-8')

		return JSON.parse(json)
	} catch (error) {
		return
	}
}

export const toCursorString = (cursor?: Record<string, AttributeValue>): string | undefined => {
	if (!cursor) {
		return
	}

	const json = JSON.stringify(cursor)
	const buffer = Buffer.from(json, 'utf-8')

	return buffer.toString('base64')
}
