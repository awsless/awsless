import { Node, aws } from '@awsless/formation'
import { defineFeature } from '../../feature.js'

export const domainFeature = defineFeature({
	name: 'domain',
	onApp(ctx) {
		const domains = Object.entries(ctx.appConfig.defaults.domains || {})

		if (domains.length === 0) {
			return
		}

		const configurationSet = new aws.ses.ConfigurationSet('default', {
			name: ctx.app.name,
			engagementMetrics: true,
			reputationMetrics: true,
		})

		ctx.base.add(configurationSet)

		for (const [id, props] of domains) {
			const group = new Node('domain', id)
			ctx.base.add(group)

			const hostedZone = new aws.route53.HostedZone('zone', { name: props.domain })
			group.add(hostedZone)

			const usEastCertificate = new aws.acm.Certificate('us-east-cert', {
				domainName: props.domain,
				alternativeNames: [`*.${props.domain}`],
				region: 'us-east-1',
			})
			// new aws.acm.CertificateValidation()
			group.add(usEastCertificate)

			hostedZone.addRecord('certificate-1', usEastCertificate.validationRecord(0))
			hostedZone.addRecord('certificate-2', usEastCertificate.validationRecord(1))

			ctx.base.export(`certificate-${id}-arn`, usEastCertificate.arn)
			ctx.base.export(`hosted-zone-${id}-id`, hostedZone.id)

			// const certificate = new aws.acm.Certificate('cert', {
			// 	domainName: props.domain,
			// 	alternativeNames: [`*.${props.domain}`],
			// })
			// group.add(certificate)
			// ctx.base.export(`certificate-${id}-arn`, certificate.arn)

			const emailIdentity = new aws.ses.EmailIdentity('email-identity', {
				emailIdentity: props.domain,
				mailFromDomain: `mailer.${props.domain}`,
				configurationSetName: configurationSet.name,
				feedback: true,
				rejectOnMxFailure: true,
			})
			group.add(emailIdentity)

			let i = 0
			for (const record of emailIdentity.dnsRecords(ctx.appConfig.region)) {
				const recordSet = new aws.route53.RecordSet(`mail-${++i}`, {
					hostedZoneId: hostedZone.id,
					...record,
				})
				group.add(recordSet)
			}

			for (const record of props.dns ?? []) {
				const name = record.name ?? props.domain
				const recordSet = new aws.route53.RecordSet(`${name}-${record.type}`, {
					hostedZoneId: hostedZone.id,
					name,
					...record,
				})
				group.add(recordSet)
			}
		}

		ctx.onFunction(({ policy }) =>
			policy.addStatement({
				actions: ['ses:*'],
				resources: ['arn:*'],
			})
		)
	},
})
