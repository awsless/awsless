import { log } from '@awsless/clui'
import { Command } from 'commander'
import { Deployment, listDeployments, readLiveDeploymentId } from '../../util/deployment.js'
import { layout } from '../ui/complex/layout.js'
import { color } from '../ui/style.js'
import { createClients } from './util.js'

const formatAge = (iso: string) => {
	const minutes = Math.floor((Date.now() - Date.parse(iso)) / 60_000)

	if (minutes < 1) return 'just now'
	if (minutes < 60) return `${minutes}m ago`
	if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h ago`

	return `${Math.floor(minutes / (60 * 24))}d ago`
}

const formatStatus = (item: Deployment, liveId?: string) => {
	if (item.id === liveId) return color.success('live    ')
	if (item.promotedAt) return 'promoted'
	if (item.functionVersion) return color.info('staged  ')

	return color.dim('pending ')
}

export const deployments = (program: Command) => {
	program
		.command('deployments')
		.description('List the deployment history of your app')
		.action(async () => {
			await layout('deployments', async ({ appConfig }) => {
				const { appId, functionName, dynamo, lambda } = await createClients(appConfig)

				const [items, liveId] = await Promise.all([
					listDeployments(dynamo, appId),
					readLiveDeploymentId(lambda, functionName),
				])

				if (items.length === 0) {
					return `No deployments found.`
				}

				const idWidth = Math.max(...items.map(item => item.id.length))

				log.message(
					items
						.map(item =>
							[
								color.label(item.id.padEnd(idWidth)),
								formatStatus(item, liveId),
								formatAge(item.createdAt).padEnd(8),
								color.dim(item.commit?.slice(0, 7) ?? '-------'),
								(item.message ?? '').slice(0, 50).padEnd(50),
								color.dim(item.user ?? ''),
							].join('  ')
						)
						.join('\n')
				)

				return `Found ${items.length} deployments.`
			})
		})
}
