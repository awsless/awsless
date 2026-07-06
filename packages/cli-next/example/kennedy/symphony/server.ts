import { serve, ServerType } from '@hono/node-server'
import { Config } from 'awsless'
import { ChildProcess, spawn, spawnSync } from 'child_process'
import { mkdirSync, writeFileSync } from 'fs'
import { Hono } from 'hono'
import { gunzipSync } from 'zlib'

// Symphony daemon manager + health check sidecar for Fargate.
//
// Symphony is a SINGLE long-lived Elixir/OTP daemon that internally:
//   - Polls an issue tracker (Linear) for candidate issues
//   - Creates isolated workspaces per issue
//   - Spawns Codex agents (one per issue, up to concurrency limit)
//   - Manages state machine transitions, retries, exponential backoff
//   - Hot-reloads WORKFLOW.md every ~1s without restart
//
// This server starts Symphony once and provides:
//   - Port 80: Fargate health check + status proxy
//   - Process monitoring with auto-restart on crash

// --- Config ---

process.env.HOME ??= '/root'

const getOptionalConfig = (name: string) => {
	try {
		return Config[name as keyof typeof Config] as string
	} catch {
		return undefined
	}
}

process.env.GITHUB_TOKEN = Config.GITHUB_TOKEN
process.env.LINEAR_API_KEY = Config.LINEAR_API_KEY

const codexOauthToken = getOptionalConfig('CODEX_OAUTH_TOKEN')?.trim()
const openaiApiKey = getOptionalConfig('OPENAI_API_KEY')?.trim()

if (openaiApiKey) {
	process.env.OPENAI_API_KEY = openaiApiKey
}

const decodeCodexAuthJson = (value: string) => {
	const raw = value.trim()

	const parseObjectJson = (text: string) => {
		const parsed = JSON.parse(text)
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			throw new Error('expected a JSON object')
		}
		return JSON.stringify(parsed)
	}

	try {
		return parseObjectJson(raw)
	} catch {
		// Fall through. This commonly happens when the secret is stored as compressed transport text
		// to stay below SSM's 4 KB string limit.
	}

	try {
		const inflated = gunzipSync(Buffer.from(raw, 'base64')).toString('utf8')
		return parseObjectJson(inflated)
	} catch (error) {
		const message = error instanceof Error ? error.message : 'unknown error'
		throw new Error(`Invalid CODEX_OAUTH_TOKEN: expected raw JSON or gzip+base64 JSON (${message})`)
	}
}

function ensureCodexAuth() {
	if (codexOauthToken) {
		const authJson = decodeCodexAuthJson(codexOauthToken)

		mkdirSync('/root/.codex', {
			recursive: true,
			mode: 0o700,
		})

		writeFileSync('/root/.codex/auth.json', authJson, {
			mode: 0o600,
		})

		return
	}

	const apiKey = process.env.OPENAI_API_KEY?.trim()

	if (!apiKey) {
		throw new Error('Missing Codex auth: set CODEX_OAUTH_TOKEN or OPENAI_API_KEY')
	}

	// `startupCommand` only sees CONFIG_* indirection, not the resolved secret. Authenticate here,
	// after the stack config has been loaded from SSM and exported into the process environment.
	const result = spawnSync('codex', ['login', '--with-api-key'], {
		input: `${apiKey}\n`,
		encoding: 'utf8',
		env: { ...process.env },
	})

	if (result.status !== 0 || result.error) {
		const error = result.error?.message || result.stderr.trim() || result.stdout.trim() || `exit ${result.status}`
		throw new Error(`Codex login failed: ${error}`)
	}
}

// --- Symphony daemon ---

const SYMPHONY_BIN = '/opt/symphony/elixir/bin/symphony'
const SYMPHONY_PORT = '4001'
const WORKFLOW_PATH = '/tmp/workflow.md'

writeFileSync(
	WORKFLOW_PATH,
	`\
---
tracker:
    kind: linear
    api_key: $LINEAR_API_KEY
    project_slug: b5a3c59dc8db
    active_states:
        - Todo
        - In Progress
        - Rework
    terminal_states:
        - Done
        - Closed
        - Cancelled
        - Canceled
        - Duplicate
polling:
    interval_ms: 60000
human_review_state: Human Review
merging_state: Merging
agent:
    max_concurrent_agents: 5
codex:
    command: codex --full-auto --config shell_environment_policy.inherit=all --config model_reasoning_effort=xhigh --model gpt-5.4 app-server
workspace:
    root: /root/workspaces
hooks:
    after_create: |
        echo "$GITHUB_TOKEN" | gh auth login --with-token
        gh auth setup-git
        git clone https://github.com/camelot-org/ccs.git .
---

You are an autonomous software engineer working on {{ issue.identifier }}: {{ issue.title }}.

## State Routing

Determine the current state of this issue and follow the appropriate flow:

### Todo
1. Read the issue description carefully: {{ issue.description }}
2. Create or update a tracking comment on the issue with your implementation plan
3. Move the issue to "In Progress"
4. Begin implementation

### In Progress
1. Read your tracking comment to understand current progress
{% if attempt == nil %}
2. Plan your approach before writing code — spend effort on design and verification strategy
3. Reproduce the current behavior/issue before changing code
{% else %}
4. Review what failed in attempt {{ attempt }} and adjust your approach
{% endif %}
5. Create a git branch for this issue if you are still on the default branch
6. Implement the changes following existing code patterns and conventions
7. Write or update tests for your changes
8. Run the full test suite to verify nothing is broken
9. Commit with a descriptive message referencing {{ issue.identifier }}
10. Open a pull request and move the issue to "Human Review"

### Rework
1. Read ALL review comments on the pull request
2. Identify exactly what the reviewer wants changed
3. Make targeted fixes addressing each review comment
4. Ensure you are on the correct existing branch for this issue before editing
5. Run the test suite again
6. Push updates to the existing PR
7. Move the issue back to "Human Review"

### Human Review
No action needed. Wait for human decision.

### Merging
Execute the merge if CI is green. Do not force merge.

## Constraints

- Work ONLY within the provided workspace directory
- Follow existing code style and patterns — do not introduce new conventions
- Do not modify files unrelated to the issue
- Do not install new dependencies without explicit approval in the issue
- If blocked by missing permissions, secrets, or unclear requirements, stop and comment on the issue

## Verification

Before marking work complete, ensure:
- All new code has test coverage
- The full test suite passes
- No linter errors are introduced
- Changes are scoped to what the issue requests — nothing more
`
)

let symphonyProcess: ChildProcess | undefined
let restartCount = 0

ensureCodexAuth()

function startSymphony() {
	symphonyProcess = spawn(
		SYMPHONY_BIN,
		[
			'--port',
			SYMPHONY_PORT,
			'--logs-root',
			'/tmp/symphony-logs',
			'--i-understand-that-this-will-be-running-without-the-usual-guardrails',
			WORKFLOW_PATH,
		],
		{
			stdio: ['ignore', 'pipe', 'pipe'],
			env: { ...process.env },
		}
	)

	symphonyProcess.stdout?.on('data', d => console.log(`[symphony] ${d}`))
	symphonyProcess.stderr?.on('data', d => console.error(`[symphony] ${d}`))

	symphonyProcess.on('exit', (code, signal) => {
		console.error(`Symphony exited (code=${code}, signal=${signal})`)
		symphonyProcess = undefined

		const delay = Math.min(1000 * Math.pow(2, restartCount), 60_000)
		restartCount++
		console.log(`Restarting Symphony in ${delay}ms (attempt ${restartCount})`)
		setTimeout(startSymphony, delay)
	})

	// Reset backoff after 30s of stable running
	setTimeout(() => {
		if (symphonyProcess) restartCount = 0
	}, 30_000)
}

startSymphony()

// --- Health check sidecar (port 80) ---

const app = new Hono()
	.get('/health', c => {
		if (symphonyProcess && !symphonyProcess.killed) {
			return c.text('OK')
		}
		return c.text('Symphony not running', 503)
	})
	.get('/status', async c => {
		try {
			const res = await fetch(`http://127.0.0.1:${SYMPHONY_PORT}/api/v1/state`)
			const data = await res.json()
			return c.json(data)
		} catch {
			return c.json({ error: 'Symphony not reachable' }, 503)
		}
	})

let server: ServerType | undefined

server = serve({ fetch: app.fetch, port: 80 }, info => {
	console.log(`Health check sidecar on port ${info.port}`)
	console.log('version 4')
})

// --- Graceful shutdown ---

const shutdown = () => {
	console.log('Shutting down...')
	if (symphonyProcess) {
		symphonyProcess.kill('SIGTERM')
	}
	server?.close()
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

export { app, server }
