import { countsRows, findAggregate } from './aggregates'
import { Expr } from './ast'
import { Scope } from './evaluate'
import { DataType, isFloatType, isIntegerType, isNullable, parseType, unwrap } from './types'
import { DateTimeValue, DateValue, TupleValue, Value } from './values'

const t = (name: string): DataType => parseType(name)

const UInt64 = t('UInt64')
const Float64 = t('Float64')
const StringType = t('String')
const UInt8 = t('UInt8')
const Bool = t('Bool')

// The smallest integer type a literal fits, like ClickHouse picks.
const integerType = (value: number | bigint): DataType => {
	const n = BigInt(value)

	if (n >= 0n) {
		if (n < 256n) return t('UInt8')
		if (n < 65536n) return t('UInt16')
		if (n < 4294967296n) return t('UInt32')
		if (n < 18446744073709551616n) return t('UInt64')
		return t('UInt128')
	}

	if (n >= -128n) return t('Int8')
	if (n >= -32768n) return t('Int16')
	if (n >= -2147483648n) return t('Int32')
	return t('Int64')
}

export const valueType = (value: Value, float = false): DataType => {
	if (value === null) return { name: 'Nullable', inner: { name: 'Nothing' } }
	if (typeof value === 'string') return StringType
	if (typeof value === 'boolean') return Bool
	if (typeof value === 'bigint') return integerType(value)
	if (typeof value === 'number') return Number.isInteger(value) && !float ? integerType(value) : Float64
	if (value instanceof DateTimeValue)
		return value.scale > 0
			? { name: 'DateTime64', scale: value.scale, timeZone: value.timeZone }
			: value.timeZone
				? { name: 'DateTime', timeZone: value.timeZone }
				: { name: 'DateTime' }
	if (value instanceof DateValue) return { name: value.wide ? 'Date32' : 'Date' }
	if (Array.isArray(value))
		return { name: 'Array', inner: value.length > 0 ? valueType(value[0]!) : { name: 'Nothing' } }
	if (value instanceof TupleValue) return { name: 'Tuple', items: value.items.map(item => valueType(item)) }
	if (value instanceof Map) {
		const [entry] = value.entries()
		return {
			name: 'Map',
			key: entry ? valueType(entry[0]) : StringType,
			value: entry ? valueType(entry[1]) : StringType,
		}
	}

	return { name: 'JSON' }
}

const wider = (a: DataType, b: DataType): DataType => {
	if (isFloatType(unwrap(a)) || isFloatType(unwrap(b))) return Float64
	return a
}

const sumType = (type: DataType | undefined): DataType => {
	const base = type ? unwrap(type) : undefined
	if (!base) return Float64
	if (isFloatType(base) || base.name === 'Decimal')
		return base.name === 'Decimal' ? { name: 'Decimal', precision: 38, scale: base.scale } : Float64
	if (isIntegerType(base)) return base.name.startsWith('U') ? UInt64 : t('Int64')
	return Float64
}

const SAME_AS_FIRST = new Set([
	'min',
	'max',
	'any',
	'anyLast',
	'anyHeavy',
	'argMin',
	'argMax',
	'first_value',
	'last_value',
	'any_value',
	'quantileExact',
	'medianExact',
	'quantileExactLow',
	'quantileExactHigh',
])

const aggregateType = (
	name: string,
	args: (DataType | undefined)[],
	scope: Scope,
	expr: Extract<Expr, { kind: 'function' }>
): DataType | undefined => {
	const found = findAggregate(name)
	if (!found) return

	const base = found.base
	// A Nullable argument makes the result Nullable, like -OrNull does.
	const nullableArgs = args.some(arg => arg !== undefined && isNullable(arg))
	const orNull = found.combinators.includes('OrNull') || (nullableArgs && !countsRows(base))
	const wrap = (type: DataType): DataType => (orNull && !isNullable(type) ? { name: 'Nullable', inner: type } : type)
	const first = args[0]
		? found.combinators.includes('Array') && args[0].name === 'Array'
			? args[0].inner
			: args[0]
		: undefined

	if (/^count/.test(base) || /^uniq/.test(base) || base === 'countDistinct') return wrap(UInt64)
	if (expr.distinct && base === 'count') return wrap(UInt64)
	if (/^sum/.test(base) && base !== 'sumMap') return wrap(sumType(first))
	if (/^(avg|quantile|median|varPop|varSamp|stddev|corr|boundingRatio)/.test(base) && !SAME_AS_FIRST.has(base)) {
		if (/^quantiles/.test(base)) return wrap({ name: 'Array', inner: Float64 })
		return wrap(Float64)
	}
	if (SAME_AS_FIRST.has(base)) return wrap(first ? unwrap(first) : StringType)
	if (/^groupArray|^groupUniqArray|^topK/.test(base))
		return { name: 'Array', inner: first ? unwrap(first) : StringType }
	if (base === 'windowFunnel') return UInt8
	if (base === 'retention') return { name: 'Array', inner: UInt8 }
	if (/^groupBit/.test(base)) return first ?? UInt64

	void scope
	return undefined
}

const FUNCTION_TYPES: Record<string, DataType | ((args: (DataType | undefined)[]) => DataType | undefined)> = {
	length: UInt64,
	lengthUTF8: UInt64,
	empty: UInt8,
	notEmpty: UInt8,
	has: UInt8,
	hasAny: UInt8,
	hasAll: UInt8,
	like: UInt8,
	notLike: UInt8,
	ilike: UInt8,
	notILike: UInt8,
	match: UInt8,
	equals: UInt8,
	notEquals: UInt8,
	less: UInt8,
	greater: UInt8,
	lessOrEquals: UInt8,
	greaterOrEquals: UInt8,
	and: UInt8,
	or: UInt8,
	not: UInt8,
	in: UInt8,
	notIn: UInt8,
	isNull: UInt8,
	isNotNull: UInt8,
	startsWith: UInt8,
	endsWith: UInt8,
	position: UInt64,
	indexOf: UInt64,
	toString: StringType,
	lower: StringType,
	upper: StringType,
	concat: StringType,
	substring: StringType,
	formatDateTime: StringType,
	toTypeName: StringType,
	currentDatabase: StringType,
	version: StringType,
	divide: Float64,
	avg: Float64,
	toDate: t('Date'),
	today: t('Date'),
	yesterday: t('Date'),
	toStartOfMonth: t('Date'),
	toStartOfQuarter: t('Date'),
	toStartOfYear: t('Date'),
	toMonday: t('Date'),
	toStartOfWeek: t('Date'),
	toYear: t('UInt16'),
	toMonth: UInt8,
	toDayOfMonth: UInt8,
	toDayOfWeek: UInt8,
	toHour: UInt8,
	toMinute: UInt8,
	toSecond: UInt8,
	toYYYYMM: t('UInt32'),
	toYYYYMMDD: t('UInt32'),
	toUnixTimestamp: t('UInt32'),
	generateUUIDv4: t('UUID'),
	plus: args => (args[0] && args[1] ? wider(args[0], args[1]) : undefined),
	minus: args => (args[0] && args[1] ? wider(args[0], args[1]) : undefined),
	multiply: args => (args[0] && args[1] ? wider(args[0], args[1]) : undefined),
	if: args => args[1],
	multiIf: args => args[1],
	coalesce: args => args.find(Boolean),
	ifNull: args => args[0] && unwrap(args[0]),
	arrayElement: args =>
		args[0]?.name === 'Array' ? args[0].inner : args[0]?.name === 'Map' ? args[0].value : undefined,
	arrayMap: () => undefined,
	toNullable: args => args[0] && (isNullable(args[0]) ? args[0] : { name: 'Nullable', inner: args[0] }),
	assumeNotNull: args => args[0] && unwrap(args[0]),
}

const CONVERSIONS = /^to(U?Int(8|16|32|64|128|256)|Float(32|64)|UUID|Bool|Date32|String)(OrNull|OrZero|OrDefault)?$/

// The type ClickHouse gives an expression - best effort, for toTypeName,
// the JSON format's meta & the result of aggregating no rows.
export const inferType = (expr: Expr, scope: Scope): DataType | undefined => {
	switch (expr.kind) {
		case 'literal':
			return valueType(expr.value as Value, (expr as { float?: boolean }).float)
		case 'param':
			return parseType(expr.type)
		case 'identifier': {
			const name = expr.parts.join('.')
			if (expr.parts.length === 1 && scope.aliases.has(name) && !scope.resolving?.has(name)) {
				const resolving = new Set(scope.resolving)
				resolving.add(name)
				return inferType(scope.aliases.get(name)!, { ...scope, resolving })
			}
			const index = scope.columns.get(name)
			return index === undefined ? undefined : scope.types[index]
		}
		case 'function': {
			const args = expr.args.map(arg => inferType(arg, scope))
			const aggregate = aggregateType(expr.name, args, scope, expr)

			if (aggregate) return aggregate

			const conversion = CONVERSIONS.exec(expr.name)
			if (conversion) {
				const type = t(conversion[1]!)
				return conversion[4] === 'OrNull' ? { name: 'Nullable', inner: type } : type
			}

			if ((expr.name === 'CAST' || expr.name === '_CAST') && expr.args[1]?.kind === 'literal') {
				return parseType(String(expr.args[1].value))
			}

			if (expr.name === 'toDateTime' || expr.name === 'now') {
				const zone = expr.args[expr.name === 'now' ? 0 : 1]
				return zone?.kind === 'literal'
					? { name: 'DateTime', timeZone: String(zone.value) }
					: { name: 'DateTime' }
			}

			if (expr.name === 'toDateTime64' || expr.name === 'now64') {
				const scale = expr.args[expr.name === 'now64' ? 0 : 1]
				const zone = expr.args[expr.name === 'now64' ? 1 : 2]
				return {
					name: 'DateTime64',
					scale: scale?.kind === 'literal' ? Number(scale.value) : 3,
					...(zone?.kind === 'literal' ? { timeZone: String(zone.value) } : {}),
				}
			}

			if (/^toStartOf(Hour|Minute|Day|FiveMinutes?|TenMinutes|FifteenMinutes|Interval)$/.test(expr.name)) {
				const zone = expr.args.at(-1)
				const source = args[0] ? unwrap(args[0]) : undefined
				const timeZone =
					expr.args.length > (expr.name === 'toStartOfInterval' ? 2 : 1) && zone?.kind === 'literal'
						? String(zone.value)
						: source && 'timeZone' in source
							? source.timeZone
							: undefined
				return timeZone ? { name: 'DateTime', timeZone } : { name: 'DateTime' }
			}

			if (expr.name === 'array') return { name: 'Array', inner: args[0] ?? { name: 'Nothing' } }
			if (expr.name === 'tuple') return { name: 'Tuple', items: args.map(arg => arg ?? StringType) }

			const entry = FUNCTION_TYPES[expr.name]
			if (typeof entry === 'function') return entry(args)
			return entry
		}
		default:
			return undefined
	}
}
