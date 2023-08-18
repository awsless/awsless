
import { z } from 'zod'
import { definePlugin } from '../plugin.js';
import { DurationSchema } from '../schema/duration.js';
import { HostedZone } from '../formation/resource/route53/hosted-zone.js';
import { Certificate } from '../formation/resource/certificate-manager/certificate.js';
import { RecordSetGroup } from '../formation/resource/route53/record-set-group.js';
import { Function } from '../formation/resource/lambda/function.js';
import { Code } from '../formation/resource/lambda/code.js';
import { deleteHostedZoneRecordsHandlerCode } from '../custom/delete-hosted-zone/handler.js';
import { CustomResource } from '../formation/resource/cloud-formation/custom-resource.js';

const DomainNameSchema = z.string().regex(/[a-z\-\_\.]/g, 'Invalid domain name')

export const domainPlugin = definePlugin({
	name: 'domain',
	schema: z.object({
		/** Define the domains for your application.
		 * @example
		 * {
		 *   domains: {
		 *     'example.com': [{
		 *       name: 'www',
		 *       type: 'TXT',
		 *       ttl: '60 seconds',
		 *       records: [ 'value' ]
		 *     }]
		 *   }
		 * }
		 */
		domains: z.record(DomainNameSchema, z.object({
			/** Enter a fully qualified domain name, for example, www.example.com.
			 * You can optionally include a trailing dot.
			 * If you omit the trailing dot, Amazon Route 53 assumes that the domain name that you specify is fully qualified.
			 * This means that Route 53 treats www.example.com (without a trailing dot) and www.example.com. (with a trailing dot) as identical.
			 */
			name: DomainNameSchema.optional(),

			/** The DNS record type. */
			type: z.enum([ 'A', 'AAAA', 'CAA', 'CNAME', 'DS', 'MX', 'NAPTR', 'NS', 'PTR', 'SOA', 'SPF', 'SRV', 'TXT' ]),

			/** The resource record cache time to live (TTL) */
			ttl: DurationSchema,

			/** One or more values that correspond with the value that you specified for the Type property. */
			records: z.string().array(),
		}).array()).optional(),
	}),
	onApp({ config, bootstrap, usEastBootstrap }) {

		const domains = Object.entries(config.domains || {})

		if(domains.length === 0) {
			return
		}

		const lambda = new Function('delete-hosted-zone', {
			name: `${config.name}-delete-hosted-zone`,
			code: Code.fromInline(deleteHostedZoneRecordsHandlerCode, 'index.handler'),
		})

		lambda.addPermissions({
			actions: [
				'route53:ListResourceRecordSets',
				'route53:ChangeResourceRecordSets',
			],
			resources: [ '*' ]
		})

		usEastBootstrap.add(lambda)

		for(const [ domain, records ] of domains) {
			const hostedZone = new HostedZone(domain)

			const usEastCertificate = new Certificate(domain, {
				hostedZoneId: hostedZone.id,
				alternativeNames: [ `*.${domain}` ],
			})

			const custom = new CustomResource(domain, {
				serviceToken: lambda.arn,
				properties: {
					hostedZoneId: hostedZone.id,
				}
			}).dependsOn(hostedZone)

			usEastBootstrap
				.add(custom)
				.add(hostedZone)
				.add(usEastCertificate)
				.export(`certificate-${domain}-arn`, usEastCertificate.arn)
				.export(`hosted-zone-${domain}-id`, hostedZone.id)

			const certificate = new Certificate(domain, {
				hostedZoneId: usEastBootstrap.import(`hosted-zone-${domain}-id`),
				alternativeNames: [ `*.${domain}` ],
			})

			bootstrap
				.add(certificate)
				.export(`certificate-${domain}-arn`, certificate.arn)

			if(records.length > 0) {
				const group = new RecordSetGroup(domain, {
					hostedZoneId: hostedZone.id,
					records,
				}).dependsOn(hostedZone)

				usEastBootstrap.add(group)
			}
		}
	},
})
