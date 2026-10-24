import { badArguments, illegalType } from './errors'
import { sortWithNullsLast, truthy } from './functions'
import {
	compareValues,
	DateTimeValue,
	DateValue,
	isNumeric,
	normalizeNumber,
	toNumber,
	Value,
	valueKey,
} from './values'

export type Accumulator = {
	add: (args: Value[]) => void
	result: () => Value
}

export type AggregateFunction = {
	create: (params: Value[], args: number) => Accumulator
	// The result for no rows at all, when it isn't the accumulator's own.
	min?: number
	max?: number
}

const aggregates = new Map<string, AggregateFunction>()
const caseInsensitive = new Map<string, string>()

const define = (names: string | string[], fn: AggregateFunction, insensitive = false) => {
	for (const name of Array.isArray(names) ? names : [names]) {
		aggregates.set(name, fn)
		if (insensitive) caseInsensitive.set(name.toLowerCase(), name)
	}
}

// The aggregates that answer a number of rows, 0 for none, whatever the
// argument's type.
export const countsRows = (base: string) =>
	/^(count|uniq)/.test(base) || base === 'countDistinct' || base === 'count_distinct'

const lookup = (name: string) => aggregates.get(name) ?? aggregates.get(caseInsensitive.get(name.toLowerCase()) ?? '')

// The aggregate & its combinators: sumIf is sum with the -If combinator,
// uniqArrayIf is uniq with -Array & -If.
export const findAggregate = (
	name: string
): { fn: AggregateFunction; combinators: string[]; base: string } | undefined => {
	const combinators: string[] = []
	let base = name

	while (!lookup(base)) {
		const combinator = [
			'If',
			'Distinct',
			'OrNull',
			'OrDefault',
			'Array',
			'State',
			'Merge',
			'ForEach',
			'Resample',
		].find(suffix => base.endsWith(suffix) && base.length > suffix.length)

		if (!combinator) return
		if (['State', 'Merge', 'ForEach', 'Resample'].includes(combinator)) {
			throw illegalType(`The -${combinator} combinator is not supported by the in-memory ClickHouse`)
		}

		combinators.unshift(combinator)
		base = base.slice(0, -combinator.length)
	}

	return { fn: lookup(base)!, combinators, base }
}

export const isAggregate = (name: string) => {
	try {
		return findAggregate(name) !== undefined
	} catch {
		return true
	}
}

// nullable: an argument is Nullable, which makes the result Nullable &
// NULL when no value came in - except for the counting aggregates.
export const createAccumulator = (
	name: string,
	params: Value[],
	argCount: number,
	distinct: boolean,
	nullable = false
): Accumulator => {
	const found = findAggregate(name)

	if (!found) {
		throw illegalType(`Unknown aggregate function ${name}`)
	}

	const { fn, combinators, base } = found
	const conditional = combinators.includes('If')
	const array = combinators.includes('Array')
	const orNull = combinators.includes('OrNull')
	const orDefault = combinators.includes('OrDefault')
	const nullableResult = nullable && !countsRows(base)
	const valueArgs = conditional ? argCount - 1 : argCount

	if ((fn.min !== undefined && valueArgs < fn.min) || (fn.max !== undefined && valueArgs > fn.max)) {
		throw badArguments(
			`Aggregate function ${name} requires ${fn.min === fn.max ? fn.min : `${fn.min} to ${fn.max ?? 'any'}`} arguments, got ${valueArgs}`
		)
	}

	let inner = fn.create(params, valueArgs)
	// The values the aggregate took in: a NULL argument isn't one, so
	// -OrNull & -OrDefault see an empty input through them.
	let accepted = 0
	const accept = (values: Value[]) => {
		if (valueArgs === 0 || !values.includes(null)) accepted++
		inner.add(values)
	}

	if (distinct || combinators.includes('Distinct')) {
		const seen = new Set<string>()
		const base = inner

		inner = {
			add: args => {
				const key = args.map(valueKey).join('|')
				if (seen.has(key)) return
				seen.add(key)
				base.add(args)
			},
			result: base.result,
		}
	}

	return {
		add: args => {
			let values = args

			if (conditional) {
				const condition = values.at(-1)!
				if (!truthy(condition)) return
				values = values.slice(0, -1)
			}

			if (array) {
				const arrays = values as Value[][]

				for (let i = 0; i < (arrays[0]?.length ?? 0); i++) {
					accept(arrays.map(item => item[i]!))
				}

				return
			}

			accept(values)
		},
		// Nothing accepted answers NULL, which the select turns into the
		// result type's default for -OrDefault.
		result: () => ((orNull || orDefault || nullableResult) && accepted === 0 ? null : inner.result()),
	}
}

// Aggregates skip NULL arguments, except the ones that count rows.
const skipNulls = (accumulator: Accumulator): Accumulator => ({
	add: args => {
		if (args.some(arg => arg === null)) return
		accumulator.add(args)
	},
	result: accumulator.result,
})

const add = (a: Value, b: Value): number | bigint => {
	if (typeof a === 'bigint' || typeof b === 'bigint') {
		if ((typeof a === 'bigint' || Number.isInteger(a)) && (typeof b === 'bigint' || Number.isInteger(b))) {
			return normalizeNumber(BigInt(a as number) + BigInt(b as number))
		}
		return Number(a) + Number(b)
	}

	const sum = toNumber(a) + toNumber(b)

	if (Number.isInteger(a) && Number.isInteger(b) && !Number.isSafeInteger(sum)) {
		return normalizeNumber(BigInt(a as number) + BigInt(b as number))
	}

	return sum
}

define(
	'count',
	{
		create: (_, args) => {
			let count = 0
			return {
				add: values => {
					if (args === 0 || values[0] !== null) count++
				},
				result: () => count,
			}
		},
		max: 1,
	},
	true
)

const sum: AggregateFunction = {
	create: () => {
		let total: number | bigint = 0
		return skipNulls({
			add: ([value]) => {
				if (!isNumeric(value!) && typeof value !== 'boolean')
					throw illegalType(`Illegal type of argument for aggregate function sum`)
				total = add(total, typeof value === 'boolean' ? Number(value) : value!)
			},
			result: () => total,
		})
	},
	min: 1,
	max: 1,
}

define(['sum', 'sumWithOverflow', 'sumKahan'], sum, true)

define(
	'avg',
	{
		create: () => {
			let total = 0
			let count = 0
			return skipNulls({
				add: ([value]) => {
					total += toNumber(value!)
					count++
				},
				result: () => (count === 0 ? NaN : total / count),
			})
		},
		min: 1,
		max: 1,
	},
	true
)

define('avgWeighted', {
	create: () => {
		let total = 0
		let weights = 0
		return skipNulls({
			add: ([value, weight]) => {
				total += toNumber(value!) * toNumber(weight!)
				weights += toNumber(weight!)
			},
			result: () => (weights === 0 ? NaN : total / weights),
		})
	},
	min: 2,
	max: 2,
})

const extreme = (pick: (result: number) => boolean): AggregateFunction => ({
	create: () => {
		let best: Value | undefined
		return skipNulls({
			add: ([value]) => {
				if (best === undefined || pick(compareValues(value!, best))) best = value!
			},
			result: () => best ?? null,
		})
	},
	min: 1,
	max: 1,
})

define(
	'min',
	extreme(result => result < 0),
	true
)
define(
	'max',
	extreme(result => result > 0),
	true
)

define(
	['any', 'first_value', 'any_value'],
	{
		create: () => {
			let value: Value | undefined
			return skipNulls({
				add: ([item]) => {
					if (value === undefined) value = item!
				},
				result: () => value ?? null,
			})
		},
		min: 1,
		max: 1,
	},
	true
)

define(['anyLast', 'last_value'], {
	create: () => {
		let value: Value | undefined
		return skipNulls({ add: ([item]) => void (value = item!), result: () => value ?? null })
	},
	min: 1,
	max: 1,
})

define('anyHeavy', {
	create: () => {
		const counts = new Map<string, { value: Value; count: number }>()
		return skipNulls({
			add: ([value]) => {
				const key = valueKey(value!)
				const entry = counts.get(key) ?? { value: value!, count: 0 }
				entry.count++
				counts.set(key, entry)
			},
			result: () => [...counts.values()].sort((a, b) => b.count - a.count)[0]?.value ?? null,
		})
	},
	min: 1,
	max: 1,
})

const arg = (pick: (result: number) => boolean): AggregateFunction => ({
	create: () => {
		let best: { value: Value; key: Value } | undefined
		return skipNulls({
			add: ([value, key]) => {
				if (best === undefined || pick(compareValues(key!, best.key))) best = { value: value!, key: key! }
			},
			result: () => best?.value ?? null,
		})
	},
	min: 2,
	max: 2,
})

define(
	'argMin',
	arg(result => result < 0)
)
define(
	'argMax',
	arg(result => result > 0)
)

// uniq & friends estimate in ClickHouse; small sets come out exact there
// too, so an exact count matches what apps see in practice.
define([
	'uniq',
	'uniqExact',
	'uniqCombined',
	'uniqCombined64',
	'uniqHLL12',
	'uniqTheta',
	'countDistinct',
	'count_distinct',
], {
	create: () => {
		const seen = new Set<string>()
		return skipNulls({
			add: values => void seen.add(values.length === 1 ? valueKey(values[0]!) : values.map(valueKey).join('|')),
			result: () => seen.size,
		})
	},
	min: 1,
})

define(
	['groupArray', 'array_agg', 'groupArrayLast'],
	{
		create: params => {
			const limit = params[0] === undefined ? Infinity : toNumber(params[0])
			const items: Value[] = []
			return skipNulls({
				add: ([value]) => {
					if (items.length < limit) items.push(value!)
				},
				result: () => items,
			})
		},
		min: 1,
		max: 1,
	},
	true
)

define(['groupUniqArray', 'groupArrayDistinct'], {
	create: params => {
		const limit = params[0] === undefined ? Infinity : toNumber(params[0])
		const items = new Map<string, Value>()
		return skipNulls({
			add: ([value]) => {
				const key = valueKey(value!)
				if (!items.has(key) && items.size < limit) items.set(key, value!)
			},
			result: () => [...items.values()],
		})
	},
	min: 1,
	max: 1,
})

define('groupArraySorted', {
	create: params => {
		const limit = params[0] === undefined ? Infinity : toNumber(params[0])
		const items: Value[] = []
		return skipNulls({
			add: ([value]) => void items.push(value!),
			result: () => items.sort(sortWithNullsLast).slice(0, limit),
		})
	},
	min: 1,
	max: 1,
})

const bitwise = (op: (a: bigint, b: bigint) => bigint, initial: bigint): AggregateFunction => ({
	create: () => {
		let result = initial
		return skipNulls({
			add: ([value]) => void (result = op(result, BigInt(Math.trunc(toNumber(value!))))),
			result: () => normalizeNumber(result),
		})
	},
	min: 1,
	max: 1,
})

define(
	'groupBitOr',
	bitwise((a, b) => a | b, 0n)
)
define(
	'groupBitAnd',
	bitwise((a, b) => a & b, -1n)
)
define(
	'groupBitXor',
	bitwise((a, b) => a ^ b, 0n)
)

// The interpolated quantile ClickHouse's reservoir answers while it holds
// every value.
const interpolate = (sorted: number[], level: number) => {
	if (sorted.length === 0) return NaN
	const position = level * (sorted.length - 1)
	const lower = Math.floor(position)
	const upper = Math.ceil(position)
	return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (position - lower)
}

// quantileExact picks a stored value instead of interpolating.
const exact = (sorted: Value[], level: number): Value => {
	if (sorted.length === 0) return 0
	return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(level * sorted.length)))]!
}

const quantiles = (exactly: boolean, multiple: boolean): AggregateFunction => ({
	create: params => {
		const levels = params.length === 0 ? [0.5] : params.map(toNumber)
		const values: Value[] = []

		return skipNulls({
			add: ([value]) => void values.push(value!),
			result: () => {
				if (exactly || values.some(value => value instanceof DateTimeValue || value instanceof DateValue)) {
					const sorted = [...values].sort(compareValues)
					const answers = levels.map(level => exact(sorted, level))
					return multiple ? answers : answers[0]!
				}

				const sorted = values.map(toNumber).sort((a, b) => a - b)
				const answers = levels.map(level => interpolate(sorted, level))
				return multiple ? answers : answers[0]!
			},
		})
	},
	min: 1,
	max: 1,
})

define([
	'quantile',
	'median',
	'quantileTDigest',
	'medianTDigest',
	'quantileTiming',
	'medianTiming',
	'quantileReservoirSampling',
	'quantileDeterministic',
	'quantileBFloat16',
	'quantileDD',
], quantiles(false, false))
define([
	'quantiles',
	'quantilesTDigest',
	'quantilesTiming',
	'quantilesReservoirSampling',
	'quantilesDeterministic',
	'quantilesBFloat16',
	'quantilesDD',
], quantiles(false, true))
define(['quantileExact', 'medianExact', 'quantileExactLow', 'medianExactLow'], quantiles(true, false))
define(['quantilesExact', 'quantilesExactLow'], quantiles(true, true))

define(['quantileExactHigh', 'medianExactHigh'], {
	create: params => {
		const level = params[0] === undefined ? 0.5 : toNumber(params[0])
		const values: Value[] = []
		return skipNulls({
			add: ([value]) => void values.push(value!),
			result: () => {
				const sorted = [...values].sort(compareValues)
				if (sorted.length === 0) return 0
				return sorted[
					Math.min(
						sorted.length - 1,
						Math.ceil(level * sorted.length) -
							(level * sorted.length === Math.floor(level * sorted.length) && level !== 0 ? 0 : 1)
					)
				]!
			},
		})
	},
	min: 1,
	max: 1,
})

const moments = (fn: (values: number[]) => number): AggregateFunction => ({
	create: () => {
		const values: number[] = []
		return skipNulls({ add: ([value]) => void values.push(toNumber(value!)), result: () => fn(values) })
	},
	min: 1,
	max: 1,
})

const variance = (values: number[], sample: boolean) => {
	const n = values.length
	if (n === 0 || (sample && n === 1)) return sample ? Infinity : NaN
	const mean = values.reduce((sum, value) => sum + value, 0) / n
	return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (sample ? n - 1 : n)
}

define(
	['varPop', 'VAR_POP'],
	moments(values => variance(values, false)),
	true
)
define(
	['varSamp', 'VAR_SAMP'],
	moments(values => variance(values, true)),
	true
)
define(
	['stddevPop', 'STDDEV_POP', 'std'],
	moments(values => Math.sqrt(variance(values, false))),
	true
)
define(
	['stddevSamp', 'STDDEV_SAMP'],
	moments(values => Math.sqrt(variance(values, true))),
	true
)

define(['corr'], {
	create: () => {
		const xs: number[] = []
		const ys: number[] = []
		return skipNulls({
			add: ([x, y]) => {
				xs.push(toNumber(x!))
				ys.push(toNumber(y!))
			},
			result: () => {
				const n = xs.length
				const mx = xs.reduce((a, b) => a + b, 0) / n
				const my = ys.reduce((a, b) => a + b, 0) / n
				let sxy = 0
				let sxx = 0
				let syy = 0
				for (let i = 0; i < n; i++) {
					sxy += (xs[i]! - mx) * (ys[i]! - my)
					sxx += (xs[i]! - mx) ** 2
					syy += (ys[i]! - my) ** 2
				}
				return sxy / Math.sqrt(sxx * syy)
			},
		})
	},
	min: 2,
	max: 2,
})

// Most frequent first; ties keep the order they were first seen in.
define(['topK', 'topKWeighted'], {
	create: (params, args) => {
		const limit = params[0] === undefined ? 10 : toNumber(params[0])
		const counts = new Map<string, { value: Value; count: number; order: number }>()

		return skipNulls({
			add: ([value, weight]) => {
				const key = valueKey(value!)
				const entry = counts.get(key) ?? { value: value!, count: 0, order: counts.size }
				entry.count += args === 2 ? toNumber(weight!) : 1
				counts.set(key, entry)
			},
			result: () =>
				[...counts.values()]
					.sort((a, b) => b.count - a.count || a.order - b.order)
					.slice(0, limit)
					.map(entry => entry.value),
		})
	},
	min: 1,
	max: 2,
})

define('sumMap', {
	create: () => {
		const totals = new Map<string, { key: Value; value: number | bigint }>()
		return {
			add: ([keys, values]) => {
				;(keys as Value[]).forEach((key, index) => {
					const id = valueKey(key)
					const entry = totals.get(id) ?? { key, value: 0 }
					entry.value = add(entry.value, (values as Value[])[index] ?? 0)
					totals.set(id, entry)
				})
			},
			result: () => {
				const entries = [...totals.values()].sort((a, b) => compareValues(a.key, b.key))
				return [entries.map(entry => entry.key), entries.map(entry => entry.value)] as Value
			},
		}
	},
	min: 2,
	max: 2,
})

// How far each user got through a series of steps, each within the window
// of the first one - ClickHouse's own algorithm, with its strict modes:
// strict_order stops at an event of another step, strict_deduplication at
// a step seen twice, strict_increase wants later timestamps, strict_once
// counts a row for one step only.
define('windowFunnel', {
	create: params => {
		const window = toNumber(params[0] ?? 0)
		const modes = new Set(params.slice(1).map(mode => String(mode)))
		const strictOrder = modes.has('strict_order')
		const strictDeduplication = modes.has('strict_deduplication')
		const strictIncrease = modes.has('strict_increase')
		const strictOnce = modes.has('strict_once')
		const events: { time: number; step: number }[] = []
		let steps = 0

		return {
			add: ([time, ...conditions]) => {
				steps = conditions.length
				const seconds =
					time instanceof DateTimeValue
						? time.ms / 1000
						: time instanceof DateValue
							? time.days * 86400
							: toNumber(time!)
				let matched = false

				for (let step = 0; step < conditions.length; step++) {
					if (!truthy(conditions[step]!)) continue
					events.push({ time: seconds, step })
					matched = true
					if (strictOnce) break
				}

				// An event of no step still breaks a chain in strict order.
				if (strictOrder && !matched) events.push({ time: seconds, step: -1 })
			},
			result: () => {
				const sorted = [...events].sort((a, b) => a.time - b.time || a.step - b.step)
				const reached: ({ start: number; last: number } | undefined)[] = Array.from(
					{ length: steps },
					() => undefined
				)
				let started = false

				for (const { time, step } of sorted) {
					if (strictOrder && step === -1) {
						if (started) break
						continue
					}

					if (step === 0) {
						reached[0] = { start: time, last: time }
						started = true
					} else if (strictDeduplication && reached[step]) {
						return step + 1
					} else if (strictOrder && started && !reached[step - 1]) {
						return reached.findIndex(level => !level)
					} else if (reached[step - 1]) {
						const previous = reached[step - 1]!
						const inWindow = time <= previous.start + window && (!strictIncrease || previous.last < time)

						if (inWindow) {
							reached[step] = { start: previous.start, last: time }
							if (step + 1 === steps) return steps
						}
					}
				}

				for (let level = steps; level > 0; level--) {
					if (reached[level - 1]) return level
				}

				return 0
			},
		}
	},
	min: 2,
})

// For each later condition, whether it held for rows where the first one did.
define('retention', {
	create: (_, args) => {
		const seen = Array.from({ length: args }, () => false)
		return {
			add: conditions => {
				conditions.forEach((condition, index) => {
					if (truthy(condition)) seen[index] = true
				})
			},
			result: () => seen.map((value, index) => (index === 0 ? Number(value) : Number(seen[0] && value))),
		}
	},
	min: 1,
})

define(['boundingRatio'], {
	create: () => {
		let first: [number, number] | undefined
		let last: [number, number] | undefined
		return skipNulls({
			add: ([x, y]) => {
				const point: [number, number] = [toNumber(x!), toNumber(y!)]
				if (!first || point[0] < first[0]) first = point
				if (!last || point[0] > last[0]) last = point
			},
			result: () => (first && last && last[0] !== first[0] ? (last[1] - first[1]) / (last[0] - first[0]) : NaN),
		})
	},
	min: 2,
	max: 2,
})

export const aggregateNames = () => [...aggregates.keys()]
