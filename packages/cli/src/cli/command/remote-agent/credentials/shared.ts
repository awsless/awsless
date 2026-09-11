import { IAMClient } from '@aws-sdk/client-iam'
import { log } from '@awsless/clui'
import { AppConfig } from '../../../../config/app.js'
import { getAccountId, getCredentials } from '../../../../util/aws.js'
import { buildRemoteAgentPolicy, RemoteAgentIam } from '../../../../util/remote-agent-iam.js'
import { color } from '../../../ui/style.js'

export const createRemoteAgentIam = async (appConfig: AppConfig) => {
	const credentials = await getCredentials(appConfig.profile)
	const accountId = await getAccountId(credentials, appConfig.region)
	const client = new IAMClient({ region: appConfig.region, credentials })
	const iam = new RemoteAgentIam(client, appConfig.name)
	const policy = buildRemoteAgentPolicy({
		appName: appConfig.name,
		region: appConfig.region,
		accountId,
		auth: Object.keys(appConfig.auth ?? {}).length > 0,
	})

	return { iam, policy }
}

// The user & policy are idempotent: running the command again only
// repairs a drifted policy.
export const ensureRemoteAgentUser = async (iam: RemoteAgentIam, policy: ReturnType<typeof buildRemoteAgentPolicy>) => {
	const user = await log.task({
		initialMessage: `Ensuring the ${iam.userName} IAM user...`,
		successMessage: `The ${iam.userName} IAM user is in place.`,
		errorMessage: `Failed to ensure the ${iam.userName} IAM user.`,
		task: () => iam.ensureUser(),
	})

	const state = await log.task({
		initialMessage: 'Ensuring the remote agent policy...',
		successMessage: 'The remote agent policy is in place.',
		errorMessage: 'Failed to ensure the remote agent policy.',
		task: () => iam.ensurePolicy(policy),
	})

	return { user, policy: state }
}

// The secret only ever exists in this output - it is never stored.
export const printCredentials = (appConfig: AppConfig, key: { id: string; secret: string }) => {
	log.list('Remote agent environment', {
		AWSLESS_REMOTE_AGENT: '1',
		AWS_REGION: appConfig.region,
		AWS_ACCESS_KEY_ID: key.id,
		AWS_SECRET_ACCESS_KEY: key.secret,
	})

	log.warning(
		`The secret access key is shown only once. Copy these variables into the agent environment now - ` +
			`run ${color.info('awsless remote-agent credentials rotate')} to get a new one later.`
	)
}
