
export const fromCursor = (cursor:string) => {
	return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8')) as object
}

export const toCursor = (value:object) => {
	return Buffer.from(JSON.stringify(value), 'utf-8').toString('base64')
}
