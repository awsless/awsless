import { serve, ServerType } from '@hono/node-server'
import { Config } from 'awsless'
import { ChildProcess, spawn } from 'child_process'
import { writeFileSync } from 'fs'
import { Hono } from 'hono'

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

process.env.GITHUB_TOKEN = Config.GITHUB_TOKEN
process.env.LINEAR_API_KEY = Config.LINEAR_API_KEY
process.env.OPENAI_API_KEY = Config.OPENAI_API_KEY

// --- Symphony daemon ---

const SYMPHONY_BIN = '/opt/symphony/bin/symphony'
const SYMPHONY_PORT = '4001'
const WORKFLOW_PATH = '/tmp/workflow.md'

writeFileSync(
	WORKFLOW_PATH,
	`\
---
tracker:
    kind: linear
    api_token: $LINEAR_API_KEY
    project_slug: CCS
polling:
    interval_ms: 60000
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
human_review_state: Human Review
merging_state: Merging
agent:
    max_concurrent_agents: 5
workspace:
    root: /root/workspaces
    hooks:
        after_create: |
            echo $GITHUB_TOKEN | gh auth login --with-token
            git clone https://$GITHUB_TOKEN@github.com/your-org/your-repo.git .
            git checkout -b agent/{{ issue.identifier }}
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
{% if attempt == null %}
2. Plan your approach before writing code — spend effort on design and verification strategy
3. Reproduce the current behavior/issue before changing code
{% else %}
4. Review what failed in attempt {{ attempt }} and adjust your approach
{% endif %}
5. Implement the changes following existing code patterns and conventions
6. Write or update tests for your changes
7. Run the full test suite to verify nothing is broken
8. Commit with a descriptive message referencing {{ issue.identifier }}
9. Open a pull request and move the issue to "Human Review"

### Rework
1. Read ALL review comments on the pull request
2. Identify exactly what the reviewer wants changed
3. Make targeted fixes addressing each review comment
4. Run the test suite again
5. Push updates to the existing PR
6. Move the issue back to "Human Review"

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

function startSymphony() {
	symphonyProcess = spawn(
		SYMPHONY_BIN,
		[
			'--port',
			SYMPHONY_PORT,
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
