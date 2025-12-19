import { minutes, toSeconds } from '@awsless/duration'
import { Group } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { defineFeature } from '../../feature.js'
// import { formatGlobalResourceName } from '../../util/name.js'

export const domainFeature = defineFeature({
	name: 'domain',
	onApp(ctx) {
		const domains = Object.entries(ctx.appConfig.defaults.domains ?? {})

		if (domains.length === 0) {
			return
		}

		const group = new Group(ctx.base, 'domain', 'mail')

		new aws.ses.ConfigurationSet(group, 'config', {
			name: ctx.app.name,
			reputationMetricsEnabled: true,
			sendingEnabled: true,
		})

		// ctx.shared.set(`mail-configuration-set`, configurationSet.name)

		for (const [id, props] of domains) {
			const group = new Group(ctx.base, 'domain', id)

			const zone = new aws.route53.Zone(ctx.zones, 'zone', {
				name: props.domain,
				forceDestroy: true,
			})

			ctx.registerDomainZone(zone)

			ctx.shared.add('domain', `zone-id`, id, zone.id)

			const certificate = new aws.acm.Certificate(group, 'local', {
				domainName: props.domain,
				validationMethod: 'DNS',
				keyAlgorithm: 'RSA_2048',
				subjectAlternativeNames: [`*.${props.domain}`],
			})

			const option = (certificate: aws.acm.Certificate, index: number) => {
				return certificate.domainValidationOptions.pipe(options => {
					return options[index]!
				})
			}

			const record1 = new aws.route53.Record(group, 'local-cert-1', {
				zoneId: zone.id,
				name: option(certificate, 0).pipe(r => r.resourceRecordName),
				type: option(certificate, 0).pipe(r => r.resourceRecordType),
				ttl: toSeconds(minutes(5)),
				records: [option(certificate, 0).pipe(r => r.resourceRecordValue)],
				allowOverwrite: true,
			})

			const record2 = new aws.route53.Record(group, 'local-cert-2', {
				zoneId: zone.id,
				name: option(certificate, 1).pipe(r => r.resourceRecordName),
				type: option(certificate, 1).pipe(r => r.resourceRecordType),
				ttl: toSeconds(minutes(5)),
				records: [option(certificate, 1).pipe(r => r.resourceRecordValue)],
				allowOverwrite: true,
			})

			const validation = new aws.acm.CertificateValidation(group, 'local', {
				certificateArn: certificate.arn,
				validationRecordFqdns: [record1.fqdn, record2.fqdn],
				// validationRecordFqdns: [record1.fqdn, record2.fqdn],
			})

			ctx.shared.add('domain', `certificate-arn`, id, validation.certificateArn)

			if (ctx.appConfig.region !== 'us-east-1') {
				const globalCertificate = new aws.acm.Certificate(
					group,
					'global',
					{
						domainName: props.domain,
						validationMethod: 'DNS',
						keyAlgorithm: 'RSA_2048',
						subjectAlternativeNames: [`*.${props.domain}`],
					},
					{
						provider: 'global-aws',
					}
				)

				const record1 = new aws.route53.Record(group, 'global-cert-1', {
					zoneId: zone.id,
					name: option(globalCertificate, 0).pipe(r => r.resourceRecordName),
					type: option(globalCertificate, 0).pipe(r => r.resourceRecordType),
					ttl: toSeconds(minutes(5)),
					records: [option(globalCertificate, 0).pipe(r => r.resourceRecordValue)],
					allowOverwrite: true,
				})

				const record2 = new aws.route53.Record(group, 'global-cert-2', {
					zoneId: zone.id,
					name: option(globalCertificate, 1).pipe(r => r.resourceRecordName),
					type: option(globalCertificate, 1).pipe(r => r.resourceRecordType),
					ttl: toSeconds(minutes(5)),
					records: [option(globalCertificate, 1).pipe(r => r.resourceRecordValue)],
					allowOverwrite: true,
				})

				const globalValidation = new aws.acm.CertificateValidation(
					group,
					'global',
					{
						certificateArn: globalCertificate.arn,
						validationRecordFqdns: [record1.fqdn, record2.fqdn],
					},
					{
						provider: 'global-aws',
					}
				)

				ctx.shared.add('domain', `global-certificate-arn`, id, globalValidation.certificateArn)
			} else {
				// If we deploy this app in the us-east-1 region,
				// then we just use alias the local cert.

				ctx.shared.add('domain', `global-certificate-arn`, id, validation.certificateArn)
			}

			// ------------------------------------------------------------
			// Let SES verify our domain

			const identity = new aws.ses.DomainIdentity(group, 'mail', {
				domain: props.domain,
			})

			const verificationRecord = new aws.route53.Record(group, `verification`, {
				zoneId: zone.id,
				name: `_amazonses.${props.domain}`,
				type: 'TXT',
				ttl: toSeconds(minutes(5)),
				records: [identity.verificationToken],
			})

			// ------------------------------------------------------------
			// DKIM

			const dkim = new aws.ses.DomainDkim(group, 'dkim', {
				domain: props.domain,
			})

			for (let i = 0; i < 3; i++) {
				new aws.route53.Record(group, `dkim-${i}`, {
					zoneId: zone.id,
					type: 'CNAME',
					name: dkim.dkimTokens.pipe(t => `${t.at(i)}._domainkey`),
					ttl: toSeconds(minutes(5)),
					records: [dkim.dkimTokens.pipe(t => `${t.at(i)}.dkim.amazonses.com`)],
				})
			}

			// ------------------------------------------------------------
			// Mail from

			const mailFrom = new aws.ses.DomainMailFrom(group, 'mail-from', {
				domain: identity.domain,
				mailFromDomain: `mail.${props.domain}`,
				behaviorOnMxFailure: 'UseDefaultValue',
			})

			new aws.route53.Record(group, `MX`, {
				zoneId: zone.id,
				name: mailFrom.mailFromDomain,
				type: 'MX',
				ttl: toSeconds(minutes(5)),
				records: [`10 feedback-smtp.${ctx.appConfig.region}.amazonses.com`],
			})

			new aws.route53.Record(group, `SPF`, {
				zoneId: zone.id,
				name: mailFrom.mailFromDomain,
				type: 'TXT',
				ttl: toSeconds(minutes(5)),
				records: ['v=spf1 include:amazonses.com -all'],
			})

			// ------------------------------------------------------------
			// DMARC

			new aws.route53.Record(group, `DMARC`, {
				zoneId: zone.id,
				name: `_dmarc.${props.domain}`,
				type: 'TXT',
				ttl: toSeconds(minutes(5)),
				records: ['v=DMARC1; p=none;'],
			})

			// ------------------------------------------------------------
			// Listen for "bounce", "complaint", "reject", "renderingFailure" messages

			// const topic = new aws.sns.Topic(group, 'topic', {
			// 	name: formatGlobalResourceName({
			// 		appName: ctx.app.name,
			// 		resourceType: 'domain',
			// 		resourceName: id,
			// 	}),
			// })

			// new aws.sns.TopicSubscription(group, 'subscription', {
			// 	topicArn: topic.arn,
			// 	protocol: 'EMAIL',
			// 	endpoint: `info@${props.domain}`,
			// 	endpointAutoConfirms: true,
			// })

			// // new aws.sns

			// new aws.ses.EventDestination(group, 'event', {
			// 	configurationSetName: configurationSet.name,
			// 	name: formatGlobalResourceName({
			// 		appName: ctx.app.name,
			// 		resourceType: 'domain',
			// 		resourceName: id,
			// 	}),
			// 	enabled: true,
			// 	matchingTypes: ['bounce', 'complaint', 'reject', 'renderingFailure'],
			// 	snsDestination: {
			// 		topicArn: topic.arn,
			// 	},
			// })

			// ------------------------------------------------------------

			// const mailIdentityArn = emailIdentity.output(() => {
			// 	return `arn:aws:ses:${ctx.appConfig.region}:${ctx.accountId}:identity/${props.domain}`
			// })

			const verification = new aws.ses.DomainIdentityVerification(
				group,
				'mail',
				{ domain: props.domain },
				{ dependsOn: [identity, verificationRecord] }
			)

			ctx.shared.add(`domain`, 'mail-arn', id, verification.arn)

			for (const record of props.dns ?? []) {
				const name = record.name ?? props.domain
				new aws.route53.Record(group, `${name}-${record.type}`, {
					zoneId: zone.id,
					name,
					ttl: toSeconds(record.ttl),
					type: record.type,
					records: record.records,
				})
			}
		}

		ctx.addGlobalPermission({
			actions: ['ses:*'],
			resources: [`arn:aws:ses:${ctx.appConfig.region}:${ctx.accountId}:identity/*`],
		})
	},
})
