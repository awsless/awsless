import { minutes, toSeconds } from '@awsless/duration'
import { aws } from '@terraforge/aws'
import { DataSource, Group, Input, Resource } from '@terraforge/core'
import { AppConfig } from '../../config/app.js'

export const createDnsValidatedCertificate = (
	group: Group,
	id: string,
	props: {
		/** Logical id prefix for the validation records: `${recordIdPrefix}-1` & `${recordIdPrefix}-2` */
		recordIdPrefix: string
		zoneId: Input<string>
		domainName: Input<string>
		subjectAlternativeNames: Input<Input<string>[]>
		provider?: string
		dependsOn?: Array<Resource | DataSource>
	}
) => {
	const certificate = new aws.acm.Certificate(
		group,
		id,
		{
			domainName: props.domainName,
			validationMethod: 'DNS',
			keyAlgorithm: 'RSA_2048',
			subjectAlternativeNames: props.subjectAlternativeNames,
		},
		{
			...(props.provider ? { provider: props.provider } : {}),
			replaceOnChanges: ['domainName', 'subjectAlternativeNames'],
			// The old cert can't be deleted while CloudFront / API Gateway still
			// use it, so create the new one first and delete the old one at the
			// end of the deployment, after every consumer switched over.
			createBeforeReplace: true,
		}
	)

	const option = (index: number) => {
		return certificate.domainValidationOptions.pipe(options => {
			return options[index]!
		})
	}

	const record1 = new aws.route53.Record(
		group,
		`${props.recordIdPrefix}-1`,
		{
			zoneId: props.zoneId,
			name: option(0).pipe(r => r.resourceRecordName),
			type: option(0).pipe(r => r.resourceRecordType),
			ttl: toSeconds(minutes(5)),
			records: [option(0).pipe(r => r.resourceRecordValue)],
			allowOverwrite: true,
		},
		{
			replaceOnChanges: ['name', 'type', 'zoneId', 'records'],
		}
	)

	const record2 = new aws.route53.Record(
		group,
		`${props.recordIdPrefix}-2`,
		{
			zoneId: props.zoneId,
			name: option(1).pipe(r => r.resourceRecordName),
			type: option(1).pipe(r => r.resourceRecordType),
			ttl: toSeconds(minutes(5)),
			records: [option(1).pipe(r => r.resourceRecordValue)],
			allowOverwrite: true,
		},
		{
			replaceOnChanges: ['name', 'type', 'zoneId', 'records'],
		}
	)

	const validation = new aws.acm.CertificateValidation(
		group,
		id,
		{
			certificateArn: certificate.arn,
			validationRecordFqdns: [record1.fqdn, record2.fqdn],
		},
		{
			...(props.dependsOn ? { dependsOn: props.dependsOn } : {}),
			...(props.provider ? { provider: props.provider } : {}),
			replaceOnChanges: ['certificateArn', 'validationRecordFqdns'],
			// The delete-first path would detach the certificate consumers
			// (apigw domain names, distribution tenants) by stripping their
			// certificate field, which the AWS api rejects. The validation
			// is only a waiter, so replacing it create-first costs nothing.
			createBeforeReplace: true,
		}
	)

	return validation
}

export const getDomainNameById = (config: AppConfig, id: string) => {
	const domains = config.domains ?? {}

	if (id in domains) {
		if (domains[id]) {
			return domains[id]!.domain
		}
	}

	throw new TypeError(`No domain registered with id: ${id}`)
}

export const formatFullDomainName = (config: AppConfig, id: string, subDomain?: string) => {
	const domain = getDomainNameById(config, id)

	if (subDomain) {
		return `${subDomain.replace(/\.$/, '')}.${domain}`
	}

	return domain
}
