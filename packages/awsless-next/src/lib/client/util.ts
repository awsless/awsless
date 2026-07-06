export const getBindEnv = (name: string) => {
	return (import.meta as unknown as { env: Record<string, string> }).env[name]
}
