import { AnySchema, BaseSchema, createSchema, MarshallInputTypes } from './schema'

type TuplePaths<Entries extends AnySchema[]> = [number] | [number, ...Entries[number]['PATHS']]
type TupleOptPaths<Entries extends AnySchema[]> = [number] | [number, ...Entries[number]['OPT_PATHS']]
type TupleRestPaths<L extends AnySchema> = [number] | [number, ...L['PATHS']]
type TupleRestOptPaths<L extends AnySchema> = [number] | [number, ...L['OPT_PATHS']]

type RequiredSchema = BaseSchema<
	//
	any,
	any,
	any,
	Array<string | number>,
	Array<string | number>,
	false
>

type TupleInput<Entries extends RequiredSchema[]> = {
	-readonly [Key in keyof Entries]: Entries[Key]['INPUT']
}

type TupleOuput<Entries extends RequiredSchema[]> = {
	-readonly [Key in keyof Entries]: Entries[Key]['OUTPUT']
}

export const tuple = <
	const Entries extends RequiredSchema[],
	const Rest extends RequiredSchema | undefined = undefined,
>(
	entries: Entries,
	rest?: Rest
) =>
	createSchema<
		'L',
		// TupleInput<Entries>,
		// TupleOuput<Entries>,
		// TuplePaths<Entries>,
		// TupleOptPaths<Entries>
		Rest extends RequiredSchema ? [...TupleInput<Entries>, ...Rest['INPUT'][]] : TupleInput<Entries>,
		Rest extends RequiredSchema ? [...TupleOuput<Entries>, ...Rest['OUTPUT'][]] : TupleOuput<Entries>,
		Rest extends RequiredSchema ? TuplePaths<Entries> | TupleRestPaths<Rest> : TuplePaths<Entries>,
		Rest extends RequiredSchema ? TupleOptPaths<Entries> | TupleRestOptPaths<Rest> : TupleOptPaths<Entries>
	>({
		type: 'L',
		encode: value => value.map((item, i) => (entries[i] ?? rest)?.marshall(item) as MarshallInputTypes),
		decode: value => value.map((item, i) => (entries[i] ?? rest)?.unmarshall(item)) as any,
		walk(path, ...restPath) {
			const schema = entries[path as number] || rest
			return restPath.length ? schema?.walk?.(...restPath) : schema
		},
	})
