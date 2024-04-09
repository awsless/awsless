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

		const group = new Node('domain', 'mail')
		ctx.base.add(group)

		const configurationSet = new aws.ses.ConfigurationSet('config', {
			name: ctx.app.name,
			engagementMetrics: true,
			reputationMetrics: true,
		})

		group.add(configurationSet)

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

			hostedZone.addRecord('local-cert-1', certificate.validationRecord(0))
			hostedZone.addRecord('local-cert-2', certificate.validationRecord(1))

			const validation = new aws.acm.CertificateValidation('local', {
				certificateArn: certificate.arn,
			})

			group.add(validation)
			ctx.base.export(`local-certificate-${id}-arn`, validation.arn)

			if (ctx.appConfig.region !== 'us-east-1') {
				const globalCertificate = new aws.acm.Certificate('global', {
					domainName: props.domain,
					alternativeNames: [`*.${props.domain}`],
					region: 'us-east-1',
				})

				group.add(globalCertificate)

				hostedZone.addRecord('global-cert-1', globalCertificate.validationRecord(0))
				hostedZone.addRecord('global-cert-2', globalCertificate.validationRecord(1))

				const globalValidation = new aws.acm.CertificateValidation('global', {
					certificateArn: globalCertificate.arn,
					region: 'us-east-1',
				})

				group.add(globalValidation)
				ctx.base.export(`global-certificate-${id}-arn`, globalValidation.arn)
			} else {
				// If we deploy this app in the us-east-1 region,
				// then we just use alias the local cert.

				ctx.base.export(`global-certificate-${id}-arn`, validation.arn)
			}

			const emailIdentity = new aws.ses.EmailIdentity('mail', {
				emailIdentity: props.domain,
				mailFromDomain: `mail.${props.domain}`,
				configurationSetName: configurationSet.name,
				feedback: true,
				rejectOnMxFailure: true,
			})

			group.add(emailIdentity)

			let i = 0
			for (const record of emailIdentity.dkimRecords) {
				const recordSet = new aws.route53.RecordSet(`dkim-${++i}`, {
					hostedZoneId: hostedZone.id,
					...record,
				})

				group.add(recordSet)
			}

			const record1 = new aws.route53.RecordSet(`MX`, {
				hostedZoneId: hostedZone.id,
				name: `mail.${props.domain}`,
				type: 'MX',
				ttl: minutes(5),
				records: [`10 feedback-smtp.${ctx.appConfig.region}.amazonses.com`],
			})

			const record2 = new aws.route53.RecordSet(`SPF`, {
				hostedZoneId: hostedZone.id,
				name: `mail.${props.domain}`,
				type: 'TXT',
				ttl: minutes(5),
				records: ['"v=spf1 include:amazonses.com -all"'],
			})

			const record3 = new aws.route53.RecordSet(`DMARC`, {
				hostedZoneId: hostedZone.id,
				name: `_dmarc.${props.domain}`,
				type: 'TXT',
				ttl: minutes(5),
				records: ['"v=DMARC1; p=none;"'],
			})

			group.add(record1, record2, record3)

			ctx.base.export(
				`mail-${id}-arn`,
				emailIdentity.output(() => {
					return `arn:aws:ses:${ctx.appConfig.region}:${ctx.accountId}:identity/${props.domain}`
				})
			)

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
				resources: [`arn:aws:ses:${ctx.appConfig.region}:*:identity/*`],
			})
		)
	},
})
