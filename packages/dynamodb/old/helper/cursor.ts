
export const fromCursor = <Key>(cursor:string) => {
	return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8')) as Key
}

export const toCursor = (value:object) => {
	return Buffer.from(JSON.stringify(value), 'utf-8').toString('base64')
}
