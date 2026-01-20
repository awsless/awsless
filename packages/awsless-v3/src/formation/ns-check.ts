import { GetHostedZoneCommand, Route53Client } from '@aws-sdk/client-route-53'
import { createCustomProvider, createCustomResourceClass, Input } from '@terraforge/core'
import { resolveNs } from 'node:dns/promises'
import { z } from 'zod'
import { color, icon } from '../cli/ui/style'
import { Region } from '../config/schema/region'

type NsCheckInput = {
	zoneId: Input<string>
}

export const NsCheck = createCustomResourceClass<NsCheckInput, {}>('nameservers', 'check')

type ProviderProps = {
	profile: string
	region: Region
}

export const createNameServersProvider = ({ profile, region }: ProviderProps) => {
	const client = new Route53Client({ profile, region })

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
				const resovledNameServers = await resolveNs(domainName)

				if (JSON.stringify(nameServers) !== JSON.stringify(resovledNameServers)) {
					throw new Error(
						[
							`Expected nameservers don't match for domain:`,
							`${color.info(domainName)} ${color.normal.dim(icon.arrow.right)} ${color.normal.dim(state.zoneId)}`,
							'',
							'Current:',
							...resovledNameServers.map(n => color.normal(n)),
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
