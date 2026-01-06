import { log, prompt } from '@awsless/clui'

type StaticCredentials = {
	accessKeyId: string
	secretAccessKey: string
}

export const fetchCredentials = async (profile: string): Promise<StaticCredentials> => {
	let credentialsString = await Bun.secrets.get({
		service: 'awsless',
		name: profile,
	})

	if (!credentialsString) {
		const accessKeyId = await prompt.password({
			message: 'Enter your AWS access key ID',
			validate: (value: string) => {
				if (!validateCredentialKey('accessKeyId', value)) {
					return 'Invalid AWS access key ID'
				}

				return
			},
		})

		const secretAccessKey = await prompt.password({
			message: 'Enter your AWS secret access key',
			validate: (value: string) => {
				if (!validateCredentialKey('secretAccessKey', value)) {
					return 'Invalid AWS secret access key'
				}

				return
			},
		})

		await log.task({
			initialMessage: 'Saving AWS credentials ...',
			successMessage: 'AWS credentials saved successfully',
			errorMessage: 'Failed to save AWS credentials',
			task: async () => {
				await Bun.secrets.set({
					service: 'awsless',
					name: profile,
					value: `${accessKeyId!}:${secretAccessKey!}`,
				})
			},
		})

		credentialsString = `${accessKeyId}:${secretAccessKey}`
	}

	const credentials = credentialsString!.split(':')

	if (
		credentials.length !== 2 ||
		!validateCredentialKey('accessKeyId', credentials[0]!) ||
		!validateCredentialKey('secretAccessKey', credentials[1]!)
	) {
		throw new Error('Invalid AWS credentials')
	}

	return {
		accessKeyId: credentials[0]!,
		secretAccessKey: credentials[1]!,
	}
}

const validateCredentialKey = (key: string, value: string) => {
	if (!value) return false

	const AWS_ACCESS_KEY_ID_REGEX = /^(AKIA|ASIA|AROA|AIDA)[A-Z0-9]{16}$/
	const AWS_SECRET_ACCESS_KEY_REGEX = /^[A-Za-z0-9/+=]{40}$/

	if (key === 'accessKeyId') {
		return AWS_ACCESS_KEY_ID_REGEX.test(value)
	}

	if (key === 'secretAccessKey') {
		return AWS_SECRET_ACCESS_KEY_REGEX.test(value)
	}

	return false
}
