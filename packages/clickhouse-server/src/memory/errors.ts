import { VERSION } from '../real/version'

// The http status ClickHouse answers each error type with.
const STATUS: Record<string, number> = {
	UNKNOWN_TABLE: 404,
	UNKNOWN_FUNCTION: 404,
	UNKNOWN_IDENTIFIER: 404,
	UNKNOWN_TYPE: 404,
	UNKNOWN_DATABASE: 404,
	UNKNOWN_SETTING: 404,
	UNKNOWN_AGGREGATE_FUNCTION: 404,
	UNKNOWN_FORMAT: 404,
	SYNTAX_ERROR: 400,
	CANNOT_PARSE_TEXT: 400,
	CANNOT_PARSE_DATETIME: 400,
	CANNOT_PARSE_INPUT_ASSERTION_FAILED: 400,
	CANNOT_PARSE_NUMBER: 400,
	CANNOT_PARSE_UUID: 400,
	CANNOT_PARSE_QUOTED_STRING: 400,
	INCORRECT_DATA: 400,
	ILLEGAL_TYPE_OF_ARGUMENT: 400,
	TYPE_MISMATCH: 400,
	NUMBER_OF_ARGUMENTS_DOESNT_MATCH: 400,
	TOO_MANY_ARGUMENTS_FOR_FUNCTION: 400,
	TOO_FEW_ARGUMENTS_FOR_FUNCTION: 400,
	BAD_ARGUMENTS: 400,
	ILLEGAL_COLUMN: 400,
	NOT_AN_AGGREGATE: 400,
	ILLEGAL_AGGREGATION: 400,
	DUPLICATE_COLUMN: 400,
	NO_SUCH_COLUMN_IN_TABLE: 400,
	ILLEGAL_FINAL: 400,
	ALTER_OF_COLUMN_IS_FORBIDDEN: 400,
	BAD_QUERY_PARAMETER: 400,
	UNKNOWN_QUERY_PARAMETER: 400,
	EMPTY_QUERY: 400,
	NOT_IMPLEMENTED: 501,
}

// A ClickHouse error, written to the client in the server's own words so
// the official client parses it the same way.
export class ClickHouseException extends Error {
	readonly status: number

	constructor(
		readonly code: number,
		readonly type: string,
		message: string
	) {
		super(message)
		this.name = 'ClickHouseException'
		this.status = STATUS[type] ?? 500
	}

	toString() {
		const message = this.message.endsWith('.') || this.message.endsWith('?') ? this.message : `${this.message}.`
		return `Code: ${this.code}. DB::Exception: ${message} (${this.type}) (version ${VERSION} (official build))\n`
	}
}

const error = (code: number, type: string) => (message: string) => new ClickHouseException(code, type, message)

export const syntaxError = error(62, 'SYNTAX_ERROR')
export const unknownTable = error(60, 'UNKNOWN_TABLE')
export const unknownIdentifier = error(47, 'UNKNOWN_IDENTIFIER')
export const unknownFunction = error(46, 'UNKNOWN_FUNCTION')
export const unknownType = error(50, 'UNKNOWN_TYPE')
export const unknownDatabase = error(81, 'UNKNOWN_DATABASE')
export const unknownFormat = error(73, 'UNKNOWN_FORMAT')
export const tableExists = error(57, 'TABLE_ALREADY_EXISTS')
export const notImplemented = error(48, 'NOT_IMPLEMENTED')
export const illegalType = error(43, 'ILLEGAL_TYPE_OF_ARGUMENT')
export const typeMismatch = error(53, 'TYPE_MISMATCH')
export const argumentCount = error(42, 'NUMBER_OF_ARGUMENTS_DOESNT_MATCH')
export const badArguments = error(36, 'BAD_ARGUMENTS')
export const notAnAggregate = error(215, 'NOT_AN_AGGREGATE')
export const illegalAggregation = error(184, 'ILLEGAL_AGGREGATION')
export const duplicateColumn = error(15, 'DUPLICATE_COLUMN')
export const noSuchColumn = error(16, 'NO_SUCH_COLUMN_IN_TABLE')
export const illegalFinal = error(181, 'ILLEGAL_FINAL')
export const alterForbidden = error(524, 'ALTER_OF_COLUMN_IS_FORBIDDEN')
export const cannotParseText = error(6, 'CANNOT_PARSE_TEXT')
export const cannotParseDateTime = error(41, 'CANNOT_PARSE_DATETIME')
export const cannotParseNumber = error(72, 'CANNOT_PARSE_NUMBER')
export const cannotParseUuid = error(376, 'CANNOT_PARSE_UUID')
export const incorrectData = error(117, 'INCORRECT_DATA')
export const unknownQueryParameter = error(456, 'UNKNOWN_QUERY_PARAMETER')
export const badQueryParameter = error(457, 'BAD_QUERY_PARAMETER')
export const emptyQuery = error(62, 'SYNTAX_ERROR')
export const unknownElementOfEnum = error(691, 'UNKNOWN_ELEMENT_OF_ENUM')
export const illegalDivision = error(153, 'ILLEGAL_DIVISION')
export const tooLargeArraySize = error(128, 'TOO_LARGE_ARRAY_SIZE')
export const unknownSetting = error(115, 'UNKNOWN_SETTING')
export const logicalError = error(49, 'LOGICAL_ERROR')
