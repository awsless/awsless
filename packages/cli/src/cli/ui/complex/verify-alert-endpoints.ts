import {
	CreateSMSSandboxPhoneNumberCommand,
	GetSMSSandboxAccountStatusCommand,
	ListSMSSandboxPhoneNumbersCommand,
	ListSubscriptionsByTopicCommand,
	SNSClient,
	VerificationException,
	VerifySMSSandboxPhoneNumberCommand,
} from '@aws-sdk/client-sns'
import { log, prompt } from '@awsless/clui'
import { AppConfig } from '../../../config/app.js'
import { configRefName, isConfigRef } from '../../../config/schema/config-ref.js'
import { isEmail } from '../../../config/schema/email.js'
import { isPhone } from '../../../config/schema/phone.js'
import { Credentials } from '../../../util/aws.js'
import { formatGlobalResourceName } from '../../../util/name.js'

type Props = {
	credentials: Credentials
	appConfig: AppConfig
	accountId: string
	configValues: Record<string, string>
}

type ResolvedAlerts = Record<string, string[]>

export const verifyAlertEndpoints = async (props: Props) => {
	const alerts = resolveAlertEndpoints(props)

	if (Object.keys(alerts).length === 0) {
		return
	}

	const client = new SNSClient({
		credentials: props.credentials,
		region: props.appConfig.region,
	})

	await verifySmsNumbers(client, alerts)
	await checkEmailSubscriptions(client, props, alerts)
}

// Config referenced endpoints resolve to their remote value, so the
// checks below always see the real email addresses & phone numbers.
// References with a missing or empty value are silently ignored.
const resolveAlertEndpoints = (props: Props): ResolvedAlerts => {
	const alerts: ResolvedAlerts = {}

	for (const [id, endpoints] of Object.entries(props.appConfig.defaults.alerts ?? {})) {
		const resolved: string[] = []

		for (const endpoint of endpoints) {
			if (!isConfigRef(endpoint)) {
				resolved.push(endpoint)
				continue
			}

			const value = props.configValues[configRefName(endpoint)]?.trim()

			if (value) {
				resolved.push(value)
			}
		}

		alerts[id] = resolved
	}

	return alerts
}

// ---------------------------------------------------
// While an AWS account is inside the SNS SMS sandbox, alert messages
// are only delivered to verified destination phone numbers.

const listAlertPhoneNumbers = (alerts: ResolvedAlerts) => {
	const numbers = new Set<string>()

	for (const endpoints of Object.values(alerts)) {
		for (const endpoint of endpoints) {
			if (isPhone(endpoint)) {
				numbers.add(endpoint)
			}
		}
	}

	return [...numbers]
}

const listVerifiedNumbers = async (client: SNSClient) => {
	const verified = new Set<string>()
	let nextToken: string | undefined

	do {
		const result = await client.send(
			new ListSMSSandboxPhoneNumbersCommand({
				NextToken: nextToken,
			})
		)

		for (const entry of result.PhoneNumbers ?? []) {
			if (entry.PhoneNumber && entry.Status === 'Verified') {
				verified.add(entry.PhoneNumber)
			}
		}

		nextToken = result.NextToken
	} while (nextToken)

	return verified
}

const verifyNumber = async (client: SNSClient, phoneNumber: string) => {
	await client.send(
		new CreateSMSSandboxPhoneNumberCommand({
			PhoneNumber: phoneNumber,
		})
	)

	let attempt = 0

	while (attempt < 5) {
		attempt++

		const code = await prompt.text({
			message: `Enter the verification code sent to ${phoneNumber}:`,
		})

		try {
			await client.send(
				new VerifySMSSandboxPhoneNumberCommand({
					PhoneNumber: phoneNumber,
					OneTimePassword: code.trim(),
				})
			)

			log.step(`Verified ${phoneNumber} for SMS delivery.`)

			return true
		} catch (error) {
			if (error instanceof VerificationException) {
				log.warning(`The verification code is invalid.`)
				continue
			}

			throw error
		}
	}

	return false
}

const verifySmsNumbers = async (client: SNSClient, alerts: ResolvedAlerts) => {
	const phoneNumbers = listAlertPhoneNumbers(alerts)

	if (phoneNumbers.length === 0) {
		return
	}

	const status = await client.send(new GetSMSSandboxAccountStatusCommand({}))

	if (!status.IsInSandbox) {
		return
	}

	const verified = await listVerifiedNumbers(client)
	const unverified = phoneNumbers.filter(phoneNumber => !verified.has(phoneNumber))

	for (const phoneNumber of unverified) {
		const warning = `The alert phone number ${phoneNumber} hasn't been verified yet & won't receive any SMS messages while your AWS account is inside the SNS SMS sandbox.`

		if (process.env.SKIP_PROMPT) {
			log.warning(warning)
			continue
		}

		const confirmed = await prompt.confirm({
			message: `Your AWS account is inside the SNS SMS sandbox. Send a verification code to ${phoneNumber}?`,
		})

		if (!confirmed) {
			log.warning(warning)
			continue
		}

		const done = await verifyNumber(client, phoneNumber)

		if (!done) {
			log.warning(warning)
		}
	}
}

// ---------------------------------------------------
// SNS emails a confirmation link when an email subscription is created
// & delivers nothing until the recipient has clicked it.

const listEmailSubscriptions = async (client: SNSClient, topicArn: string) => {
	const confirmed = new Set<string>()
	const pending = new Set<string>()
	let nextToken: string | undefined

	do {
		const result = await client.send(
			new ListSubscriptionsByTopicCommand({
				TopicArn: topicArn,
				NextToken: nextToken,
			})
		)

		for (const subscription of result.Subscriptions ?? []) {
			if (subscription.Protocol !== 'email' || !subscription.Endpoint) {
				continue
			}

			if (subscription.SubscriptionArn === 'PendingConfirmation') {
				pending.add(subscription.Endpoint)
			} else {
				confirmed.add(subscription.Endpoint)
			}
		}

		nextToken = result.NextToken
	} while (nextToken)

	return { confirmed, pending }
}

const checkEmailSubscriptions = async (client: SNSClient, props: Props, alerts: ResolvedAlerts) => {
	for (const [id, endpoints] of Object.entries(alerts)) {
		const emails = endpoints.filter(endpoint => isEmail(endpoint))

		if (emails.length === 0) {
			continue
		}

		const name = formatGlobalResourceName({
			appName: props.appConfig.name,
			resourceType: 'alert',
			resourceName: id,
		})

		const topicArn = `arn:aws:sns:${props.appConfig.region}:${props.accountId}:${name}`
		const { confirmed, pending } = await listEmailSubscriptions(client, topicArn)

		for (const email of emails) {
			if (confirmed.has(email) || !pending.has(email)) {
				continue
			}

			log.warning(
				`The alert email ${email} hasn't confirmed its "${id}" subscription yet & won't receive any messages until the emailed confirmation link is clicked.`
			)
		}
	}
}
