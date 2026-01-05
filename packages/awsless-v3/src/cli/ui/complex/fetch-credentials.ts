import { log, prompt } from '@awsless/clui'

type StaticCredentials = {
	accessKeyId: string
	secretAccessKey: string
}

export const fetchCredentials = async (profile: string): Promise<StaticCredentials> => {
	let accessKeyId = await Bun.secrets.get({
		service: `${profile}-aws-credentials`,
		name: 'access-key',
	})
	let secretAccessKey = await Bun.secrets.get({
		service: `${profile}-aws-credentials`,
		name: 'secret-key',
	})

	if (!accessKeyId || !secretAccessKey) {
		accessKeyId = await prompt.password({
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

		secretAccessKey = await prompt.password({
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
			initialMessage: 'Saving AWS credentials in Bun secrets',
			successMessage: 'AWS credentials saved successfully',
			errorMessage: 'Failed to save AWS credentials',
			task: async () => {
				await Bun.secrets.set({
					service: `${profile}-aws-credentials`,
					name: 'access-key',
					value: accessKeyId!,
				})
				await Bun.secrets.set({
					service: `${profile}-aws-credentials`,
					name: 'secret-key',
					value: secretAccessKey!,
				})
			},
		})

		log.success('AWS credentials saved successfully')
	}

	return {
		accessKeyId,
		secretAccessKey,
	}
}
