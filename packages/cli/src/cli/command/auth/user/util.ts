import { log, prompt } from '@awsless/clui'
import { createApp } from '../../../../app.js'
import { AppConfig } from '../../../../config/app.js'
import { StackConfig } from '../../../../config/stack.js'
import { ExpectedError } from '../../../../error.js'
import { Credentials } from '../../../../util/aws.js'
import { createWorkSpace } from '../../../../util/workspace.js'

export type UserPoolProps = AppConfig['auth'][string]

// The user commands all start from the same pool: named, implied when
// there is only one, or picked from a prompt.
export const selectUserPool = async (appConfig: AppConfig, pool?: string) => {
	const pools = Object.keys(appConfig.auth ?? {})

	if (pools.length === 0) {
		throw new ExpectedError('No auth resources are defined.')
	}

	if (pool && !pools.includes(pool)) {
		throw new ExpectedError(`The auth userpool "${pool}" doesn't exist.`)
	}

	let name = pool

	if (!name) {
		if (pools.length === 1) {
			name = pools[0]!
		} else if (process.env.SKIP_PROMPT) {
			throw new ExpectedError(`Pass --pool <name> when running with --skip-prompt: [ ${pools.join(', ')} ]`)
		} else {
			name = await prompt.select({
				message: 'Select the auth userpool:',
				initialValue: pools.at(0),
				options: pools.map(name => ({
					label: name,
					value: name,
				})),
			})
		}
	}

	return { name, props: appConfig.auth[name]! }
}

// The pool id only exists in the deployed state, so the graph is
// hydrated to read it.
export const loadUserPoolId = async (props: {
	appConfig: AppConfig
	stackConfigs: StackConfig[]
	accountId: string
	credentials: Credentials
	name: string
}) => {
	return log.task({
		initialMessage: 'Loading auth userpool...',
		successMessage: 'Done loading auth userpool.',
		errorMessage: 'Failed loading auth userpool.',
		async task() {
			const { shared, app } = createApp({
				appConfig: props.appConfig,
				stackConfigs: props.stackConfigs,
				accountId: props.accountId,
			})

			const { workspace } = await createWorkSpace({
				credentials: props.credentials,
				accountId: props.accountId,
				region: props.appConfig.region,
			})

			await workspace.hydrate(app)

			try {
				return await shared.entry('auth', `user-pool-id`, props.name)
			} catch {
				throw new ExpectedError(`The auth userpool hasn't been deployed yet.`)
			}
		},
	})
}

export const askUsername = async (username?: string) => {
	if (username) {
		return username
	}

	if (process.env.SKIP_PROMPT) {
		throw new ExpectedError('Pass --username <username> when running with --skip-prompt.')
	}

	return prompt.text({
		message: 'Username:',
		validate(value) {
			if (!value) {
				return 'Required'
			}

			return
		},
	})
}

// Mirrors the pool's password policy, so a rejected password fails
// here with a reason instead of with a cognito error.
export const validatePassword = (props: UserPoolProps, value: string | undefined) => {
	if (!value) {
		return 'Required'
	}

	if (value.length < props.password.minLength) {
		return `Min length is ${props.password.minLength}`
	}

	if (props.password.lowercase && value.toUpperCase() === value) {
		return `Should include lowercase characters`
	}

	if (props.password.uppercase && value.toLowerCase() === value) {
		return `Should include uppercase characters`
	}

	if (props.password.numbers && !/\d/.test(value)) {
		return `Should include numbers`
	}

	if (props.password.symbols && !/[ `!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~]/.test(value)) {
		return `Should include symbols`
	}

	return
}
