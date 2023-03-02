import { combine, fn } from "./__expression";
import { ExpressionBuilder } from "./__types";

export const and = <L extends ExpressionBuilder, R extends ExpressionBuilder>(left:L, right:R) => {
	return combine(left, 'AND', right)
}

export const or = <L extends ExpressionBuilder, R extends ExpressionBuilder>(left:L, right:R) => {
	return combine(left, 'OR', right)
}

export const eq = <L extends ExpressionBuilder, R extends ExpressionBuilder>(left:L, right:R) => {
	return combine(left, '=', right)
}

export const nq = <L extends ExpressionBuilder, R extends ExpressionBuilder>(left:L, right:R) => {
	return combine(left, '<>', right)
}

export const gt = <L extends ExpressionBuilder, R extends ExpressionBuilder>(left:L, right:R) => {
	return combine(left, '>', right)
}

export const gte = <L extends ExpressionBuilder, R extends ExpressionBuilder>(left:L, right:R) => {
	return combine(left, '>=', right)
}

export const lt = <L extends ExpressionBuilder, R extends ExpressionBuilder>(left:L, right:R) => {
	return combine(left, '<', right)
}

export const lte = <L extends ExpressionBuilder, R extends ExpressionBuilder>(left:L, right:R) => {
	return combine(left, '<=', right)
}

// export const in = () => {

// }

// export const not = <T extends ExpressionBuilder>(exp:T) => {
// 	return combine('NOT', 'BETWEEN', combine(from, 'AND', to))
// }

export const between = <N extends ExpressionBuilder, F extends ExpressionBuilder, T extends ExpressionBuilder>(name:N, from:F, to:T) => {
	return combine(name, 'BETWEEN', combine(from, 'AND', to))
}

export const attributeExists = <T extends ExpressionBuilder>(exp:T) => {
	return fn('attribute_exists', exp)
}

export const attributeNotExists = <T extends ExpressionBuilder>(exp:T) => {
	return fn('attribute_not_exists', exp)
}

export const attributeType = <T extends ExpressionBuilder>(exp:T) => {
	return fn('attribute_type', exp)
}

export const beginsWith = <T extends ExpressionBuilder>(exp:T) => {
	return fn('begins_with', exp)
}

export const contains = <T extends ExpressionBuilder>(exp:T) => {
	return fn('contains', exp)
}

export const size = <T extends ExpressionBuilder>(exp:T) => {
	return fn('size', exp)
}
