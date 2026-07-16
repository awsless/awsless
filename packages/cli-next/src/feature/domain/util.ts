import { minutes, toSeconds } from '@awsless/duration'
import { DataSource, Group, Input, Resource } from '@terraforge/core'
import { aws } from '@terraforge/aws'
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
		props.provider ? { provider: props.provider } : undefined
	)

	const option = (index: number) => {
		return certificate.domainValidationOptions.pipe(options => {
			return options[index]!
		})
	}

	const record1 = new aws.route53.Record(group, `${props.recordIdPrefix}-1`, {
		zoneId: props.zoneId,
		name: option(0).pipe(r => r.resourceRecordName),
		type: option(0).pipe(r => r.resourceRecordType),
		ttl: toSeconds(minutes(5)),
		records: [option(0).pipe(r => r.resourceRecordValue)],
		allowOverwrite: true,
	})

	const record2 = new aws.route53.Record(group, `${props.recordIdPrefix}-2`, {
		zoneId: props.zoneId,
		name: option(1).pipe(r => r.resourceRecordName),
		type: option(1).pipe(r => r.resourceRecordType),
		ttl: toSeconds(minutes(5)),
		records: [option(1).pipe(r => r.resourceRecordValue)],
		allowOverwrite: true,
	})

	const validation = new aws.acm.CertificateValidation(
		group,
		id,
		{
			certificateArn: certificate.arn,
			validationRecordFqdns: [record1.fqdn, record2.fqdn],
		},
		props.provider || props.dependsOn
			? {
					...(props.dependsOn ? { dependsOn: props.dependsOn } : {}),
					...(props.provider ? { provider: props.provider } : {}),
				}
			: undefined
	)

	return validation
}

export const getDomainNameById = (config: AppConfig, id: string) => {
	const domains = config.defaults.domains ?? {}

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
