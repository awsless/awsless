import { Asset, aws, Node } from '@awsless/formation'
import { createHash } from 'crypto'
import { hashElement } from 'folder-hash'
import { mkdir, readFile } from 'fs/promises'
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
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.instances ?? {})) {
			const group = new Node(ctx.stack, 'instance', id)
			const name = formatLocalResourceName(ctx.appConfig.name, ctx.stack.name, 'instance', id)

			if (props.userData) {
				ctx.registerBuild('user-data', name, async build => {

					// ctx.envi

					const userData = await readFile(props.userData!, 'utf8')
					const extendedUserData = `${}\n\n${userData}`
					const hash = createHash('sha1').update(extendedUserData).digest('hex')

					await build(hash, async write => {
						await write('base64', Buffer.from(userData, 'utf8').toString('base64'))
					})
				})
			}

			for (const [key, codeDir] of Object.entries(props.code ?? {})) {
				const bundleFile = getBuildPath('instance', name, key)

				ctx.registerBuild('instance', name, async build => {
					const version = await hashElement(codeDir, {
						files: {
							exclude: ['stack.json'],
						},
					})

					await build(version.hash, async () => {
						await mkdir(dirname(bundleFile), { recursive: true })
						await zip(codeDir, bundleFile)
					})
				})

				new aws.s3.BucketObject(group, key, {
					key,
					bucket: ctx.shared.get('instance-bucket-name'),
					body: Asset.fromFile(bundleFile),
				})
			}

			const template = new aws.ec2.LaunchTemplate(group, 'template', {
				name,
				imageId: props.imageId,
				instanceType: props.type,
				securityGroupIds: [ctx.shared.get('vpc-security-group-id')],
				monitoring: true,
				userData: props.userData ? Asset.fromFile(getBuildPath('user-data', name, 'base64')) : undefined,
			})

			const role = new aws.iam.Role(group, 'role', {
				name,
				assumedBy: 'ec2.amazonaws.com',
			})

			const policy = new aws.iam.RolePolicy(group, 'policy', {
				name,
				role: role.name,
			})

			const profile = new aws.iam.InstanceProfile(group, 'profile', {
				name,
				roles: [role.name],
			})

			new aws.ec2.Instance(group, 'instance', {
				name,
				iamInstanceProfile: profile.arn,
				launchTemplate: template,
				subnetId: ctx.shared.get(`vpc-private-subnet-id-1`),
			})

			ctx.registerPolicy(policy)
		}
	},
})
