import { getRouteEnv } from 'awsless'

type FunctionDetails = {
	name: string
	lock?: boolean
}

// Every callable query is whitelisted in the baked bundle env.
export const getFunctionDetails = (name: string): FunctionDetails | undefined => {
	const entry = getRouteEnv(`QUERY:${name}`)

	if (!entry) {
		return
	}

	const details = JSON.parse(entry)

	return {
		name: details.function,
		lock: details.lock,
	}
}
