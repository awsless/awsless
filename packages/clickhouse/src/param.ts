const escape = (value: string) => {
	return value
		.replaceAll('\\', '\\\\')
		.replaceAll("'", "\\'")
		.replaceAll('\t', '\\t')
		.replaceAll('\n', '\\n')
		.replaceAll('\r', '\\r')
}

// Identifiers like table names can't be parameters in ddl, so they're
// quoted instead.
export const quoteIdentifier = (name: string) => {
	return `\`${name.replaceAll('\\', '\\\\').replaceAll('`', '\\`')}\``
}

// A string literal, for the comments & settings in ddl.
export const quoteString = (value: string) => {
	return `'${escape(value)}'`
}
