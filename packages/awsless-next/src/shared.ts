import { $, Output } from '@awsless/formation'

type SharedState = {
	vpc: {
		id: Output<string>
		'security-group-id': Output<string>
		'private-subnets': Output<string>[]
		'public-subnets': Output<string>[]
	}

	'on-log': {
		'consumer-arn': Output<string>
	}

	'on-failure': {
		'queue-arn': Output<string>
	}

	function: {
		'bucket-name': Output<string>
		'repository-name': Output<string>
		'repository-url': Output<string>
		'warm-group-name': Output<string>
	}

	cron: {
		'group-name': Output<string>
	}

	layer: {
		'bucket-name': Output<string>
	}

	instance: {
		'bucket-name': Output<string>
		'cluster-name': Output<string>
		'cluster-arn': Output<string>
	}
}

type SharedEntries = {
	domain: {
		'zone-id': Output<string>
		'mail-arn': Output<string>
		'certificate-arn': Output<string>
		'global-certificate-arn': Output<string>
	}

	topic: {
		arn: Output<string>
	}

	rpc: {
		'schema-table': $.aws.dynamodb.Table
	}

	layer: {
		arn: Output<string>
		packages: string[]
	}

	auth: {
		'user-pool-arn': Output<string>
		'user-pool-id': Output<string>
		'client-id': Output<string>
	}

	rest: {
		id: Output<string>
	}

	image: {
		'distribution-id': Output<string>
		'cache-bucket': Output<string>
	}

	icon: {
		'distribution-id': Output<string>
		'cache-bucket': Output<string>
	}
}

export class SharedData {
	protected data = new Map<string, any>()
	protected entries = new Map<string, any>()

	#get(key: string) {
		if (!this.data.has(key)) {
			throw new TypeError(`Shared data not found: ${key}`)
		}

		return this.data.get(key)
	}

	get<F extends keyof SharedState, K extends keyof SharedState[F]>(feature: F, name: K): SharedState[F][K] {
		const key = `${feature}/${name.toString()}`
		return this.#get(key)
	}

	has<F extends keyof SharedState, K extends keyof SharedState[F]>(feature: F, name: K): boolean {
		const key = `${feature}/${name.toString()}`

		return this.data.has(key)
	}

	set<F extends keyof SharedState, K extends keyof SharedState[F]>(feature: F, name: K, value: SharedState[F][K]) {
		const key = `${feature}/${name.toString()}`

		this.data.set(key, value)
		return this
	}

	entry<F extends keyof SharedEntries, K extends keyof SharedEntries[F]>(
		feature: F,
		name: K,
		entry: number | string
	): SharedEntries[F][K] {
		const key = `${feature}/${name.toString()}/${entry}`
		return this.#get(key)
	}

	add<F extends keyof SharedEntries, K extends keyof SharedEntries[F]>(
		feature: F,
		name: K,
		entry: number | string,
		value: SharedEntries[F][K]
	) {
		const key = `${feature}/${name.toString()}/${entry}`
		this.data.set(key, value)
		return this
	}
}

// export class SharedData {
// 	protected data: Record<string, unknown> = {}

// 	get<T>(key: string) {
// 		return this.data[key] as T
// 	}

// 	set(key: string, value: unknown) {
// 		this.data[key] = value
// 		return this
// 	}
// }
