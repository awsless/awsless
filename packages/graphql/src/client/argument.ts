export class Arg<Type extends string = string, Value = unknown> {
	constructor(readonly type: Type, readonly value: Value) {}
}

export const $ = <Type extends string, Value extends unknown>(type: Type, value: Value) => {
	return new Arg(type, value)
}
