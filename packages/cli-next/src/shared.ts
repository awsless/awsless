import { aws } from '@terraforge/aws'
import { DataSource, Group, Input, Output, Resource } from '@terraforge/core'
import { Permission } from './feature'
import { Route } from './feature/router/route'
import { BucketLifecycleRule, BucketNotificationRule } from './feature/store/index'

type SharedState = {
	vpc: {
		id: Output<string>
		'security-group-id': Output<string>
		'private-subnets': Output<string>[]
		'public-subnets': Output<string>[]
	}

	'on-error-log': {
		'subscriber-arn': Output<string>
		permission: aws.lambda.Permission
	}

	'on-failure': {
		'bucket-arn': Output<string>
		resources: {
			group: Group
			bucket: aws.s3.Bucket
			queue: aws.sqs.Queue
		}
	}

	store: {
		bucket: {
			name: Output<string>
			arn: Output<string>
			regionalDomainName: Output<string>
			policy: aws.s3.BucketPolicy
			addLifecycleRule: (rule: BucketLifecycleRule) => void
			addNotification: (rule: BucketNotificationRule) => void
			notificationRules: BucketNotificationRule[]
		}
	}

	bundle: {
		main: {
			lambda: aws.lambda.Function
			alias: aws.lambda.Alias
			logGroup: aws.cloudwatch.LogGroup | undefined
			policy: aws.iam.RolePolicy
			addHandler: (handler: {
				routeKey: string
				file: string // The file path of the handler code.
				exportName: string // The name of the exported method within the handler code.
				external?: string[]
				importAsString?: string[]
			}) => void
			addEnv: (name: string, value: Input<string>) => void
			addLayer: (layer: Input<string>) => void
			addPermission: (statement: Permission) => void
		}
	}

	cron: {
		'group-name': Output<string>
		'role-arn': Output<string>
	}

	instance: {
		'cluster-name': Output<string>
		'cluster-arn': Output<string>
	}

	job: {
		'cluster-name': Output<string>
		'cluster-arn': Output<string>
		'security-group-id': Output<string>
		'persistent-storage-file-system-id': Output<string>
	}
}

type SharedEntries = {
	domain: {
		'zone-id': Output<string>
		'certificate-arn': Output<string>
		'global-certificate-arn': Output<string>
	}

	layer: {
		arn: Output<string>
		packages: string[]
	}

	auth: {
		'user-pool-id': Output<string>
	}

	rest: {
		id: Output<string>
		permission: aws.lambda.Permission
	}

	pubsub: {
		'events-topic-arn': Output<string>
	}

	image: {
		'distribution-id': Output<string>
		cache: { bucket: Output<string>; prefix: string }
	}

	icon: {
		'distribution-id': Output<string>
		cache: { bucket: Output<string>; prefix: string }
	}

	router: {
		id: Output<string>
		'preview-id': Output<string>
		addRoutes: (routes: Record<string, Route>, options?: { dependsOn?: Array<Resource | DataSource> }) => void
	}
}

export class SharedData {
	protected data = new Map<string, any>()
	protected entries = new Map<string, Map<string | number, any>>()

	get<F extends keyof SharedState, K extends keyof SharedState[F]>(feature: F, name: K): SharedState[F][K] {
		const key = `${feature}/${name.toString()}`

		if (!this.data.has(key)) {
			throw new TypeError(`Shared data not found: ${key}`)
		}

		return this.data.get(key)
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
		const key = `${feature}/${name.toString()}`
		const entries = this.entries.get(key)
		const value = entries?.get(entry)

		if (typeof value === 'undefined') {
			throw new TypeError(`Shared data not found: ${key}`)
		}

		return value
	}

	add<F extends keyof SharedEntries, K extends keyof SharedEntries[F]>(
		feature: F,
		name: K,
		entry: number | string,
		value: SharedEntries[F][K]
	) {
		const key = `${feature}/${name.toString()}`

		if (!this.entries.has(key)) {
			this.entries.set(key, new Map())
		}

		const entries = this.entries.get(key)!
		entries.set(entry, value)

		return this
	}
}
