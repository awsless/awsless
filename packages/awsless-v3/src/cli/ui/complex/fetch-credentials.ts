import { log, prompt } from '@awsless/clui'

type StaticCredentials = {
	accessKeyId: string
	secretAccessKey: string
}

export const fetchCredentials = async (profile: string): Promise<StaticCredentials> => {
	let credentialsString = await Bun.secrets.get({
		service: `${profile}`,
		name: 'awsless',
	})

	if (!credentialsString) {
		let accessKeyId = await prompt.password({
			message: 'Enter your AWS access key ID',
			mask: '*',
			validate: (value: string) => {
				const AWS_ACCESS_KEY_ID_REGEX = /^(AKIA|ASIA|AROA|AIDA)[A-Z0-9]{16}$/

				if (!AWS_ACCESS_KEY_ID_REGEX.test(value)) {
					log.error('Invalid AWS access key ID')
					process.exit(1)
				}

				return undefined
			},
		})

		log.success('Valid AWS access key ID')

		let secretAccessKey = await prompt.password({
			message: 'Enter your AWS secret access key',
			mask: '*',
			validate: (value: string) => {
				const AWS_SECRET_ACCESS_KEY_REGEX = /^[A-Za-z0-9/+=]{40}$/

				if (!AWS_SECRET_ACCESS_KEY_REGEX.test(value)) {
					log.error('Invalid AWS secret access key')
					process.exit(1)
				}

				return undefined
			},
		})

		log.success('Valid AWS secret access key')

		log.task({
			initialMessage: 'Saving AWS credentials ...',
			successMessage: 'AWS credentials saved successfully',
			errorMessage: 'Failed to save AWS credentials',
			task: async () => {
				await Bun.secrets.set({
					service: `${profile}`,
					name: 'awsless',
					value: `${accessKeyId!}:${secretAccessKey!}`,
				})
			},
		})

		credentialsString = `${accessKeyId}:${secretAccessKey}`
	}

	const credentials = credentialsString!.split(':')

	return {
		accessKeyId: credentials[0]!,
		secretAccessKey: credentials[1]!,
	}
}
