import { minutes } from '@awsless/duration'
import { aws, Node } from '@awsless/formation'
import { defineFeature } from '../../feature.js'

export const domainFeature = defineFeature({
	name: 'domain',
	onApp(ctx) {
		const domains = Object.entries(ctx.appConfig.defaults.domains ?? {})

		if (domains.length === 0) {
			return
		}

		const group = new Node(ctx.base, 'domain', 'mail')

		const configurationSet = new aws.ses.ConfigurationSet(group, 'config', {
			name: ctx.app.name,
			engagementMetrics: true,
			reputationMetrics: true,
		})

		ctx.shared.set(`mail-configuration-set`, configurationSet.name)

		for (const [id, props] of domains) {
			const group = new Node(ctx.base, 'domain', id)

			const hostedZone = new aws.route53.HostedZone(group, 'zone', {
				name: props.domain,
			})

			ctx.shared.set(`hosted-zone-${id}-id`, hostedZone.id)

			const certificate = new aws.acm.Certificate(group, 'local', {
				domainName: props.domain,
				alternativeNames: [`*.${props.domain}`],
			})

			hostedZone.addRecord('local-cert-1', certificate.validationRecord(0))
			hostedZone.addRecord('local-cert-2', certificate.validationRecord(1))

			const validation = new aws.acm.CertificateValidation(group, 'local', {
				certificateArn: certificate.arn,
			})

			ctx.shared.set(`local-certificate-${id}-arn`, validation.arn)

			if (ctx.appConfig.region !== 'us-east-1') {
				const globalCertificate = new aws.acm.Certificate(group, 'global', {
					domainName: props.domain,
					alternativeNames: [`*.${props.domain}`],
					region: 'us-east-1',
				})

				hostedZone.addRecord('global-cert-1', globalCertificate.validationRecord(0))
				hostedZone.addRecord('global-cert-2', globalCertificate.validationRecord(1))

				const globalValidation = new aws.acm.CertificateValidation(group, 'global', {
					certificateArn: globalCertificate.arn,
					region: 'us-east-1',
				})

				ctx.shared.set(`global-certificate-${id}-arn`, globalValidation.arn)
			} else {
				// If we deploy this app in the us-east-1 region,
				// then we just use alias the local cert.

				ctx.shared.set(`global-certificate-${id}-arn`, validation.arn)
			}

			const emailIdentity = new aws.ses.EmailIdentity(group, 'mail', {
				emailIdentity: props.domain,
				mailFromDomain: `mail.${props.domain}`,
				configurationSetName: configurationSet.name,
				feedback: true,
				rejectOnMxFailure: true,
			})

			let i = 0
			for (const record of emailIdentity.dkimRecords) {
				new aws.route53.RecordSet(group, `dkim-${++i}`, {
					hostedZoneId: hostedZone.id,
					...record,
				})
			}

			new aws.route53.RecordSet(group, `MX`, {
				hostedZoneId: hostedZone.id,
				name: `mail.${props.domain}`,
				type: 'MX',
				ttl: minutes(5),
				records: [`10 feedback-smtp.${ctx.appConfig.region}.amazonses.com`],
			})

			new aws.route53.RecordSet(group, `SPF`, {
				hostedZoneId: hostedZone.id,
				name: `mail.${props.domain}`,
				type: 'TXT',
				ttl: minutes(5),
				records: ['"v=spf1 include:amazonses.com -all"'],
			})

			new aws.route53.RecordSet(group, `DMARC`, {
				hostedZoneId: hostedZone.id,
				name: `_dmarc.${props.domain}`,
				type: 'TXT',
				ttl: minutes(5),
				records: ['"v=DMARC1; p=none;"'],
			})

			const mailIdentityArn = emailIdentity.output(() => {
				return `arn:aws:ses:${ctx.appConfig.region}:${ctx.accountId}:identity/${props.domain}`
			})

			ctx.shared.set(`mail-${id}-arn`, mailIdentityArn)
			ctx.shared.set(`mail-${props.domain}-arn`, mailIdentityArn)

			for (const record of props.dns ?? []) {
				const name = record.name ?? props.domain
				new aws.route53.RecordSet(group, `${name}-${record.type}`, {
					hostedZoneId: hostedZone.id,
					name,
					...record,
				})
			}
		}

		ctx.onGlobalPolicy(policy =>
			policy.addStatement({
				actions: ['ses:*'],
				resources: [`arn:aws:ses:${ctx.appConfig.region}:${ctx.accountId}:identity/*`],
			})
		)
	},
})
