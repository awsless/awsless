import { Asset, aws, combine, Input, Node, Output, unwrap } from '@awsless/formation'
import { hashElement } from 'folder-hash'
import { readFileSync } from 'fs'
import { mkdir, readFile } from 'fs/promises'
import { dirname } from 'path'
import { zip } from 'zip-a-folder'
import { getBuildPath } from '../../build/index.js'
import { defineFeature } from '../../feature.js'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'
import { UserData } from './__user-data.js'

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
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.instances ?? {})) {
			const group = new Node(ctx.stack, 'instance', id)
			const name = formatLocalResourceName(ctx.appConfig.name, ctx.stack.name, 'instance', id)

			const env: Record<string, Input<string>> = {}

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
							const code = [
								`mkdir /var/code`,
								`cd /var`,
								`sudo -u ubuntu aws s3 cp s3://${bucketName}/${name} ./`,
								`sudo -u ubuntu unzip -o ${name} -d ./code`,
								`cd /var/code`,
							].join('\n')

							const data = props.userData ? readFileSync(props.userData, 'utf8') : ''
							// const data = 'echo 100'

							const envs = Object.entries(env)
								.map(([key, value]) => `export ${key}="${unwrap(value)}"`)
								.join('\n')

							// console.log('\n\n', 'USER_DATA', `\n${envs}\n\n${code}\n\n${data}`)

							resolve(
								Asset.fromString(
									Buffer.from(`\n${envs}\n\n${code}\n\n${data}`, 'utf8').toString('base64')
								)
							)
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
				// userData: props.userData ? Asset.fromFile(getBuildPath('user-data', name, 'base64')) : undefined,
			})

			// We need to make sure our code is deployed to s3
			// before we launch the ec2 template.

			// template.dependsOn(code)

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
				subnetId: ctx.shared.get(`vpc-private-subnet-id-1`),
			})

			// We need to make sure our code is deployed to s3
			// before we launch the ec2 instance.

			instance.dependsOn(code)
		}
	},
})
