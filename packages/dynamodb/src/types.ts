
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
// import { Table } from './table'

export interface Options {
	client?: DynamoDBDocumentClient
}

export interface MutateOptions extends Options {
	condition?: Expression
	return?: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW'
}

export type ExpressionNames = Record<string, string>
export type ExpressionValues = Record<string, unknown>

export type Expression = {
	expression: string
	names: ExpressionNames
	values: ExpressionValues
}

// export type Key = { [ key: string ]: string | number }
export type Value = string | number | boolean | null | undefined | Value[] | { [key:string]:Value }
export type Item = { [ key: string ]: Value | Item | [ Value | Item ] }

// export type ReturnModelType<I, T> = T extends Table<never, never> ? T extends Table<infer X extends Item> ? X : I : I
// export type ReturnKeyType<T> = T extends Table<never, never> ? T['key'] : Key
