// A sandboxed function deploys as its own lambda, held to its allowlist by
// IAM. `awsless dev` runs it inside the shared bundle, where nothing holds
// it, so the dev environment names the limits here to fail the same calls.

export type DevSandbox = {
	// The bundle routes it may invoke.
	routes: string[]
	// The config values it may read, kebab-cased.
	configs: string[]
	// The AWS services its own permissions name.
	services: string[]
}

let sandboxes: Record<string, DevSandbox> | undefined

export const getDevSandbox = (routeKey?: string): DevSandbox | undefined => {
	if (!routeKey || !process.env.AWSLESS_DEV_SANDBOX) {
		return
	}

	sandboxes ??= JSON.parse(process.env.AWSLESS_DEV_SANDBOX) as Record<string, DevSandbox>

	return sandboxes[routeKey]
}
