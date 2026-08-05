import { z } from 'zod'
import { DurationSchema } from '../../config/schema/duration.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'

const DomainNameSchema = z
	.string()
	.regex(/[a-z\-\_\.]/g, 'Invalid domain name')
	.describe(
		'Enter a fully qualified domain name, for example, www.example.com. You can optionally include a trailing dot. If you omit the trailing dot, Amazon Route 53 assumes that the domain name that you specify is fully qualified. This means that Route 53 treats www.example.com (without a trailing dot) and www.example.com. (with a trailing dot) as identical.'
	)

const DNSTypeSchema = z
	.enum(['A', 'AAAA', 'CAA', 'CNAME', 'DS', 'MX', 'NAPTR', 'NS', 'PTR', 'SOA', 'SPF', 'SRV', 'TXT'])
	.describe('The DNS record type.')

const TTLSchema = DurationSchema.describe('The resource record cache time to live (TTL).')

const RecordsSchema = z
	.string()
	.array()
	.describe('One or more values that correspond with the value that you specified for the Type property.')

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
export const DomainsDefaultSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			domain: DomainNameSchema.describe('Define the domain name'),
			dns: z
				.object({
					name: DomainNameSchema.optional(),
					type: DNSTypeSchema,
					ttl: TTLSchema,
					records: RecordsSchema,
				})
				.array()
				.optional()
				.describe('Define the domain dns records'),
		})
	)
	.optional()
	.describe('Define the domains for your application.')
