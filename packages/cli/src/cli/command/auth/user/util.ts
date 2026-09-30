import { prompt } from '@awsless/clui'
import { AppConfig } from '../../../../config/app.js'
import { ExpectedError } from '../../../../error.js'
import { Credentials } from '../../../../util/aws.js'
import { SsmStore } from '../../../../util/ssm.js'
import { createWorkOsClient, WorkOsClient } from '../../../../util/workos.js'

export type AuthEnvironmentProps = AppConfig['auth'][string]

// The user commands all start from the same environment: named, implied
// when there is only one, or picked from a prompt.
export const selectAuthEnvironment = async (appConfig: AppConfig, name?: string) => {
	const names = Object.keys(appConfig.auth ?? {})

	if (names.length === 0) {
		throw new ExpectedError('No auth resources are defined.')
	}

	if (name && !names.includes(name)) {
		throw new ExpectedError(`The auth environment "${name}" doesn't exist.`)
	}

	let selected = name

	if (!selected) {
		if (names.length === 1) {
			selected = names[0]!
		} else if (process.env.SKIP_PROMPT) {
			throw new ExpectedError(`Pass --env <name> when running with --skip-prompt: [ ${names.join(', ')} ]`)
		} else {
			selected = await prompt.select({
				message: 'Select the auth environment:',
				initialValue: names.at(0),
				options: names.map(name => ({ label: name, value: name })),
			})
		}
	}

	return { name: selected, props: appConfig.auth[selected]! }
}

// Nothing in a deployed app carries the api key, so the commands read
// it straight from the app's remote config.
export const createClient = async (props: {
	appConfig: AppConfig
	credentials: Credentials
	auth: AuthEnvironmentProps
}) => {
	const store = new SsmStore({ credentials: props.credentials, appConfig: props.appConfig })
	const apiKey = await store.get(props.auth.apiKey)

	if (!apiKey) {
		throw new ExpectedError(`The "${props.auth.apiKey}" config doesn't hold a WorkOS api key yet.`)
	}

	return createWorkOsClient({ apiKey })
}

export const askEmail = async (email?: string) => {
	if (email) {
		return email
	}

	if (process.env.SKIP_PROMPT) {
		throw new ExpectedError('Pass --email <email> when running with --skip-prompt.')
	}

	return prompt.text({
		message: 'Email:',
		validate(value) {
			if (!value) {
				return 'Required'
			}

			return
		},
	})
}

export const askPassword = async (password?: string) => {
	if (password) {
		return password
	}

	if (process.env.SKIP_PROMPT) {
		throw new ExpectedError('Pass --password <password> when running with --skip-prompt.')
	}

	// WorkOS enforces the environment's own password policy, so a local
	// check would only be an out of date copy of it.
	return prompt.password({
		message: 'Password:',
		validate: value => (value ? undefined : 'Required'),
	})
}

// Roles are assigned through an organization membership, so a role
// always needs an organization to hang off.
export const selectOrganization = async (client: WorkOsClient, name?: string) => {
	const organizations = await client.listOrganizations()

	if (organizations.length === 0) {
		return
	}

	if (name) {
		const found = organizations.find(org => org.id === name || org.name === name)

		if (!found) {
			throw new ExpectedError(`The organization "${name}" doesn't exist.`)
		}

		return found
	}

	if (organizations.length === 1) {
		return organizations[0]!
	}

	if (process.env.SKIP_PROMPT) {
		throw new ExpectedError('Pass --organization <name> when running with --skip-prompt.')
	}

	return prompt.select({
		message: 'Select the organization:',
		initialValue: organizations.at(0),
		options: organizations.map(org => ({ label: org.name, value: org })),
	})
}

export const validateRole = (props: AuthEnvironmentProps, role: string) => {
	if (!(role in props.roles)) {
		throw new ExpectedError(`The role "${role}" doesn't exist.`)
	}
}

export const askRole = async (props: AuthEnvironmentProps, role?: string, current?: string) => {
	if (role) {
		validateRole(props, role)

		return role
	}

	const roles = Object.keys(props.roles)

	if (roles.length === 0 || process.env.SKIP_PROMPT) {
		return current
	}

	return prompt.select({
		message: 'Role:',
		initialValue: current ?? roles.at(0),
		options: roles.map(slug => ({ label: props.roles[slug]!.name, value: slug })),
	})
}
