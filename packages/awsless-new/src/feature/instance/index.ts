import { days } from '@awsless/duration'
import { Asset, aws, combine, Input, Node, Output, unwrap } from '@awsless/formation'
import { hashElement } from 'folder-hash'
import { mkdir } from 'fs/promises'
import { dirname } from 'path'
import { zip } from 'zip-a-folder'
import { getBuildPath } from '../../build/index.js'
import { defineFeature } from '../../feature.js'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'

export const instanceFeature = defineFeature({
	name: 'instance',
	onApp(ctx) {
		const group = new Node(ctx.base, 'instance', 'asset')

		const bucket = new aws.s3.Bucket(group, 'bucket', {
			name: formatGlobalResourceName(ctx.appConfig.name, 'instance', 'assets'),
			forceDelete: true,
		})

		ctx.shared.set('instance-bucket-name', bucket.name)

		if (ctx.appConfig.defaults.instance.connect) {
			new aws.ec2.InstanceConnectEndpoint(group, 'connect', {
				name: ctx.appConfig.name,
				subnetId: ctx.shared.get(`vpc-public-subnet-id-1`),
				securityGroupIds: [ctx.shared.get('vpc-security-group-id')],
			})
		}
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.instances ?? {})) {
			const group = new Node(ctx.stack, 'instance', id)
			const name = formatLocalResourceName(ctx.appConfig.name, ctx.stack.name, 'instance', id)

			// --------------------------------------------------------

			const env: Record<string, Input<string>> = {
				APP: ctx.appConfig.name,
				STACK: ctx.stackConfig.name,
			}

			ctx.onEnv((name, value) => {
				env[name] = value

				if (value instanceof Output) {
					template.dependsOn(...value.resources)
				}
			})

			const bucketName = ctx.shared.get<Output<string>>('instance-bucket-name')

			const userData = new Output<Asset>([], resolve => {
				ctx.onReady(() => {
					combine([bucketName, ...Object.values(env)]).apply(([bucketName]) => {
						const u = props.user

						const code = [
							`#!/bin/bash`,
							`cd /home/${u}`,
							`sudo -E -u ${u} aws configure set default.s3.use_dualstack_endpoint true`,
							`sudo -E -u ${u} aws s3 cp s3://${bucketName}/${name} .`,
							`sudo -E -u ${u} unzip -o ${name} -d ./code`,
							`sudo -E -u ${u} rm ./${name}`,
							`cd ./code`,

							// system environment vars
							...Object.entries(env).map(([key, value]) => {
								return `echo export ${key}="${unwrap(value)}" >> /etc/profile`
							}),

							// user environment vars
							...Object.entries(props.environment ?? {}).map(([key, value]) => {
								return `echo export ${key}="${value}" >> /etc/profile`
							}),

							'source /etc/profile',

							props.command ? `sudo -E -u ${u} ${props.command}` : '',
						].join('\n')

						resolve(Asset.fromString(Buffer.from(code, 'utf8').toString('base64')))
					})
				})
			})

			// ----------------------------------------------------------------
			// Build & upload the code to s3

			const bundleFile = getBuildPath('instance', name, 'bundle.zip')

			ctx.registerBuild('instance', name, async build => {
				const version = await hashElement(props.code, {
					files: {
						exclude: ['stack.json'],
					},
				})

				await build(version.hash, async () => {
					await mkdir(dirname(bundleFile), { recursive: true })
					await zip(props.code, bundleFile)
				})
			})

			const code = new aws.s3.BucketObject(group, 'code', {
				key: name,
				bucket: bucketName,
				body: Asset.fromFile(bundleFile),
			})

			// ----------------------------------------------------------------

			const template = new aws.ec2.LaunchTemplate(group, 'template', {
				name,
				imageId: props.image,
				instanceType: props.type,
				securityGroupIds: [ctx.shared.get('vpc-security-group-id')],
				monitoring: true,
				userData,
			})

			const role = new aws.iam.Role(group, 'role', {
				name,
				assumedBy: 'ec2.amazonaws.com',
			})

			const policy = new aws.iam.RolePolicy(group, 'policy', {
				name,
				role: role.name,
			})

			// permissions to pull the code from s3.
			policy.addStatement({
				actions: ['s3:GetObject', 's3:ListObjects', 's3:ListObjectsV2', 's3:HeadObject'],
				resources: [bucketName.apply(bucket => `arn:aws:s3:::${bucket}/${name}` as const)],
			})

			if (props.permissions) {
				policy.addStatement(...props.permissions)
			}

			ctx.registerPolicy(policy)

			const profile = new aws.iam.InstanceProfile(group, 'profile', {
				name,
				roles: [role.name],
			})

			const instance = new aws.ec2.Instance(group, 'instance', {
				name,
				iamInstanceProfile: profile.arn,
				launchTemplate: template,
				subnetId: ctx.shared.get(`vpc-public-subnet-id-1`),
			})

			// We need to make sure our code is deployed to s3
			// before we launch the ec2 instance.

			instance.dependsOn(code)

			// --------------------------------------------------------
			// Logging

			const logGroup = new aws.cloudWatch.LogGroup(group, 'log', {
				name: `/awsless/instance/${name}`,
				retention: days(3),
			})

			policy.addStatement(
				{
					actions: ['logs:CreateLogStream'],
					resources: [logGroup.arn],
				},
				{
					actions: ['logs:PutLogEvents'],
					resources: [logGroup.arn.apply(arn => `${arn}:*` as const)],
				}
			)
		}
	},
})
