import { log } from '@awsless/clui'
import { aws } from '@terraforge/aws'
import { color, icon } from '../../ui/style.js'

export const logDomainZones = async (zones: aws.route53.Zone[]) => {
	for (const zone of zones) {
		log.step(
			[
				//
				color.label.green(await zone.name),
				color.dim(icon.arrow.right),
				color.dim(await zone.id),
			].join(' ')
		)

		log.message((await zone.nameServers).join('\n'))
	}
}
