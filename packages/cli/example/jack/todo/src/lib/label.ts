import { Config } from 'awsless'

export type Label = 'work' | 'home' | 'health'

// A fake model, so the example evals run for free. A real app would call
// its model provider here with an api key from the config.
export const labelTask = async (name: string): Promise<Label> => {
	// The example has no model api key, so the admin secret stands in.
	if (!Config.ADMIN_SECRET) {
		throw new Error('The model api key is missing.')
	}

	const text = name.toLowerCase()

	if (/meeting|report|deploy|email/.test(text)) {
		return 'work'
	}

	if (/gym|run|doctor|dentist/.test(text)) {
		return 'health'
	}

	return 'home'
}
