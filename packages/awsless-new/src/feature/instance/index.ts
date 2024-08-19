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
			name: formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'instance',
				resourceName: 'assets',
				postfix: ctx.appId,
			}),
			forceDelete: true,
		})

		ctx.shared.set('instance-bucket-name', bucket.name)

		if (ctx.appConfig.defaults.instance.connect) {
			new aws.ec2.InstanceConnectEndpoint(group, 'connect', {
				name: ctx.app.name,
				subnetId: ctx.shared.get(`vpc-public-subnet-id-1`),
				securityGroupIds: [ctx.shared.get('vpc-security-group-id')],
			})
		}
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.instances ?? {})) {
			const group = new Node(ctx.stack, 'instance', id)
			const name = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: ctx.stack.name,
				resourceType: 'instance',
				resourceName: id,
			})

			// --------------------------------------------------------

			const env: Record<string, Input<string>> = {
				APP: ctx.app.name,
				APP_ID: ctx.appId,
				STORE_POSTFIX: ctx.appId,
				STACK: ctx.stack.name,
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

						// 'sudo mkdir /var/infra',
						// 'sudo mkdir /var/code',

						// 'sudo chmod -R a+rwx /var/infra',
						// 'sudo chmod -R a+rwx /var/code',

						// `sudo chown -R ${u} /var/infra`,
						// `sudo chown -R ${u} /var/code`,

						// `sudo -E -u ${u} aws configure set default.s3.use_dualstack_endpoint true`,
						// `sudo -E -u ${u} aws s3 cp s3://${bucketName}/${name} /var/infra`,
						// `sudo -E -u ${u} unzip -o /var/infra/${name} -d /var/code`,
						// `sudo -E -u ${u} rm /var/infra/${name}`,

						// `cd /var/code`,

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

							// log group name
							`echo export CLOUDWATCH_LOG_GROUP_NAME="/awsless/instance/${name}" >> /etc/profile`,

							// user environment vars
							...Object.entries(props.environment ?? {}).map(([key, value]) => {
								return `echo export ${key}="${value}" >> /etc/profile`
							}),

							'source /etc/profile',

							props.command ? `${props.command}` : '',
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
				waitForTermination: props.waitForTermination,
			})

			// We need to make sure our code is deployed to s3
			// before we launch the ec2 instance.

			instance.dependsOn(code)

			// We need to make sure our policies are set before
			// we launch the ec2 instance.

			instance.dependsOn(policy)

			// --------------------------------------------------------
			// Logging

			const logGroup = new aws.cloudWatch.LogGroup(group, 'log', {
				name: `/awsless/instance/${name}`,
				retention: days(3),
			})

			policy.addStatement(
				{
					actions: ['logs:CreateLogStream', 'logs:DescribeLogStreams'],
					resources: [logGroup.arn],
				},
				{
					actions: ['logs:PutLogEvents', 'logs:GetLogEvents'],
					resources: [logGroup.arn.apply(arn => `${arn}:*` as const)],
				}
			)
		}
	},
})
