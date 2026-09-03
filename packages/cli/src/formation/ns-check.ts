import { GetHostedZoneCommand, Route53Client } from '@aws-sdk/client-route-53'
import { createCustomProvider, createCustomResourceClass, Input } from '@terraforge/core'
import { z } from 'zod'
import { color, icon } from '../cli/ui/style.js'
import { Region } from '../config/schema/region.js'
import { Credentials } from '../util/aws.js'

type NsCheckInput = {
	zoneId: Input<string>
}

export const NsCheck = createCustomResourceClass<NsCheckInput, {}>('nameservers', 'check')

// Resolve through public DNS, so a stale local resolver cache can't fail the check.
const resolveNameServers = async (domainName: string) => {
	const response = await fetch(`https://dns.google/resolve?name=${domainName}&type=NS`)

	const result = z
		.object({
			Status: z.number(),
			Answer: z.object({ type: z.number(), data: z.string() }).array().optional(),
		})
		.parse(await response.json())

	if (result.Status !== 0) {
		throw new Error(`queryNs status ${result.Status} ${domainName}`)
	}

	return (result.Answer ?? []).filter(answer => answer.type === 2).map(answer => answer.data.replace(/\.$/, ''))
}

type ProviderProps = {
	credentials: Credentials
	region: Region
}

export const createNameServersProvider = ({ credentials, region }: ProviderProps) => {
	const client = new Route53Client({ credentials, region })

	return createCustomProvider('nameservers', {
		check: {
			async createResource(props) {
				const state = z
					.object({
						zoneId: z.string(),
					})
					.parse(props.state)

				const result = await client.send(
					new GetHostedZoneCommand({
						Id: state.zoneId,
					})
				)

				const response = z
					.object({
						HostedZone: z.object({
							Name: z.string(),
						}),
						DelegationSet: z.object({
							NameServers: z.string().array(),
						}),
					})
					.parse(result)

				const nameServers = response.DelegationSet.NameServers
				const domainName = response.HostedZone.Name.replace(/\.$/, '')
				let resolvedNameServers: string[]
				try {
					resolvedNameServers = await resolveNameServers(domainName)
				} catch (error) {
					throw new Error(
						[
							`Failed to load the nameservers for:`,
							`${color.normal(domainName)} ${color.normal.dim(icon.arrow.right)} ${color.normal(state.zoneId)}`,
							'',
							error instanceof Error ? error.message : '',
							'',
							color.warning(`Set expected nameservers:`),
							...nameServers.map(n => color.normal(n)),
						].join('\n'),
						{ cause: error }
					)
				}

				if (!compareNameServers(nameServers, resolvedNameServers)) {
					throw new Error(
						[
							`Expected nameservers don't match for domain:`,
							`${color.normal(domainName)} ${color.normal.dim(icon.arrow.right)} ${color.normal(state.zoneId)}`,
							``,
							'Current:',
							...resolvedNameServers.map(n => color.normal(n)),
							'',
							color.success(`Expected:`),
							...nameServers.map(n => color.normal(n)),
						].join('\n')
					)
				}

				return {}
			},
		},
	})
}

const compareNameServers = (left: string[], right: string[]) => {
	if (left.length !== right.length) {
		return false
	}

	for (const ns of right) {
		if (!left.includes(ns)) {
			return false
		}
	}

	return true
}
