import { toDays, toSeconds } from '@awsless/duration'
import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { getPostgresSchemaName } from 'awsless'
import { FileError } from '../../error.js'
import { defineFeature } from '../../feature.js'
import { PostgresSchemaResource } from '../../formation/postgres.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { postgresOnDev } from './dev.js'
import { readFunctionFiles, RESERVED_DATABASES } from './util.js'

const typeGenCode = `
type PostgresDatabase = {
	readonly schema: string
	readonly query: <Row = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<Row[]>
}
`

// The Aurora PostgreSQL version of an app that names none. The newest 17
// that Aurora lists, the major version the local Postgres runs. From 17.4
// the Data API works on it, and from 16.3 scaling to zero.
// https://docs.aws.amazon.com/AmazonRDS/latest/AuroraPostgreSQLReleaseNotes/AuroraPostgreSQL.Updates.html
export const POSTGRES_VERSION = '17.11'

export const postgresFeature = defineFeature({
	name: 'postgres',
	onDev: postgresOnDev,
	async onTypeGen(ctx) {
		const gen = new TypeFile('awsless')
		const resources = new TypeObject(1)

		for (const stack of ctx.stackConfigs) {
			if (stack.postgres) {
				resources.addType(stack.name, 'PostgresDatabase')
			}
		}

		gen.addCode(typeGenCode)
		gen.addInterface('PostgresResources', resources)

		await ctx.write('postgres.d.ts', gen, true)
	},
	onValidate(ctx) {
		for (const stack of ctx.stackConfigs) {
			const database = getPostgresSchemaName(stack.name)

			// Deployed, the stack's schema lives in a database of this name.
			if (stack.postgres && RESERVED_DATABASES.includes(database)) {
				throw new FileError(
					stack.file,
					`A stack called "${stack.name}" can't have Postgres tables: its database would be "${database}", which Postgres keeps for itself. Give the stack another name.`
				)
			}
		}
	},
	onApp(ctx) {
		// Every stack's schema shares one Aurora Serverless cluster, like
		// every ClickHouse table shares one service. The cluster only exists
		// when at least one stack declares Postgres tables.
		if (!ctx.stackConfigs.some(stack => stack.postgres)) {
			return
		}

		const group = new Group(ctx.base, 'postgres', 'main')
		const props = ctx.appConfig.postgres
		const retainOnDelete = ctx.appConfig.removal === 'retain'
		const version = props.version ?? POSTGRES_VERSION

		// Hyphens only: RDS takes no "--" in a name.
		const name = formatGlobalResourceName({
			appName: ctx.app.name,
			resourceType: 'postgres',
			resourceName: 'main',
			seperator: '-',
		})

		// No rule in or out. Nothing connects to the database: every query,
		// from the functions & from a deploy, goes through the RDS Data API.
		// A cluster that stays keeps the group & subnets it sits in.
		const securityGroup = new aws.security.Group(
			group,
			'security',
			{
				name,
				vpcId: ctx.shared.get('vpc', 'id'),
				description: `${ctx.app.name} Postgres: no way in, queries go through the Data API`,
			},
			{ retainOnDelete }
		)

		const subnetGroup = new aws.db.SubnetGroup(
			group,
			'subnets',
			{
				name,
				description: `${ctx.app.name} Postgres`,
				subnetIds: ctx.shared.get('vpc', 'private-subnets'),
			},
			{ retainOnDelete }
		)

		const cluster = new aws.rds.Cluster(
			group,
			'cluster',
			{
				clusterIdentifier: name,
				engine: 'aurora-postgresql',
				// Serverless v2 is a provisioned cluster with serverless instances.
				engineMode: 'provisioned',
				engineVersion: version,
				// RDS makes the password, keeps it in Secrets Manager & rotates it.
				// The Data API logs in with that secret, so no function ever holds it.
				masterUsername: 'postgres',
				manageMasterUserPassword: true,
				enableHttpEndpoint: true,
				storageEncrypted: true,
				backupRetentionPeriod: toDays(props.backup.retention),
				dbSubnetGroupName: subnetGroup.name,
				vpcSecurityGroupIds: [securityGroup.id],
				serverlessv2ScalingConfiguration: {
					// Aurora counts in ACU: one is 2 GiB of memory.
					minCapacity: props.memory.min / 2,
					maxCapacity: props.memory.max / 2,
					// Only a cluster that scales to zero pauses, and the
					// config gives it an idleTimeout.
					secondsUntilAutoPause: props.idleTimeout ? toSeconds(props.idleTimeout) : undefined,
				},
				// A change of memory or version happens with the deploy, not
				// in the next maintenance window.
				applyImmediately: true,
				// An app that retains its data keeps its cluster, also from a
				// delete by hand. Any other is deleted with all it holds.
				deletionProtection: retainOnDelete,
				skipFinalSnapshot: !retainOnDelete,
			},
			{ retainOnDelete }
		)

		const writer = new aws.rds.ClusterInstance(
			group,
			'writer',
			{
				identifier: `${name}-writer`,
				clusterIdentifier: cluster.id,
				engine: 'aurora-postgresql',
				engineVersion: cluster.engineVersion,
				instanceClass: 'db.serverless',
				dbSubnetGroupName: subnetGroup.name,
				// A version with a minor is pinned: Aurora moving it on its own
				// would make the next deploy try to move it back.
				autoMinorVersionUpgrade: !version.includes('.'),
				applyImmediately: true,
			},
			{ retainOnDelete }
		)

		const clusterArn = cluster.arn
		const secretArn = cluster.masterUserSecret.pipe(secrets => secrets[0]!.secretArn)

		ctx.addEnv('POSTGRES_CLUSTER_ARN', clusterArn)
		ctx.addEnv('POSTGRES_SECRET_ARN', secretArn)

		// A query is one ExecuteStatement call, which logs in with the secret
		// on behalf of the function.
		ctx.addPermission({
			actions: ['rds-data:ExecuteStatement'],
			resources: [clusterArn],
		})

		ctx.addPermission({
			actions: ['secretsmanager:GetSecretValue'],
			resources: [secretArn],
		})

		// The Data API has nothing to run a statement on before the writer is
		// there, so a stack's schema waits for it.
		ctx.shared.set(
			'postgres',
			'cluster-arn',
			$resolve([clusterArn, writer.id], arn => arn)
		)
		ctx.shared.set('postgres', 'secret-arn', secretArn)
	},
	onStack(ctx) {
		const props = ctx.stackConfig.postgres

		if (!props) {
			return
		}

		const group = new Group(ctx.stack, 'postgres', 'main')
		const schema = getPostgresSchemaName(ctx.stackConfig.name)
		const retainOnDelete = ctx.appConfig.removal === 'retain'

		new PostgresSchemaResource(
			group,
			'schema',
			{
				clusterArn: ctx.shared.get('postgres', 'cluster-arn'),
				secretArn: ctx.shared.get('postgres', 'secret-arn'),
				// A database per stack, named like its schema: see the provider.
				database: schema,
				schema,
				tables: JSON.stringify(props.tables),
				functions: JSON.stringify(readFunctionFiles(ctx.stackConfig)),
				retain: retainOnDelete,
			},
			{
				retainOnDelete,
				replaceOnChanges: ['database', 'schema'],
			}
		)
	},
})
