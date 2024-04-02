

export type SignalCallback<T> = (value:T) => void

export class Signal<T = any> {
	private subs:Set<SignalCallback<T>> = new Set()

	constructor(private value: T) {}

	get() {
		return this.value
	}

	set(value: T) {
		this.value = value
		this.subs.forEach(sub => sub(value))
	}

	update(cb:(value:T) => T) {
		this.set(cb(this.value))
	}

	subscribe(cb:SignalCallback<T>) {
		this.subs.add(cb)
		return () => {
			this.subs.delete(cb)
		}
	}
}

type SignalsTypes<T extends Readonly<Signal[]>> = ({
	[ K in keyof T ]: ReturnType<T[K]['get']>
})

export const derive = <D extends Readonly<Signal[]>, F extends (...deps:SignalsTypes<D>) => any>(deps:D, factory:F): Signal<ReturnType<F>> => {
	const values = deps.map(dep => dep.get()) as SignalsTypes<D>
	const signal = new Signal(factory(...values))

	deps.forEach(dep => {
		dep.subscribe(() => {
			const values = deps.map(dep => dep.get()) as SignalsTypes<D>
			signal.set(factory(...values))
		})
	})

	return signal
}
