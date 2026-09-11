// AWSLESS_REMOTE_AGENT marks a run by an automated agent, like the claude
// cloud sandbox: aws credentials come from the standard AWS env vars
// only, nothing ever prompts & missing access degrades to a warning.
export const isRemoteAgent = () => {
	return !!process.env.AWSLESS_REMOTE_AGENT && process.env.AWSLESS_REMOTE_AGENT !== '0'
}

const proxyNames = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy'] as const

// The stripped proxy settings live on under this prefix, so the dev
// children still get them.
const childPrefix = 'AWSLESS_CHILD_'

// Applied once at startup, before any prompt or aws client exists.
export const applyRemoteAgentEnv = () => {
	if (!isRemoteAgent()) {
		return
	}

	// Nobody is at the keyboard, so every prompt is skipped as if
	// --skip-prompt was passed.
	process.env.SKIP_PROMPT = '1'

	// The sandbox agent proxy drops the tunnels to aws while direct
	// egress works, so the cli's own signed aws calls go direct. The
	// children keep the proxy through childProxyEnv.
	for (const name of proxyNames) {
		const value = process.env[name]

		if (value) {
			process.env[`${childPrefix}${name}`] ??= value
			delete process.env[name]
		}
	}
}

// The proxy settings as the dev children should see them: the values
// the cli process stripped for itself, or the live ones otherwise.
export const childProxyEnv = (name: string) => {
	return process.env[`${childPrefix}${name}`] ?? process.env[name]
}
