import { definePlugin } from '../../feature.js'
import { HostedZone } from '../../formation/resource/route53/hosted-zone.js'
import { Certificate } from '../../formation/resource/certificate-manager/certificate.js'
import { RecordSetGroup } from '../../formation/resource/route53/record-set-group.js'
import { Function } from '../../formation/resource/lambda/function.js'
import { Code } from '../../formation/resource/lambda/code.js'
import { CustomResource } from '../../formation/resource/cloud-formation/custom-resource.js'
import { GlobalExports } from '../../custom/global-exports.js'
import { Duration } from '../../formation/property/duration.js'
import { ConfigurationSet } from '../../formation/resource/ses/configuration-set.js'
import { EmailIdentity } from '../../formation/resource/ses/email-identity.js'

export const domainPlugin = definePlugin({
	name: 'domain',
	onApp({ config, app, bootstrap, usEastBootstrap, bind }) {
		const domains = Object.entries(config.app.defaults.domains || {})

		if (domains.length === 0) {
			return
		}

		const deleteHostedZoneLambda = new Function('delete-hosted-zone', {
			name: `${app.name}-delete-hosted-zone`,
			code: Code.fromInlineFeature('delete-hosted-zone'),
		})
			.enableLogs(Duration.days(3))
			.addPermissions({
				actions: ['route53:ListResourceRecordSets', 'route53:ChangeResourceRecordSets'],
				resources: ['*'],
			})

		usEastBootstrap.add(deleteHostedZoneLambda)

		const usEastExports = new GlobalExports(`${app.name}-us-east-exports`, {
			region: usEastBootstrap.region,
		})

		bootstrap.add(usEastExports)

		// -----------------------------------
		// SES
		// -----------------------------------

		const configurationSet = new ConfigurationSet('default', {
			name: app.name,
			engagementMetrics: true,
			reputationMetrics: true,
		})

		bootstrap.add(configurationSet)

		for (const [id, props] of domains) {
			const hostedZone = new HostedZone(id, {
				domainName: props.domain,
			})

			const usEastCertificate = new Certificate(id, {
				domainName: props.domain,
				hostedZoneId: hostedZone.id,
				alternativeNames: [`*.${props.domain}`],
			})

			const deleteHostedZone = new CustomResource(id, {
				serviceToken: deleteHostedZoneLambda.arn,
				properties: {
					hostedZoneId: hostedZone.id,
				},
			}).dependsOn(deleteHostedZoneLambda, hostedZone)

			usEastBootstrap
				.add(hostedZone)
				.add(deleteHostedZone)
				.add(usEastCertificate)
				.export(`certificate-${id}-arn`, usEastCertificate.arn)
				.export(`hosted-zone-${id}-id`, hostedZone.id)

			const certificate = new Certificate(id, {
				domainName: props.domain,
				hostedZoneId: usEastExports.import(`hosted-zone-${id}-id`),
				alternativeNames: [`*.${props.domain}`],
			})

			const emailIdentity = new EmailIdentity(id, {
				domain: props.domain,
				subDomain: 'mailer',
				configurationSetName: configurationSet.name,
				feedback: true,
				rejectOnMxFailure: true,
			}).dependsOn(configurationSet)

			const emailRecordGroup = new RecordSetGroup(`${id}-mail`, {
				hostedZoneId: usEastExports.import(`hosted-zone-${id}-id`),
				records: emailIdentity.records,
			}).dependsOn(emailIdentity)

			bootstrap
				.add(certificate)
				.add(emailIdentity)
				.add(emailRecordGroup)
				.export(`certificate-${id}-arn`, certificate.arn)
				.export(`hosted-zone-${id}-id`, usEastExports.import(`hosted-zone-${id}-id`))
				.export(`us-east-certificate-${id}-arn`, usEastExports.import(`certificate-${id}-arn`))

			if (props.dns?.length) {
				const group = new RecordSetGroup(id, {
					hostedZoneId: hostedZone.id,
					records: props.dns,
				}).dependsOn(hostedZone)

				usEastBootstrap.add(group)
			}
		}

		bind(lambda =>
			lambda.addPermissions({
				actions: ['ses:*'],
				resources: ['*'],
			})
		)
	},
})
