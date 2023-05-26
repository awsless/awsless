
import { BigFloat } from "@awsless/big-float"
import { IDGenerator } from "../helper/id-generator"
import { AttributeTypes } from "../structs/struct"
import { AnyTableDefinition } from "../table"
import { InferPath, InferSetValue, InferValue } from "../types/infer"
import { build, Chain, chainData, ChainItems, ChainValue, merge as m } from "../helper/chainable"

export class Condition<T extends AnyTableDefinition> extends Chain<T> {
	where<P extends InferPath<T>>(...path:P) {
		return new Where(m(this), path)
	}

	extend<R extends Combine<T> | Condition<T> | void>(fn:(exp:Condition<T>) => R): R {
		return fn(this)
	}
}

class Where<T extends AnyTableDefinition, P extends InferPath<T>> extends Chain<T> {
	constructor(query:ChainItems<T>, private path:P) {
		super(query)
	}

	get not() {
		return new Where<T, P>(m(this, 'NOT'), this.path)
	}

	get exists() {
		return new Combine<T>(m(this, 'attribute_exists(', { p:this.path }, ')'))
	}

	get size() {
		return new Size<T, P>(m(this), this.path)
	}

	private compare(comparator:string, v:InferValue<T, P>) {
		return new Combine<T>(m(this, '(', { p:this.path }, comparator, { v, p: this.path }, ')'))
	}

	private fn(fnName:string, v:ChainValue<T>) {
		return new Combine<T>(m(this, `${fnName}(`, { p:this.path }, ',', v, ')'))
	}

	eq(value:InferValue<T, P>) { return this.compare('=', value) }
	nq(value:InferValue<T, P>) { return this.compare('<>', value) }
	gt(value:InferValue<T, P>) { return this.compare('>', value) }
	gte(value:InferValue<T, P>) { return this.compare('>=', value) }
	lt(value:InferValue<T, P>) { return this.compare('<', value) }
	lte(value:InferValue<T, P>) { return this.compare('<=', value) }

	between(min:InferValue<T, P>, max:InferValue<T, P>) {
		return new Combine<T>(m(this, '(',
			{ p:this.path }, 'BETWEEN', { v: min, p: this.path }, 'AND', { v:max, p: this.path },
		')'))
	}

	in(values:InferValue<T, P>[]) {
		return new Combine<T>(m(this,
			'(', { p:this.path }, 'IN (',
			...values
				.map(v => ({v, p: this.path }))
				.map((v, i) => i === 0 ? v : [',', v])
				.flat(),
			'))'
		))
	}

	attributeType(value:AttributeTypes) {
		return this.fn('attribute_type', { v:{ S:value } })
	}

	beginsWith(value:string) {
		return this.fn('begins_with', { v:{ S:value } })
	}

	contains(value:InferSetValue<T, P>) {
		return this.fn('contains', { v: value, p: [ ...this.path, 0 ] })
	}
}

class Size<T extends AnyTableDefinition, P extends InferPath<T>> extends Chain<T> {
	constructor(query:ChainItems<T>, private path:P) {
		super(query)
	}

	private compare(comparator:string, num:number | bigint | BigFloat) {
		return new Combine<T>(m(this, '(', 'size(', { p:this.path }, ')', comparator, { v: { N: String(num) } }, ')'))
	}

	eq(value:number | bigint | BigFloat) { return this.compare('=', value) }
	nq(value:number | bigint | BigFloat) { return this.compare('<>', value) }
	gt(value:number | bigint | BigFloat) { return this.compare('>', value) }
	gte(value:number | bigint | BigFloat) { return this.compare('>=', value) }
	lt(value:number | bigint | BigFloat) { return this.compare('<', value) }
	lte(value:number | bigint | BigFloat) { return this.compare('<=', value) }

	between(min:number | bigint | BigFloat, max:number | bigint | BigFloat) {
		return new Combine<T>(m(this, '(', 'size(',
			{ p:this.path }, ')', 'BETWEEN', { v: { N: String(min) } }, 'AND', { v: { N: String(max) } },
		')'))
	}
}

export class Combine<T extends AnyTableDefinition> extends Chain<T> {
	get and() {
		return new Condition<T>(m(this, 'AND'))
	}

	get or() {
		return new Condition<T>(m(this, 'OR'))
	}
}

export const conditionExpression = <T extends AnyTableDefinition>(
	options:{ condition?: (exp:Condition<T>) => Combine<T> },
	gen:IDGenerator<T>,
) => {
	if(options.condition) {
		const condition = options.condition(new Condition<T>([]))
		const query = build(chainData(condition), gen).join(' ')

		return query
	}

	return
}
