import { createHash } from 'crypto'
import { Input, unwrap } from './output'

type Value = unknown

export class Hide<T extends unknown> {
	constructor(readonly value: T) {}

	get hash() {
		return createHash('sha256').update(JSON.stringify(this.value)).digest('hex')
	}

	toJSON() {
		// Hide the value in the appstate
		return {
			hash: this.hash,
		}
	}
}

export const hide = <T extends Input<Value>>(value: T) => {
	return new Hide(unwrap(value))
}
