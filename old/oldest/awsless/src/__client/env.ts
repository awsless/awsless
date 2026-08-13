type MetaEnv = {
	env: Record<string, string>
}

export const getEnv = (name: string) => {
	const env = (import.meta as unknown as MetaEnv).env
	return env[`AWSLESS_CLIENT_${name}`]
}
