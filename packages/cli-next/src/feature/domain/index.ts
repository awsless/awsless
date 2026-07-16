import { minutes, toSeconds } from '@awsless/duration'
import { Group } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { defineFeature } from '../../feature.js'
import { NsCheck } from '../../formation/ns-check.js'
import { createDnsValidatedCertificate } from './util.js'
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

			const nsCheck = new NsCheck(group, 'check', {
				zoneId: zone.id,
			})

			ctx.registerDomainZone(zone)

			ctx.shared.add('domain', `zone-id`, id, zone.id)

			const validation = createDnsValidatedCertificate(group, 'local', {
				recordIdPrefix: 'local-cert',
				zoneId: zone.id,
				domainName: props.domain,
				subjectAlternativeNames: [`*.${props.domain}`],
				dependsOn: [nsCheck],
			})

			ctx.shared.add('domain', `certificate-arn`, id, validation.certificateArn)

			if (ctx.appConfig.region !== 'us-east-1') {
				const globalValidation = createDnsValidatedCertificate(group, 'global', {
					recordIdPrefix: 'global-cert',
					zoneId: zone.id,
					domainName: props.domain,
					subjectAlternativeNames: [`*.${props.domain}`],
					provider: 'global-aws',
				})

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

			new aws.ses.DomainIdentityVerification(
				group,
				'mail',
				{ domain: props.domain },
				{ dependsOn: [identity, verificationRecord, nsCheck] }
			)

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
			resources: [
				// `arn:aws:ses:${ctx.appConfig.region}:${ctx.accountId}:identity/*`,
				'*',
			],
		})
	},
})
