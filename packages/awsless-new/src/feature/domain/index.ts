import { Node, aws } from '@awsless/formation'
import { defineFeature } from '../../feature.js'
import { minutes } from '@awsless/duration'

export const domainFeature = defineFeature({
	name: 'domain',
	onApp(ctx) {
		const domains = Object.entries(ctx.appConfig.defaults.domains ?? {})

		if (domains.length === 0) {
			return
		}

		// const group = new Node('domain', 'core')
		// ctx.base.add(group)

		const configurationSet = new aws.ses.ConfigurationSet('config', {
			name: ctx.app.name,
			engagementMetrics: true,
			reputationMetrics: true,
		})

		ctx.base.add(configurationSet)

		for (const [id, props] of domains) {
			const group = new Node('domain', id)
			ctx.base.add(group)

			const hostedZone = new aws.route53.HostedZone('zone', {
				name: props.domain,
			})

			group.add(hostedZone)
			ctx.base.export(`hosted-zone-${id}-id`, hostedZone.id)

			const certificate = new aws.acm.Certificate('local', {
				domainName: props.domain,
				alternativeNames: [`*.${props.domain}`],
			})

			group.add(certificate)
			ctx.base.export(`local-certificate-${id}-arn`, certificate.arn)

			hostedZone.addRecord('local-cert-1', certificate.validationRecord(0))
			hostedZone.addRecord('local-cert-2', certificate.validationRecord(1))

			if (ctx.appConfig.region !== 'us-east-1') {
				const globalCertificate = new aws.acm.Certificate('global', {
					domainName: props.domain,
					alternativeNames: [`*.${props.domain}`],
					region: 'us-east-1',
				})

				group.add(globalCertificate)
				ctx.base.export(`global-certificate-${id}-arn`, globalCertificate.arn)

				hostedZone.addRecord('global-cert-1', globalCertificate.validationRecord(0))
				hostedZone.addRecord('global-cert-2', globalCertificate.validationRecord(1))
			} else {
				// If we deploy this app in the us-east-1 region,
				// then we just use alias the local cert.
				ctx.base.export(`global-certificate-${id}-arn`, certificate.arn)
			}

			// new aws.acm.CertificateValidation()

			// ctx.base.export(`certificate-${id}-arn`, usEastCertificate.arn)
			// ctx.base.export(`hosted-zone-${id}-id`, hostedZone.id)

			// const certificate = new aws.acm.Certificate('cert', {
			// 	domainName: props.domain,
			// 	alternativeNames: [`*.${props.domain}`],
			// })
			// group.add(certificate)
			// ctx.base.export(`certificate-${id}-arn`, certificate.arn)

			// const emailIdentity = new aws.ses.EmailIdentity('email-identity', {
			// 	emailIdentity: props.domain,
			// 	mailFromDomain: `mailer.${props.domain}`,
			// 	configurationSetName: configurationSet.name,
			// 	feedback: true,
			// 	rejectOnMxFailure: true,
			// })
			// group.add(emailIdentity)
			// ctx.base.export(`ses-${id}-arn`, '')

			// group.add(
			// 	new aws.route53.RecordSet(`mail-from-mx`, {
			// 		hostedZoneId: hostedZone.id,
			// 		name: `mailer.${props.domain}`,
			// 		type: 'MX',
			// 		ttl: minutes(5),
			// 		records: ['10 feedback-smtp.eu-west-1.amazonses.com'],
			// 	})
			// )
			// group.add(
			// 	new aws.route53.RecordSet(`mail-from-spf`, {
			// 		hostedZoneId: hostedZone.id,
			// 		name: `mailer.${props.domain}`,
			// 		type: 'TXT',
			// 		ttl: minutes(5),
			// 		records: ['"v=spf1 include:amazonses.com -all"'],
			// 	})
			// )
			// group.add(
			// 	new aws.route53.RecordSet(`mail-dmarc`, {
			// 		hostedZoneId: hostedZone.id,
			// 		name: `_dmarc.${props.domain}`,
			// 		type: 'TXT',
			// 		ttl: minutes(5),
			// 		records: ['"v=DMARC1; p=none;"'],
			// 	})
			// )
			// const emailIdentity = new aws.ses.EmailIdentity('email-identity', {
			// 	emailIdentity: props.domain,
			// 	mailFromDomain: `mailer.${props.domain}`,
			// 	configurationSetName: configurationSet.name,
			// 	feedback: true,
			// 	rejectOnMxFailure: true,
			// })
			// group.add(emailIdentity)

			// let i = 0
			// for (const record of emailIdentity.dnsRecords(ctx.appConfig.region)) {
			// 	const recordSet = new aws.route53.RecordSet(`mail-${++i}`, {
			// 		hostedZoneId: hostedZone.id,
			// 		...record,
			// 	})
			// 	group.add(recordSet)
			// }

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

		// ctx.onFunction(({ policy }) => {
		// 	policy.addStatement({
		// 		actions: ['ses:*'],
		// 		resources: domains.map(
		// 			([_, props]) => `arn:aws:ses:*:*:identity/${props.domain}*`
		// 		) as `arn:${string}`[],
		// 	})
		// })

		// ctx.onFunction(({ policy }) =>
		// 	policy.addStatement({
		// 		actions: ['ses:*'],
		// 		resources: ['arn:aws:ses:*:*:'],
		// 	})
		// )
	},
})
