import { toDays, toHours, toMinutes } from '@awsless/duration'
import { aws } from '@terraforge/aws'
import { clickhouse } from '@terraforge/clickhouse'
import { Group } from '@terraforge/core'
import { getClickHouseTableName } from 'awsless'
import { defineFeature } from '../../feature.js'
import { ClickHouseBackupBucket, ClickHousePassword, ClickHouseTable } from '../../formation/clickhouse.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { shortId } from '../../util/id.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { clickhouseOnDev } from './dev.js'
import { hasClickHouseTables } from './util.js'

const typeGenCode = `
import { AnyObjectSchema, Table } from '@awsless/clickhouse'

type ClickHouseTable = {
	readonly name: string
	readonly endpoint: string
	readonly define: <S extends AnyObjectSchema>(schema: S) => Table<string, S>
}
`

// One ClickHouse organisation serves every AWS account & stage an app
// deploys to, so the service name carries both; an app without stages
// leaves the stage out.
export const formatServiceName = (appName: string, accountId: string, stage?: string) => {
	const parts = stage ? [appName, stage] : [appName]

	return `${parts.join('-')}-${shortId([...parts, accountId].join('--'))}`
}

// The lambdas & the deploy read the generated password from here, kept
// apart from the config parameters so it never shows up as a config. Two
// stages in one account each get their own.
export const formatPasswordParameter = (appName: string, stage?: string) => {
	return `/.awsless-clickhouse/${stage ? `${appName}/${stage}` : appName}/password`
}

export const clickhouseFeature = defineFeature({
	name: 'clickhouse',
	onDev: clickhouseOnDev,
	async onTypeGen(ctx) {
		const gen = new TypeFile('awsless')
		const resources = new TypeObject(1)

		for (const stack of ctx.stackConfigs) {
			const list = new TypeObject(2)

			for (const id of Object.keys(stack.clickhouse ?? {})) {
				list.addKey(id, 'ClickHouseTable')
			}

			resources.addType(stack.name, list)
		}

		gen.addCode(typeGenCode)
		gen.addInterface('ClickHouseResources', resources)

		await ctx.write('clickhouse.d.ts', gen, true)
	},
	onApp(ctx) {
		// Every table in the app shares one ClickHouse Cloud service, like
		// every search index shares one collection. The service only
		// exists when at least one stack declares a table.
		if (!hasClickHouseTables(ctx.stackConfigs)) {
			return
		}

		const group = new Group(ctx.base, 'clickhouse', 'main')
		const props = ctx.appConfig.clickhouse
		const parameter = formatPasswordParameter(ctx.app.name, ctx.appConfig.stage)
		const retainOnDelete = ctx.appConfig.removal === 'retain'

		const password = new ClickHousePassword(group, 'password', { parameter }, { retainOnDelete })

		const service = new clickhouse.Service(
			group,
			'service',
			{
				name: formatServiceName(ctx.app.name, ctx.accountId, ctx.appConfig.stage),
				cloudProvider: 'aws',
				region: props.region ?? ctx.appConfig.region,
				idleScaling: props.idle,
				idleTimeoutMinutes: props.idle ? toMinutes(props.idleTimeout) : undefined,
				minReplicaMemoryGb: props.memory.min,
				maxReplicaMemoryGb: props.memory.max,
				numReplicas: props.replicas,
				ipAccess: props.ipAccess.map(source => ({ source, description: 'awsless' })),
				passwordHash: password.hash,
				releaseChannel: props.releaseChannel,
				backupConfiguration: props.backup?.every
					? { backupPeriodInHours: toHours(props.backup.every) }
					: undefined,
			},
			{ retainOnDelete }
		)

		if (props.backup) {
			const bucket = ctx.shared.get('asset', 'bucket')

			// ClickHouse Cloud assumes this role from the service's own role,
			// with the service's id as the external id, so no other service
			// that shares that role can write here.
			const role = new aws.iam.Role(group, 'backup-role', {
				name: formatGlobalResourceName({
					appName: ctx.app.name,
					resourceType: 'clickhouse',
					resourceName: 'backup',
				}),
				description: `${ctx.app.name} ClickHouse backups`,
				assumeRolePolicy: $combine(service.iamRole, service.id).pipe(([principal, serviceId]) =>
					JSON.stringify({
						Version: '2012-10-17',
						Statement: [
							{
								Effect: 'Allow',
								Action: 'sts:AssumeRole',
								Principal: { AWS: principal },
								Condition: { StringEquals: { 'sts:ExternalId': serviceId } },
							},
						],
					})
				),
				inlinePolicy: [
					{
						name: 'Backups',
						// What a backup needs, as the ClickHouse Cloud docs list it, kept
						// to the bucket's clickhouse folder: it only ever deletes its own
						// lock files.
						policy: bucket.arn.pipe(arn =>
							JSON.stringify({
								Version: '2012-10-17',
								Statement: [
									{ Effect: 'Allow', Action: ['s3:GetBucketLocation'], Resource: [arn] },
									{
										Effect: 'Allow',
										Action: ['s3:ListBucket'],
										Resource: [arn],
										Condition: { StringLike: { 's3:prefix': ['clickhouse', 'clickhouse/*'] } },
									},
									{ Effect: 'Allow', Action: ['s3:Get*', 's3:List*', 's3:PutObject'], Resource: [`${arn}/clickhouse/*`] },
									{ Effect: 'Allow', Action: ['s3:DeleteObject'], Resource: [`${arn}/clickhouse/*/.lock`] },
								],
							})
						),
					},
				],
			})

			new ClickHouseBackupBucket(
				group,
				'backup-bucket',
				{
					serviceId: service.id,
					bucketPath: bucket.name.pipe(name => `https://${name}.s3.amazonaws.com/clickhouse`),
					roleArn: role.arn,
					externalId: service.id,
				},
				{ retainOnDelete }
			)

			// ClickHouse Cloud never removes what it wrote, so S3 does.
			bucket.addLifecycleRule({
				id: 'expire-clickhouse-backups',
				enabled: true,
				prefix: 'clickhouse/',
				expiration: { days: toDays(props.backup.retention) },
				noncurrentVersionExpiration: { days: 1 },
			})
		}

		const endpoint = service.endpoints.pipe(endpoints => {
			return `https://${endpoints.https.host}:${endpoints.https.port}`
		})

		ctx.addEnv('CLICKHOUSE_ENDPOINT', endpoint)
		ctx.addEnv('CLICKHOUSE_PASSWORD_PARAMETER', parameter)

		// The runtime reads it through GetParameters, the deploy through GetParameter.
		ctx.addPermission({
			actions: ['ssm:GetParameter', 'ssm:GetParameters'],
			resources: [`arn:aws:ssm:${ctx.appConfig.region}:${ctx.accountId}:parameter${parameter}`],
		})

		ctx.shared.set('clickhouse', 'endpoint', endpoint)
		ctx.shared.set('clickhouse', 'parameter', parameter)
	},
	onStack(ctx) {
		const tables = Object.entries(ctx.stackConfig.clickhouse ?? {})

		if (tables.length === 0) {
			return
		}

		const endpoint = ctx.shared.get('clickhouse', 'endpoint')
		const parameter = ctx.shared.get('clickhouse', 'parameter')

		for (const [id, props] of tables) {
			const group = new Group(ctx.stack, 'clickhouse', id)

			new ClickHouseTable(
				group,
				'table',
				{
					endpoint,
					parameter,
					name: getClickHouseTableName(ctx.stackConfig.name, id),
					definition: JSON.stringify(props),
				},
				{
					retainOnDelete: ctx.appConfig.removal === 'retain',
					replaceOnChanges: ['endpoint', 'name'],
				}
			)
		}
	},
})
