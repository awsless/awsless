import { IBigFloat } from '../type.js'
import { sub } from './arithmetic.js'
import { isNegative, isZero } from './predicates.js'

export const eq = (comparahend: IBigFloat, comparator: IBigFloat): boolean => {
	return comparahend === comparator || isZero(sub(comparahend, comparator))
}

export const lt = (comparahend: IBigFloat, comparator: IBigFloat): boolean => {
	return isNegative(sub(comparahend, comparator))
}

export const lte = (comparahend: IBigFloat, comparator: IBigFloat): boolean => {
	return lt(comparahend, comparator) || eq(comparahend, comparator)
}

export const gt = (comparahend: IBigFloat, comparator: IBigFloat): boolean => {
	return lt(comparator, comparahend)
}

export const gte = (comparahend: IBigFloat, comparator: IBigFloat): boolean => {
	return gt(comparahend, comparator) || eq(comparahend, comparator)
}

export const cmp = (a: IBigFloat, b: IBigFloat): 1 | -1 | 0 => {
	if (gt(a, b)) {
		return 1
	} else if (lt(a, b)) {
		return -1
	}

	return 0
}

export const min = (...values: IBigFloat[]) => {
	return values.reduce((prev, current) => {
		return lt(prev, current) ? prev : current
	})
}

export const max = (...values: IBigFloat[]) => {
	return values.reduce((prev, current) => {
		return gt(prev, current) ? prev : current
	})
}

export const clamp = (number: IBigFloat, min: IBigFloat, max: IBigFloat) => {
	if (gt(min, max)) {
		throw new TypeError(`min ${min} bound can't be greater then the max ${max} bound`)
	}

	return lt(number, min) ? min : gt(number, max) ? max : number
}
