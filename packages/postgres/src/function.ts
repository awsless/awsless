import type { BigFloat } from '@awsless/big-float'
import { stringify } from '@awsless/json'
import type { PostgresClient } from './transport'

// A function of a stack's schema, defined next to the code that calls it:
// its signature, its body and a typed call, like a redis script. The stack
// file lists the module under `postgres.functions`, and every function it
// exports is created when the schema is applied.

// Marks a defined function, also for a second copy of this package: the
// CLI reads a stack's definitions with its own.
const POSTGRES_FUNCTION: unique symbol = Symbol.for('awsless.postgres.function')

// A Postgres type as an argument or a result: its name in sql and the
// TypeScript value it stands for.
export type PostgresType<T> = {
	sql: string
	// How a value travels when the text pg makes of it isn't what the type reads.
	encode?(value: T): unknown
	// How the function's rows are read: one value, rows, or nothing.
	shape: 'value' | 'rows' | 'nothing'
	// Only for TypeScript: the value's type.
	readonly __value?: T
}

const valueType = <T>(sql: string, encode?: (value: T) => unknown): PostgresType<T> => ({
	sql,
	encode,
	shape: 'value',
})

type Columns = Record<string, PostgresType<unknown>>

type ValueOf<Type> = Type extends PostgresType<infer T> ? T : never

type RowOf<C extends Columns> = { [Name in keyof C]: ValueOf<C[Name]> }

const uuid = <T extends string = `${string}-${string}-${string}-${string}-${string}`>() => valueType<T>('uuid')
const text = <T extends string = string>() => valueType<T>('text')
const integer = () => valueType<number>('integer')
const double = () => valueType<number>('double precision')
const boolean = () => valueType<boolean>('boolean')
// A day, as `YYYY-MM-DD`.
const date = () => valueType<string>('date')
const timestamp = () => valueType<Date>('timestamptz')
// Every digit kept: a BigFloat.
const numeric = () => valueType<BigFloat>('numeric')
// Sent as json text: pg would turn an array into a Postgres array.
const jsonb = <T = unknown>() => valueType<T>('jsonb', value => stringify(value))
const array = <T>(item: PostgresType<T>) => valueType<T[]>(`${item.sql}[]`)
const nullable = <T>(type: PostgresType<T>): PostgresType<T | null> => ({
	...type,
	encode: type.encode && (value => (value === null ? null : type.encode!(value))),
})
// A type without a constructor here, like `datemultirange`, by its name in sql.
const custom = <T = unknown>(sql: string) => valueType<T>(sql)
// The rows a function returns: RETURNS TABLE (…).
const table = <C extends Columns>(columns: C): PostgresType<RowOf<C>[]> => ({
	sql: `TABLE (${Object.entries(columns)
		.map(([name, type]) => `${name} ${type.sql}`)
		.join(', ')})`,
	shape: 'rows',
})
// RETURNS void.
const nothing = (): PostgresType<void> => ({ sql: 'void', shape: 'nothing' })

type FunctionDefinition<A extends Columns, R> = {
	// The function's name in the schema.
	name: string
	// The arguments by name, in the order the function declares them.
	args: A
	returns: PostgresType<R>
	language: 'sql' | 'plpgsql'
	// What follows the language: the volatility, PARALLEL SAFE, a SET clause.
	attributes?: string
	// The body, without its dollar quotes.
	body: string
}

type Queryable = Pick<PostgresClient, 'query'>

type CallArgs<A extends Columns> = keyof A extends never ? [] : [args: RowOf<A>]

export type PostgresFunction<A extends Columns = Columns, R = unknown> = {
	// Calls the function through the client, its arguments by name.
	(client: Queryable, ...args: CallArgs<A>): Promise<R>
	// The function's name in the schema, for sql that uses it.
	functionName: string
	// The statement that creates the function.
	sql: string
	[POSTGRES_FUNCTION]: true
}

const BODY_QUOTE = '$awsless$'

const NAME = /^[a-z_][a-z0-9_]*$/

const assertName = (name: string, what: string) => {
	if (!NAME.test(name)) {
		throw new TypeError(`${what} "${name}" isn't a plain sql name: lowercase letters, digits and underscores.`)
	}
}

const createStatement = <A extends Columns, R>(definition: FunctionDefinition<A, R>) => {
	const { name, args, returns, language, attributes, body } = definition

	assertName(name, 'The function name')
	Object.keys(args).forEach(arg => assertName(arg, `The argument of ${name}`))

	if (body.includes(BODY_QUOTE)) {
		throw new TypeError(`The body of ${name} holds ${BODY_QUOTE}, which quotes it.`)
	}

	const signature = Object.entries(args)
		.map(([arg, type]) => `${arg} ${type.sql}`)
		.join(', ')

	return [
		`CREATE OR REPLACE FUNCTION ${name}(${signature}) RETURNS ${returns.sql}`,
		`LANGUAGE ${language}${attributes ? ` ${attributes}` : ''} AS ${BODY_QUOTE}`,
		body.trim(),
		BODY_QUOTE,
	].join('\n')
}

// Defines a function of the stack's schema. The call names its arguments
// (`fn(client, { project_id, external_id })`) and casts each to its type,
// so they travel as parameters; the result is the function's value, its
// rows for a table, or nothing for void.
const define = <A extends Columns, R>(definition: FunctionDefinition<A, R>): PostgresFunction<A, R> => {
	const { name, args, returns } = definition
	const argTypes = Object.entries(args)
	const placeholders = argTypes.map(([arg, type], index) => `${arg} => $${index + 1}::${type.sql}`).join(', ')
	const calls = {
		rows: `SELECT * FROM ${name}(${placeholders})`,
		value: `SELECT ${name}(${placeholders}) AS "result"`,
		// As text: the Data API returns no void.
		nothing: `SELECT ${name}(${placeholders})::text AS "result"`,
	}
	const call = calls[returns.shape]

	const callFunction = async (client: Queryable, ...[values]: CallArgs<A>) => {
		const given = (values ?? {}) as Record<string, unknown>
		const params = argTypes.map(([arg, type]) => {
			const value = given[arg]

			return type.encode && value !== undefined ? type.encode(value) : (value ?? null)
		})
		const rows = await client.query<{ result: unknown }>(call, params)

		if (returns.shape === 'rows') {
			return rows as R
		}

		return (returns.shape === 'nothing' ? undefined : rows[0]?.result) as R
	}

	return Object.assign(callFunction, {
		functionName: name,
		sql: createStatement(definition),
		[POSTGRES_FUNCTION]: true as const,
	})
}

// Whether a module's export is a defined function.
export const isPostgresFunction = (value: unknown): value is PostgresFunction =>
	typeof value === 'function' && (value as Partial<PostgresFunction>)[POSTGRES_FUNCTION] === true

export const postgres = {
	function: { define },
	type: {
		uuid,
		text,
		integer,
		double,
		numeric,
		boolean,
		date,
		timestamp,
		jsonb,
		array,
		nullable,
		custom,
		table,
		nothing,
	},
}
