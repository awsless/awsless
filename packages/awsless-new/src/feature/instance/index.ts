import { days } from '@awsless/duration'
import { Asset, aws, combine, Input, Node, Output, unwrap } from '@awsless/formation'
import { hashElement } from 'folder-hash'
import { readFileSync } from 'fs'
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
			versioning: true,
			forceDelete: true,
		})

		ctx.shared.set('instance-bucket-name', bucket.name)

		// const keyPair = new aws.ec2.KeyPair(group, 'keys', {
		// 	name: ctx.appConfig.name,
		// })

		// ctx.shared.set('instance-key-name', keyPair.name)

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

			const userData = new Output<Asset>([], resolve => {
				ctx.onReady(() => {
					combine([ctx.shared.get('instance-bucket-name'), ...Object.values(env)]).apply(
						async ([bucketName]) => {
							const log = (msg: string) => {
								return `sudo -u ubuntu aws logs put-log-events --log-group-name /awsless/instance/${name} --log-stream-name boot --log-events timestamp=1587488538000,message="${msg}"`
							}

							const code = [
								// ...Object.entries(env)
								// 	.map(([key, value]) => `export ${key}="${unwrap(value)}"`)
								// 	.join('\n'),
								// log('booting'),
								`sudo mkdir ~/code`,
								// `cd /var`,
								// log('fetching code from s3 bucket'),
								// `sudo aws s3 cp s3://${bucketName}/${name} ./`,
								// log('unzip code'),
								// `sudo -u ubuntu unzip -o ${name} -d ./code`,
								// `cd /var/code`,
								// log('ready'),
								// props.userData ? readFileSync(props.userData, 'utf8') : ''
							].join('\n')

							// const data = props.userData ? readFileSync(props.userData, 'utf8') : ''

							// const envs = Object.entries(env)
							// 	.map(([key, value]) => `export ${key}="${unwrap(value)}"`)
							// 	.join('\n')

							// console.log('\n\n', 'USER_DATA', `\n${envs}\n\n${code}\n\n${data}`)

							resolve(Asset.fromString(Buffer.from(code, 'utf8').toString('base64')))
						}
					)
				})
			})

			// userData.apply(console.log)

			// const userData = new UserData(group, 'data', {
			// 	file: props.userData ? Asset.fromFile(props.userData) : undefined,
			// 	code: {
			// 		bucket: ctx.shared.get('instance-bucket-name'),
			// 		key: name,
			// 	},
			// })

			// ctx.onEnv((name, value) => {
			// 	userData.addEnvironment(name, value)
			// })

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
				bucket: ctx.shared.get('instance-bucket-name'),
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
				// userData: userData.value.apply(Asset.fromString),
				// userData: Asset.fromString('echo 1'),
			})

			const role = new aws.iam.Role(group, 'role', {
				name,
				assumedBy: 'ec2.amazonaws.com',
			})

			const policy = new aws.iam.RolePolicy(group, 'policy', {
				name,
				role: role.name,
			})

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
				// keyName: props.ssh ? ctx.shared.get('instance-key-name') : undefined,
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
