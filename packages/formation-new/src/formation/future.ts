const IDLE = 0
const PENDING = 1
const RESOLVED = 2
const REJECTED = 3

export class Future<T = unknown> {
	protected listeners = new Set<{
		resolve: (data: T) => void
		reject?: (error: unknown) => void
	}>()

	protected status: 0 | 1 | 2 | 3 = IDLE
	protected data?: T
	protected error?: unknown

	constructor(protected callback: (resolve: (data: T) => void, reject: (error: unknown) => void) => void) {}

	get [Symbol.toStringTag]() {
		switch (this.status) {
			case IDLE:
				return `<idle>`

			case PENDING:
				return `<pending>`

			case RESOLVED:
				return `${this.data}`

			case REJECTED:
				return `<rejected> ${this.error}`
		}
	}

	pipe<N>(cb: (value: T) => N) {
		return new Future<Awaited<N>>((resolve, reject) => {
			this.then(value => {
				Promise.resolve(cb(value))
					.then(value => {
						resolve(value)
					})
					.catch(reject)
			}, reject)
		})
	}

	then(resolve: (data: T) => void, reject?: (error: unknown) => void) {
		if (this.status === RESOLVED) {
			resolve(this.data!)
		} else if (this.status === REJECTED) {
			reject?.(this.error)
		} else {
			this.listeners.add({ resolve, reject })

			if (this.status === IDLE) {
				this.status = PENDING

				this.callback(
					data => {
						if (this.status === PENDING) {
							this.status = RESOLVED
							this.data = data

							this.listeners.forEach(({ resolve }) => resolve(data))
							this.listeners.clear()
						}
					},
					error => {
						if (this.status === PENDING) {
							this.status = REJECTED
							this.error = error

							this.listeners.forEach(({ reject }) => reject?.(error))
							this.listeners.clear()
						}
					}
				)
			}
		}
	}
}

// export class Future<T = unknown> {
//   constructor(
//     protected callback: (
//       resolve: (data: T) => void,
//       reject: (error: unknown) => void
//     ) => void
//   ) {}

//   then(resolve: (data: T) => void, reject: (error: unknown) => void) {
//     this.callback(resolve, reject);
//   }
// }
