export const config = JSON.parse(process.env.RPC_CONFIG ?? '{}') as {
	auth?: string
	functions: Record<string, string>
}
