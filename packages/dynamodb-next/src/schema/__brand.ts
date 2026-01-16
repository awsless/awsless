import {
	BinaryExpression,
	BooleanExpression,
	NumberExpression,
	SetExpression,
	StringExpression,
} from '../expression/types'
import { AnySchema, BaseSchema } from './schema'

export declare const BrandSymbol: unique symbol

export type BrandName = string | number | symbol

export type Brand<T, TName extends BrandName> = T & {
	[BrandSymbol]: { [TValue in TName]: TValue }
}

export type BrandSchema<S extends AnySchema, B extends BrandName> = BaseSchema<
	S['type'],
	Brand<S[symbol]['Type'], B>,
	'S' extends S['type']
		? StringExpression<Brand<S[symbol]['Type'], B>>
		: 'N' extends S['type']
			? NumberExpression<Brand<S[symbol]['Type'], B>>
			: 'BOOL' extends S['type']
				? BooleanExpression<Brand<S[symbol]['Type'], B>>
				: 'B' extends S['type']
					? BinaryExpression<Brand<S[symbol]['Type'], B>>
					: 'SS' | 'NS' | 'BN' extends S['type']
						? SetExpression<S['type'], Brand<S[symbol]['Type'], B>>
						: S[symbol]['Expression']
>

export const brand = <S extends AnySchema, B extends BrandName>(schema: S, _brand: B): BrandSchema<S, B> => {
	return schema
}

export const toBranded = <T, B extends BrandName>(value: T, _brand: B): Brand<T, B> => {
	return value as Brand<T, B>
}
