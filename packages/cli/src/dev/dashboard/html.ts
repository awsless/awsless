// The dev dashboard is a single self-contained page, so the cli ships
// no frontend build or dependencies.
export const dashboardHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>awsless dev</title>
<style>
	:root {
		--bg: hsl(220 20% 5% / 1);
		--panel: hsl(220 20% 8%);
		--hover: hsl(220 20% 12%);
		--border: hsl(220 18% 15%);
		--border-strong: hsl(220 16% 22%);
		--text: #ecedf2;
		--muted: #8b90a1;
		--accent: #ff9000;
		--good: #3dd68c;
		--bad: #ff6166;
		--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Helvetica, Arial, sans-serif;
		--font-mono: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 14px;
		color-scheme: dark;
	}
	* { box-sizing: border-box; }
	::selection { background: rgb(255 144 0 / 25%); }
	::-webkit-scrollbar { width: 8px; height: 8px; }
	::-webkit-scrollbar-track { background: transparent; }
	::-webkit-scrollbar-thumb { background: rgb(255 255 255 / 10%); border-radius: 999px; }
	::-webkit-scrollbar-thumb:hover { background: rgb(255 255 255 / 18%); }
	:focus-visible { outline: 2px solid rgb(255 144 0 / 55%); outline-offset: 1px; }
	body {
		margin: 0;
		font-family: var(--font-sans);
		-webkit-font-smoothing: antialiased;
		background: var(--bg);
		color: var(--text);
		display: grid;
		grid-template-columns: 232px 1fr;
		height: 100vh;
	}
	body.with-events { grid-template-columns: 232px 1fr 320px; }
	button { transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease; }
	input, select, textarea { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
	aside {
		border-left: 1px solid var(--border);
		overflow-y: auto;
		padding: 12px;
	}
	aside h3 {
		font-size: 10px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--muted);
		margin: 8px 8px 12px;
	}
	aside .event {
		border-bottom: 1px solid var(--border);
		padding: 8px;
		font-size: 12px;
		font-family: var(--font-mono);
	}
	aside .event:last-child { border-bottom: none; }
	aside .event .head { display: flex; gap: 8px; align-items: baseline; }
	aside .event .time { color: var(--muted); }
	aside .event .topic { font-weight: 600; }
	aside .event .type { color: var(--muted); }
	aside .event .body {
		color: var(--muted);
		margin-top: 4px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	/* Hovering an event unfolds its payload in place, fully wrapped -
	   the same behavior as the activity feed. */
	aside .event:hover .body {
		white-space: pre-wrap;
		overflow: visible;
		word-break: break-word;
	}
	aside .empty { padding: 8px; }
	.logs {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 10px 12px;
		margin-top: 8px;
		max-height: 420px;
		overflow-y: auto;
		font-size: 12px;
		font-family: var(--font-mono);
	}
	.logs .line { display: flex; gap: 8px; padding: 1px 0; }
	.logs .time { color: var(--muted); flex-shrink: 0; }
	.logs .route { color: var(--accent); word-break: break-all; }
	.logs .text { white-space: pre-wrap; word-break: break-word; }
	.logs .line.error .text, .logs .entry.error .text { color: var(--bad); }
	.logs .entry { padding: 6px 0; }
	.logs .entry + .entry, .logs .line + .entry, .logs .entry + .line { border-top: 1px solid var(--border); }
	.logs .entry .meta { display: flex; gap: 8px; margin-bottom: 2px; }
	/* Every group is its own card, with a shared grid inside: the name
	   column grows to the longest name (capped), so nothing truncates &
	   the inputs line up. */
	.config-form { display: flex; flex-direction: column; gap: 14px; max-width: 720px; margin-top: 14px; }
	.config-group {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 16px 18px;
	}
	.config-group h3 { margin: 0 0 12px; }
	.config-fields {
		display: grid;
		grid-template-columns: fit-content(340px) 1fr;
		gap: 10px 16px;
		align-items: center;
	}
	.config-fields .field { display: contents; }
	.config-fields .name { color: var(--muted); overflow-wrap: anywhere; font-family: var(--font-mono); font-size: 12.5px; }
	.config-fields input {
		background: var(--bg);
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 6px 10px;
		font: inherit;
	}
	.config-fields input:hover { border-color: var(--border-strong); }
	.config-fields input:focus { border-color: #5b6272; box-shadow: 0 0 0 3px rgb(255 255 255 / 14%); outline: none; }
	.config-fields input::placeholder { color: var(--muted); }
	.groups { display: flex; flex-wrap: wrap; gap: 4px 16px; }
	.groups .group { display: flex; align-items: center; gap: 4px; cursor: pointer; }
	nav {
		border-right: 1px solid var(--border);
		overflow-y: auto;
		padding: 14px 12px;
		/* The menu scrolls, but never shows a permanent scrollbar. */
		scrollbar-width: none;
	}
	nav::-webkit-scrollbar { display: none; }
	nav h1 {
		font-size: 15px;
		font-family: var(--font-mono);
		margin: 4px 8px 18px;
		cursor: pointer;
	}
	/* The same two-tone logo as the cli: bold AWS in the brand orange,
	   LESS dimmed, the command muted. */
	nav h1 .logo { color: var(--accent); font-weight: bold; }
	nav h1 .logo .dim { color: #a35d00; }
	nav h1 .cmd { color: var(--muted); font-weight: normal; }
	nav h3 {
		font-size: 10px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--muted);
		margin: 18px 8px 6px;
	}
	nav button {
		display: flex;
		align-items: center;
		gap: 9px;
		width: 100%;
		background: none;
		border: none;
		color: var(--muted);
		font: inherit;
		font-size: 13.5px;
		padding: 6px 8px;
		border-radius: 6px;
		cursor: pointer;
	}
	nav button .count { margin-left: auto; font-size: 12px; }
	nav button.reseed { margin-top: auto; color: var(--muted); }
	nav button.reseed:disabled { cursor: default; }
	.icon {
		width: 15px;
		height: 15px;
		flex-shrink: 0;
		display: inline-flex;
		color: var(--muted);
		transition: color 0.15s ease;
	}
	.icon svg { width: 100%; height: 100%; }
	nav button.active .icon, .row:hover .icon { color: var(--accent); }
	main h2 { display: flex; align-items: center; gap: 9px; }
	main h2 .icon { width: 18px; height: 18px; }
	nav button:hover { background: var(--hover); color: var(--text); }
	nav button.active { background: var(--hover); color: var(--text); }
	nav button .count { color: var(--muted); }
	main { padding: 24px 28px; overflow-y: auto; }
	main h2 { margin: 0 0 4px; font-size: 18px; font-weight: 600; letter-spacing: -0.01em; }
	main .detail { color: var(--muted); margin-bottom: 16px; word-break: break-all; font-size: 13px; }
	main .back {
		display: inline-block;
		background: none;
		border: none;
		color: var(--muted);
		font: inherit;
		font-size: 13px;
		padding: 0;
		margin-bottom: 12px;
		cursor: pointer;
	}
	main .back:hover { color: var(--text); }
	main h3 {
		font-size: 11px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--muted);
		margin: 26px 0 8px;
	}
	.feed .row { cursor: default; }
	.feed .empty { padding: 8px; }
	.filters { display: flex; gap: 8px; margin-bottom: 12px; }
	.filters input, .filters select {
		background: var(--panel);
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 6px 10px;
		font: inherit;
	}
	.filters input:hover, .filters select:hover { border-color: var(--border-strong); }
	.filters input:focus, .filters select:focus {
		border-color: #5b6272;
		box-shadow: 0 0 0 3px rgb(255 255 255 / 14%);
		outline: none;
	}
	.filters input { flex: 1; }
	.filters input::placeholder { color: var(--muted); }
	.filters .count { color: var(--muted); align-self: center; white-space: nowrap; font-size: 13px; }
	/* The stack & name columns share one grid across every row, so the
	   names line up no matter how long each stack name is. */
	.rows { display: grid; grid-template-columns: fit-content(280px) 1fr auto; }
	.rows > .empty { grid-column: 1 / -1; }
	.row {
		display: grid;
		grid-template-columns: subgrid;
		grid-column: 1 / -1;
		gap: 12px;
		align-items: baseline;
		text-align: left;
		background: none;
		border: none;
		color: var(--text);
		font: inherit;
		padding: 9px 10px;
		cursor: pointer;
		border-radius: 8px;
		position: relative;
		transition: background 0.15s ease;
	}
	/* The separator is its own straight hairline instead of a border,
	   so the rounded hover highlight never bends the line at the ends. */
	.row::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 1px;
		background: var(--border);
	}
	.row:last-child::after { display: none; }
	.row:hover { background: var(--hover); }
	a.row { text-decoration: none; }
	.health { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 4px; }
	.health .chip {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 4px 12px;
		font-size: 12px;
		font-family: var(--font-mono);
	}
	.health .dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--good);
		flex-shrink: 0;
	}
	.health .chip.down { border-color: rgb(255 97 102 / 45%); background: rgb(255 97 102 / 8%); }
	.health .chip.down .dot { background: var(--bad); }
	.health .chip .detail-text { color: var(--muted); }
	.home-cols {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
		gap: 0 20px;
		align-items: start;
	}
	.logs .route.link { cursor: pointer; }
	.logs .route.link:hover { text-decoration: underline; }
	.logs .took { color: var(--muted); margin-left: auto; flex-shrink: 0; }
	.logs .payload {
		color: var(--muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	/* Hovering an entry unfolds its payload in place, fully wrapped. */
	.logs .entry:hover .payload {
		white-space: pre-wrap;
		overflow: visible;
		word-break: break-word;
	}
	/* The trace chip appears once a dispatch has trace siblings & opens
	   the trace tree of the whole request chain. */
	.logs .trace-link {
		color: var(--accent);
		cursor: pointer;
		flex-shrink: 0;
	}
	.logs .trace-link:hover { text-decoration: underline; }
	.overlay {
		position: fixed;
		inset: 0;
		background: rgb(0 0 0 / 60%);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
	}
	.overlay .modal {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 12px;
		box-shadow: 0 12px 48px rgb(0 0 0 / 60%);
		width: min(760px, 92vw);
		max-height: 82vh;
		overflow-y: auto;
		padding: 18px 22px;
	}
	.overlay .modal-head { display: flex; align-items: baseline; gap: 10px; }
	.overlay .modal-head h3 { margin: 0; font-family: var(--font-mono); }
	.overlay .modal-head .detail { color: var(--muted); font-size: 12px; }
	.overlay .modal-head button {
		margin-left: auto;
		background: none;
		border: none;
		color: var(--muted);
		font-size: 16px;
		cursor: pointer;
		border-radius: 6px;
		padding: 2px 8px;
	}
	.overlay .modal-head button:hover { color: var(--text); background: var(--hover); }
	/* The tree rows reuse the log entry format, the guide marks the
	   parent-child steps of the chain. */
	.trace-tree { max-height: none; }
	.trace-tree .entry .guide { color: var(--muted); flex-shrink: 0; }
	.row.problem .id { color: var(--bad); }
	.empty.good { color: var(--good); }
	.row .stack {
		color: var(--muted);
		min-width: 90px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: var(--font-mono);
		font-size: 12.5px;
	}
	.row .id {
		font-weight: 500;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: var(--font-mono);
		font-size: 12.5px;
	}
	.row .info {
		color: var(--muted);
		justify-self: end;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 100%;
		font-size: 12.5px;
	}
	.email-body {
		width: 100%;
		min-height: 480px;
		background: #fff;
		border: 1px solid var(--border);
		border-radius: 10px;
		margin-top: 12px;
	}
	textarea {
		width: 100%;
		min-height: 120px;
		background: var(--panel);
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 12px;
		font-family: var(--font-mono);
		font-size: 12.5px;
		resize: vertical;
	}
	textarea:hover { border-color: var(--border-strong); }
	textarea:focus { border-color: #5b6272; box-shadow: 0 0 0 3px rgb(255 255 255 / 14%); outline: none; }
	.actions { margin: 12px 0; display: flex; gap: 8px; align-items: center; }
	.actions .status { color: var(--muted); font-size: 13px; }
	/* Action buttons in the x.ai style: white pill primary, outlined
	   ghost secondary. */
	button.primary {
		background: #fff;
		color: #0a0a0a;
		border: none;
		border-radius: 999px;
		padding: 7px 18px;
		font: inherit;
		font-weight: 500;
		cursor: pointer;
	}
	button.primary:hover { background: #d9d9de; }
	button.primary:disabled { opacity: 0.5; cursor: wait; }
	button.secondary {
		background: transparent;
		color: var(--text);
		border: 1px solid var(--border-strong);
		border-radius: 999px;
		padding: 6px 18px;
		font: inherit;
		cursor: pointer;
	}
	button.secondary:hover { background: var(--hover); border-color: #3d3d44; }
	pre.result {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 12px 14px;
		overflow-x: auto;
		white-space: pre-wrap;
		word-break: break-word;
		font-family: var(--font-mono);
		font-size: 12.5px;
	}
	pre.result.error { border-color: rgb(255 97 102 / 45%); color: var(--bad); }
	/* Tables in the vercel style: horizontal hairlines only, quiet
	   uppercase headers. */
	table { border-collapse: collapse; width: 100%; font-family: var(--font-mono); font-size: 12.5px; }
	th, td {
		border-bottom: 1px solid var(--border);
		padding: 8px 12px;
		text-align: left;
		vertical-align: top;
		max-width: 360px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	th {
		color: var(--muted);
		font-weight: 500;
		font-family: var(--font-sans);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	tbody tr { transition: background 0.15s ease; }
	tbody tr:hover { background: var(--hover); }
	td:hover { white-space: normal; word-break: break-all; }
	.empty { color: var(--muted); }
</style>
</head>
<body>
<nav id="nav"><h1>awsless <span>dev</span></h1></nav>
<main id="main"><p class="empty">Loading...</p></main>
<script type="application/json" id="state-data">__STATE__</script>
<aside id="events" hidden><h3>Live events</h3><div id="events-feed"><p class="empty">Waiting for events...</p></div></aside>
<script>
const $ = (tag, attrs = {}, children = []) => {
	const el = document.createElement(tag)
	Object.assign(el, attrs)
	for (const child of [].concat(children)) {
		el.append(child)
	}
	return el
}

const api = async (path, options) => {
	const res = await fetch(path, options)
	const data = await res.json()
	if (!res.ok) throw new Error(data.error ?? res.statusText)
	return data
}

const GROUPS = [
	['site', 'Sites'],
	['function', 'Functions'],
	['cron', 'Crons'],
	['task', 'Tasks'],
	['instance', 'Instances'],
	['queue', 'Queues'],
	['topic', 'Topics'],
	['subscriber', 'Subscribers'],
	['pubsub', 'PubSub'],
	['rpc', 'RPC'],
	['rest', 'REST'],
	['image', 'Images'],
	['icon', 'Icons'],
	['table', 'Tables'],
	['cache', 'Caches'],
	['search', 'Searches'],
	['store', 'Stores'],
	['config', 'Config'],
	['auth', 'Auth'],
	['alert', 'Alerts'],
	['email', 'Emails'],
	['worker', 'Logs'],
	['route', 'Routers'],
]

// The nav renders the features in scannable sections - a section only
// shows when the app declares at least one of its resources.
const SECTIONS = [
	['Web', ['site', 'rpc', 'rest', 'route', 'image', 'icon']],
	['Compute', ['function', 'cron', 'task', 'instance']],
	['Messaging', ['queue', 'topic', 'subscriber', 'pubsub']],
	['Storage', ['table', 'cache', 'search', 'store']],
	['App', ['config', 'auth', 'alert', 'email', 'worker']],
]

const svg = inner =>
	'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>'

const ICONS = {
	function: svg('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'),
	cron: svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
	task: svg('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),
	instance: svg('<line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/>'),
	queue: svg('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>'),
	topic: svg('<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>'),
	subscriber: svg('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>'),
	pubsub: svg('<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>'),
	rpc: svg('<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>'),
	rest: svg('<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>'),
	image: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'),
	icon: svg('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'),
	table: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="9" x2="9" y2="21"/>'),
	cache: svg('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>'),
	search: svg('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'),
	store: svg('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'),
	alert: svg('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'),
	email: svg('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>'),
	config: svg('<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>'),
	route: svg('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'),
	site: svg('<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>'),
	seed: svg('<path d="M12 22V8"/><path d="M12 8C12 5 9 2 5 2c0 4 3 6 7 6z"/><path d="M12 12c0-3 3-6 7-6 0 4-3 6-7 6z"/>'),
	auth: svg('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
	worker: svg('<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>'),
}

const icon = kind => {
	const el = $('span', { className: 'icon' })
	el.innerHTML = ICONS[kind] ?? ''
	return el
}

let state
let cleanupPanel
const view = { kind: null, resource: null }
const filter = { query: '', stack: '', router: '' }

const label = r => (r.stack ? r.stack + ' / ' + r.id : r.id)
const groupTitle = kind => GROUPS.find(([k]) => k === kind)?.[1] ?? kind

// ------------------------------------------------------------------
// Url routing: /functions lists the function resources, and
// /functions/<stack>/<id> opens one, so every view is a plain url.

const slugFor = kind => groupTitle(kind).toLowerCase()
const kindFor = slug => GROUPS.find(([, title]) => title.toLowerCase() === slug)?.[0]

const filterParams = () => {
	const params = new URLSearchParams()
	if (filter.query) params.set('q', filter.query)
	if (filter.stack) params.set('stack', filter.stack)
	if (filter.router) params.set('router', filter.router)
	return params.toString()
}

const listUrl = kind => {
	const params = filterParams()
	return '/' + slugFor(kind) + (params ? '?' + params : '')
}

const resourceUrl = r => {
	const url = '/' + slugFor(r.kind) + '/' + encodeURIComponent(r.stack ?? '-') + '/' + encodeURIComponent(r.id)
	// Routers can define the same route pattern, so route urls carry
	// the router id to stay unique.
	return r.router ? url + '?router=' + encodeURIComponent(r.router) : url
}

const selectKind = kind => {
	view.kind = kind
	view.resource = null
	filter.query = ''
	filter.stack = ''
	filter.router = ''
	history.pushState(null, '', listUrl(kind))
	render()
}

const selectResource = r => {
	view.resource = r
	history.pushState(null, '', resourceUrl(r))
	render()
}

const showHome = () => {
	view.kind = null
	view.resource = null
	history.pushState(null, '', '/')
	render()
}

const applyLocation = () => {
	const segments = location.pathname.split('/').filter(Boolean).map(decodeURIComponent)
	const params = new URLSearchParams(location.search)

	view.kind = kindFor(segments[0]) ?? null
	view.resource = null
	filter.query = params.get('q') ?? ''
	filter.stack = params.get('stack') ?? ''
	filter.router = params.get('router') ?? ''

	if (view.kind && segments.length >= 3) {
		const router = params.get('router')
		const matches = state.resources.filter(r =>
			r.kind === view.kind && (r.stack ?? '-') === segments[1] && r.id === segments[2]
		)
		view.resource = (router ? matches.find(r => r.router === router) : matches[0]) ?? null
	}

	render()
}

window.addEventListener('popstate', applyLocation)

// ------------------------------------------------------------------
// Detail panels

const invokePanel = (main, r) => {
	// The last payload survives reloads & panel switches, so a hand
	// crafted event never gets lost. The envelope only prefills the
	// first visit.
	const storageKey = 'invoke-payload:' + r.kind + ':' + (r.stack ?? '-') + ':' + r.id
	const placeholder = JSON.stringify(r.envelope ?? {}, null, 2)
	const input = $('textarea', { value: localStorage.getItem(storageKey) ?? placeholder, spellcheck: false })
	const status = $('span', { className: 'status' })
	const result = $('pre', { className: 'result', hidden: true })
	const run = $('button', { className: 'primary', textContent: r.kind === 'topic' ? 'Publish' : 'Invoke' })
	const reset = $('button', { className: 'secondary', textContent: 'Reset' })

	input.oninput = () => localStorage.setItem(storageKey, input.value)

	reset.onclick = () => {
		localStorage.removeItem(storageKey)
		input.value = placeholder
	}

	run.onclick = async () => {
		run.disabled = true
		status.textContent = ''
		const started = Date.now()
		try {
			const event = input.value.trim() ? JSON.parse(input.value) : undefined
			const body = r.kind === 'topic'
				? { topic: r.detail, message: event }
				: { routeKey: r.routeKey, event }
			const path = r.kind === 'topic' ? '/api/publish' : '/api/invoke'
			const data = await api(path, { method: 'POST', body: JSON.stringify(body) })
			result.className = 'result'
			result.textContent = JSON.stringify(data.result ?? null, null, 2)
			status.textContent = (Date.now() - started) + 'ms'
		} catch (error) {
			result.className = 'result error'
			result.textContent = String(error.message ?? error)
		}
		result.hidden = false
		run.disabled = false
	}

	main.append(
		input,
		$('div', { className: 'actions' }, [run, reset, status]),
		result,
	)

	// The resource's own console output, filtered from the worker feed.
	if (r.routeKey) {
		cleanupPanel = attachLogFeed(main, 'worker', r.routeKey)
	}
}

const instancePanel = (main, r) => {
	// A message into the instance's queue, like Instance.stack.name()
	// sends. The last payload survives reloads & panel switches.
	const storageKey = 'invoke-payload:' + r.kind + ':' + (r.stack ?? '-') + ':' + r.id
	const placeholder = '{}'
	const input = $('textarea', { value: localStorage.getItem(storageKey) ?? placeholder, spellcheck: false })
	const status = $('span', { className: 'status' })
	const result = $('pre', { className: 'result', hidden: true })
	const send = $('button', { className: 'primary', textContent: 'Send' })
	const reset = $('button', { className: 'secondary', textContent: 'Reset' })
	const restart = $('button', { className: 'secondary', textContent: 'Restart' })

	input.oninput = () => localStorage.setItem(storageKey, input.value)

	reset.onclick = () => {
		localStorage.removeItem(storageKey)
		input.value = placeholder
	}

	restart.onclick = async () => {
		restart.disabled = true
		status.textContent = ''
		result.hidden = true
		try {
			await api('/api/instance/restart', {
				method: 'POST',
				body: JSON.stringify({ stack: r.stack, id: r.id }),
			})
			status.textContent = 'restarted'
		} catch (error) {
			result.className = 'result error'
			result.textContent = String(error.message ?? error)
			result.hidden = false
		}
		restart.disabled = false
	}

	send.onclick = async () => {
		send.disabled = true
		status.textContent = ''
		result.hidden = true
		try {
			const payload = input.value.trim() ? JSON.parse(input.value) : {}
			await api('/api/instance/send', {
				method: 'POST',
				body: JSON.stringify({ stack: r.stack, id: r.id, payload }),
			})
			status.textContent = 'sent'
		} catch (error) {
			result.className = 'result error'
			result.textContent = String(error.message ?? error)
			result.hidden = false
		}
		send.disabled = false
	}

	main.append(
		$('p', {}, $('a', { href: r.detail, target: '_blank', style: 'color: var(--accent)' }, r.detail)),
		input,
		$('div', { className: 'actions' }, [send, reset, restart, status]),
		result,
	)

	if (r.channel) {
		cleanupPanel = attachLogFeed(main, r.channel)
	}
}

const pubsubPanel = (main, r) => {
	const topic = $('input', { placeholder: 'topic', value: 'my-topic', autocomplete: 'off' })
	const event = $('input', { placeholder: 'event', value: 'my-event', autocomplete: 'off' })
	const payload = $('textarea', { value: '{}', spellcheck: false })
	const status = $('span', { className: 'status' })
	const result = $('pre', { className: 'result', hidden: true })
	const run = $('button', { className: 'primary', textContent: 'Publish' })

	run.onclick = async () => {
		run.disabled = true
		status.textContent = ''
		const started = Date.now()
		try {
			const message = {
				topic: topic.value.trim(),
				event: event.value.trim(),
				payload: payload.value.trim() ? JSON.parse(payload.value) : undefined,
			}
			const data = await api('/api/invoke', {
				method: 'POST',
				body: JSON.stringify({ routeKey: r.routeKey, event: message }),
			})
			result.className = 'result'
			result.textContent = JSON.stringify(data.result ?? null, null, 2)
			status.textContent = 'Published to every subscriber of "' + message.topic + '" in ' + (Date.now() - started) + 'ms'
		} catch (error) {
			result.className = 'result error'
			result.textContent = String(error.message ?? error)
		}
		result.hidden = false
		run.disabled = false
	}

	main.append(
		$('div', { className: 'filters' }, [topic, event]),
		payload,
		$('div', { className: 'actions' }, [run, status]),
		result,
	)

	cleanupPanel = showEventsFeed(r.channel)
}

const rpcPanel = (main, r) => {
	if ((r.queries ?? []).length === 0) {
		main.append($('p', { className: 'empty' }, 'No rpc functions are defined.'))
		return
	}

	const query = $('select', {}, r.queries.map(name => $('option', { value: name, textContent: name })))

	// The token rides the same "authentication" header the rpc client
	// sends, & sticks around per api so a page reload keeps it.
	const authKey = 'rpc-auth-token:' + r.routeKey
	const auth = $('input', {
		type: 'text',
		placeholder: 'Auth token (optional)',
		value: localStorage.getItem(authKey) ?? '',
		autocomplete: 'off',
		spellcheck: false,
	})
	auth.oninput = () => localStorage.setItem(authKey, auth.value)

	const payload = $('textarea', { value: '{}', spellcheck: false })
	const status = $('span', { className: 'status' })
	const result = $('pre', { className: 'result', hidden: true })
	const run = $('button', { className: 'primary', textContent: 'Call' })

	run.onclick = async () => {
		run.disabled = true
		status.textContent = ''
		const started = Date.now()
		try {
			const parsed = payload.value.trim() ? JSON.parse(payload.value) : undefined

			// The same lambda url event the local router sends the rpc
			// server for a real request.
			const event = {
				version: '2.0',
				rawPath: '/',
				requestContext: { http: { method: 'POST', userAgent: 'awsless dev dashboard', sourceIp: '127.0.0.1' } },
				headers: {
					'content-type': 'application/json',
					...(auth.value.trim() ? { authentication: auth.value.trim() } : {}),
				},
				body: JSON.stringify([{ name: query.value, ...(parsed === undefined ? {} : { payload: parsed }) }]),
			}

			const data = await api('/api/invoke', {
				method: 'POST',
				body: JSON.stringify({ routeKey: r.routeKey, event }),
			})

			let body = data.result?.body
			try { body = JSON.parse(body) } catch (_) {}

			result.className = 'result'
			result.textContent = JSON.stringify(body ?? data.result ?? null, null, 2)
			status.textContent = (data.result?.statusCode ?? '') + ' · ' + (Date.now() - started) + 'ms'
		} catch (error) {
			result.className = 'result error'
			result.textContent = String(error.message ?? error)
		}
		result.hidden = false
		run.disabled = false
	}

	main.append(
		$('div', { className: 'filters' }, [query, auth]),
		payload,
		$('div', { className: 'actions' }, [run, status]),
		result,
	)
}

// ------------------------------------------------------------------
// Live log feed

// A terminal-style view streaming a resource's live event channel,
// like the dev server output of a site. The bus replays the recent
// lines, so the boot output shows even when the panel opens later.
// Resolve a feed label back to its resource: route keys match
// directly, while queue/stream/topic labels carry the physical name
// their resource lists as its detail.
const findRouteResource = route => {
	const direct = state.resources.find(r => r.routeKey === route)

	if (direct) {
		return direct
	}

	const [kind, name] = route.split(' ')

	if (!name) {
		return undefined
	}

	if (kind === 'queue') {
		return state.resources.find(r => r.kind === 'queue' && r.detail === name)
	}

	if (kind === 'stream') {
		return state.resources.find(r => r.kind === 'table' && r.detail === name)
	}

	if (kind === 'topic') {
		return state.resources.find(r => r.kind === 'topic' && r.detail === name)
	}

	return undefined
}

// A route tag that links through to its resource, shared by the log
// feeds & the activity feed.
const routeTag = route => {
	const resource = findRouteResource(route)
	const tag = $('span', { className: 'route' + (resource ? ' link' : ''), title: route }, route)

	if (resource) {
		tag.onclick = () => selectResource(resource)
	}

	return tag
}

const attachLogFeed = (main, channel, route, title = 'Logs') => {
	if (title) {
		main.append($('h3', {}, title))
	}

	const feed = $('div', { className: 'logs' }, $('p', { className: 'empty' }, 'Waiting for output...'))
	main.append(feed)

	const source = new EventSource('/api/events?channel=' + encodeURIComponent(channel))

	source.onmessage = message => {
		const data = JSON.parse(message.data)

		// A route filter shows only the lines of one resource, like the
		// function panel showing its own console output.
		if (route && data.route !== route) {
			return
		}

		feed.querySelector('.empty')?.remove()

		const error = data.error ? ' error' : ''
		const showRoute = !route && data.route

		// Tagged or multi-line records render as a block with the
		// metadata on its own header line, so long route names never
		// squeeze the text. Plain lines keep the compact row.
		if (showRoute || data.line.includes('\\n')) {
			feed.append($('div', { className: 'entry' + error }, [
				$('div', { className: 'meta' }, [
					$('span', { className: 'time' }, new Date(data.date).toLocaleTimeString()),
					showRoute ? routeTag(data.route) : '',
				]),
				$('div', { className: 'text' }, data.line),
			]))
		} else {
			feed.append($('div', { className: 'line' + error }, [
				$('span', { className: 'time' }, new Date(data.date).toLocaleTimeString()),
				$('span', { className: 'text' }, data.line),
			]))
		}

		// Only the last 200 lines stay around, pinned to the bottom.
		while (feed.children.length > 200) {
			feed.firstChild.remove()
		}

		feed.scrollTop = feed.scrollHeight
	}

	return () => source.close()
}

// ------------------------------------------------------------------
// Live events sidebar

// The feed only shows while a pubsub instance panel is open & only
// streams the events of that instance.
const showEventsFeed = channel => {
	document.body.classList.add('with-events')

	const aside = document.getElementById('events')
	const feed = document.getElementById('events-feed')

	aside.hidden = false
	feed.innerHTML = '<p class="empty">Waiting for events...</p>'

	const source = new EventSource('/api/events?channel=' + encodeURIComponent(channel))

	source.onmessage = message => {
		const data = JSON.parse(message.data)

		feed.querySelector('.empty')?.remove()
		feed.prepend($('div', { className: 'event' }, [
			$('div', { className: 'head' }, [
				$('span', { className: 'time' }, new Date(data.date).toLocaleTimeString()),
				$('span', { className: 'topic' }, data.kind === 'message' ? data.topic : data.event),
				$('span', { className: 'type' }, data.kind === 'message' ? data.event : 'lifecycle'),
			]),
			...(data.payload === undefined
				? []
				: [$('div', { className: 'body' }, JSON.stringify(data.payload))]),
		]))

		// The newest event sits on top & only the last 25 stay around.
		while (feed.children.length > 25) {
			feed.lastChild.remove()
		}
	}

	return () => {
		source.close()
		aside.hidden = true
		document.body.classList.remove('with-events')
	}
}

const tablePanel = async (main, r) => {
	const holder = $('div', {}, $('p', { className: 'empty' }, 'Scanning...'))
	main.append(holder)

	try {
		const data = await api('/api/table?name=' + encodeURIComponent(r.detail))
		holder.innerHTML = ''

		if (data.items.length === 0) {
			holder.append($('p', { className: 'empty' }, 'The table is empty.'))
			return
		}

		const columns = [...new Set(data.items.flatMap(item => Object.keys(item)))]
		holder.append($('table', {}, [
			$('tr', {}, columns.map(c => $('th', {}, c))),
			...data.items.map(item => $('tr', {}, columns.map(c => $('td', {},
				typeof item[c] === 'undefined' ? '' : JSON.stringify(item[c])
			)))),
		]))
	} catch (error) {
		holder.innerHTML = ''
		holder.append($('pre', { className: 'result error' }, String(error.message ?? error)))
	}
}

const cachePanel = async (main, r) => {
	const holder = $('div', {}, $('p', { className: 'empty' }, 'Scanning...'))
	main.append(holder)

	// The redis server's own output, streamed live.
	if (r.channel) {
		cleanupPanel = attachLogFeed(main, r.channel, undefined, 'Server logs')
	}

	try {
		const data = await api('/api/cache?target=' + encodeURIComponent(r.detail))
		holder.innerHTML = ''

		if (data.entries.length === 0) {
			holder.append($('p', { className: 'empty' }, 'The cache is empty.'))
			return
		}

		holder.append($('table', {}, [
			$('tr', {}, [$('th', {}, 'Db'), $('th', {}, 'Key'), $('th', {}, 'Type'), $('th', {}, 'TTL'), $('th', {}, 'Value')]),
			...data.entries.map(entry => $('tr', {}, [
				$('td', {}, String(entry.db)),
				$('td', {}, entry.key),
				$('td', {}, entry.type),
				$('td', {}, entry.ttl < 0 ? '-' : entry.ttl + 's'),
				$('td', {}, typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value)),
			])),
		]))
	} catch (error) {
		holder.innerHTML = ''
		holder.append($('pre', { className: 'result error' }, String(error.message ?? error)))
	}
}

const searchPanel = async (main, r) => {
	const proxy = (path, body) =>
		api('/api/search', { method: 'POST', body: JSON.stringify({ target: r.detail, path, body }) })

	const indices = $('div', {}, $('p', { className: 'empty' }, 'Loading indices...'))
	const index = $('select', {})
	const query = $('textarea', { value: JSON.stringify({ query: { match_all: {} }, size: 10 }, null, 2), spellcheck: false })
	const status = $('span', { className: 'status' })
	const result = $('div', {})
	const run = $('button', { className: 'primary', textContent: 'Search' })

	run.onclick = async () => {
		run.disabled = true
		status.textContent = ''
		result.innerHTML = ''
		try {
			const { data } = await proxy('/' + encodeURIComponent(index.value) + '/_search', JSON.parse(query.value))

			if (data.error) {
				result.append($('pre', { className: 'result error' }, JSON.stringify(data.error, null, 2)))
			} else {
				const hits = data.hits?.hits ?? []
				status.textContent = (data.hits?.total?.value ?? 0) + ' hits · ' + data.took + 'ms'

				if (hits.length === 0) {
					result.append($('p', { className: 'empty' }, 'No hits.'))
				} else {
					const columns = [...new Set(hits.flatMap(hit => Object.keys(hit._source ?? {})))]
					result.append($('table', {}, [
						$('tr', {}, [$('th', {}, '_id'), ...columns.map(c => $('th', {}, c))]),
						...hits.map(hit => $('tr', {}, [
							$('td', {}, hit._id),
							...columns.map(c => $('td', {},
								typeof hit._source?.[c] === 'undefined' ? '' : JSON.stringify(hit._source[c])
							)),
						])),
					]))
				}
			}
		} catch (error) {
			result.append($('pre', { className: 'result error' }, String(error.message ?? error)))
		}
		run.disabled = false
	}

	main.append(
		$('h3', {}, 'Indices'),
		indices,
		$('h3', {}, 'Query'),
		$('div', { className: 'filters' }, [index]),
		query,
		$('div', { className: 'actions' }, [run, status]),
		result,
	)

	// The opensearch server's own output, streamed live.
	if (r.channel) {
		cleanupPanel = attachLogFeed(main, r.channel, undefined, 'Server logs')
	}

	try {
		const { data } = await proxy('/_cat/indices?format=json&h=index,health,docs.count,store.size&s=index')
		const rows = data.filter(entry => !entry.index.startsWith('.'))

		indices.innerHTML = ''

		if (rows.length === 0) {
			indices.append($('p', { className: 'empty' }, 'No indices exist yet.'))
			return
		}

		for (const entry of rows) {
			index.append($('option', { value: entry.index, textContent: entry.index }))
		}

		indices.append($('table', {}, [
			$('tr', {}, [$('th', {}, 'Index'), $('th', {}, 'Health'), $('th', {}, 'Docs'), $('th', {}, 'Size')]),
			...rows.map(entry => $('tr', {}, [
				$('td', {}, entry.index),
				$('td', {}, entry.health),
				$('td', {}, entry['docs.count'] ?? '-'),
				$('td', {}, entry['store.size'] ?? '-'),
			])),
		]))
	} catch (error) {
		indices.innerHTML = ''
		indices.append($('pre', { className: 'result error' }, String(error.message ?? error)))
	}
}

const storePanel = async (main, r) => {
	const holder = $('div', {}, $('p', { className: 'empty' }, 'Listing...'))
	main.append(holder)

	const data = await api('/api/store?prefix=' + encodeURIComponent(r.detail))
	holder.innerHTML = ''

	if (data.files.length === 0) {
		holder.append($('p', { className: 'empty' }, 'The store is empty.'))
		return
	}

	holder.append($('table', {}, [
		$('tr', {}, [$('th', {}, 'Key'), $('th', {}, 'Size'), $('th', {}, 'Modified')]),
		...data.files.map(file => $('tr', {}, [
			$('td', {}, file.key.slice(r.detail.length)),
			$('td', {}, String(file.size)),
			$('td', {}, file.modified),
		])),
	]))
}

// Every email sent through Email.send during this session - captured
// by the local ses shim instead of being delivered.
const alertPanel = async (main) => {
	const holder = $('div', {})
	main.append(holder)

	const render = async () => {
		const data = await api('/api/alerts')
		const alerts = data.alerts ?? []
		holder.innerHTML = ''

		const refresh = $('button', { className: 'primary', textContent: 'Refresh' })
		refresh.onclick = render
		holder.append($('div', { className: 'actions' }, [refresh]))

		if (alerts.length === 0) {
			holder.append($('p', { className: 'empty' }, 'No alerts sent yet.'))
			return
		}

		const rows = $('div', { className: 'rows' })

		for (const alert of alerts) {
			const row = $('button', { className: 'row' }, [
				$('span', { className: 'stack' }, new Date(alert.date).toLocaleTimeString()),
				$('span', { className: 'id' }, alert.subject ?? '(no subject)'),
				$('span', { className: 'info' }, alert.alert),
			])
			row.onclick = () => {
				holder.innerHTML = ''

				const back = $('button', { className: 'back', textContent: '\u2190 Alerts' })
				back.onclick = render

				let message = alert.message ?? '(no payload)'
				try {
					message = JSON.stringify(JSON.parse(alert.message), null, 2)
				} catch (_) {}

				holder.append(
					back,
					$('h2', {}, alert.subject ?? '(no subject)'),
					$('p', { className: 'detail' }, alert.alert + ' \u00b7 ' + new Date(alert.date).toLocaleString()),
					$('pre', { className: 'result' }, message),
				)
			}
			rows.append(row)
		}

		holder.append(rows)
	}

	render()
}

const emailPanel = async (main) => {
	const holder = $('div', {})
	main.append(holder)

	const render = async () => {
		const data = await api('/api/emails')
		const emails = data.emails ?? []
		holder.innerHTML = ''

		const refresh = $('button', { className: 'primary', textContent: 'Refresh' })
		refresh.onclick = render
		holder.append($('div', { className: 'actions' }, [refresh]))

		if (emails.length === 0) {
			holder.append($('p', { className: 'empty' }, 'No emails sent yet.'))
			return
		}

		const rows = $('div', { className: 'rows' })

		for (const email of emails) {
			const row = $('button', { className: 'row' }, [
				$('span', { className: 'stack' }, new Date(email.date).toLocaleTimeString()),
				$('span', { className: 'id' }, email.subject ?? '(no subject)'),
				$('span', { className: 'info' }, (email.to ?? []).join(', ')),
			])
			row.onclick = () => {
				holder.innerHTML = ''

				const back = $('button', { className: 'back', textContent: '← Emails' })
				back.onclick = render
				const frame = $('iframe', { className: 'email-body', sandbox: '' })

				holder.append(
					back,
					$('h2', {}, email.subject ?? '(no subject)'),
					$('p', { className: 'detail' }, [
						'from ' + (email.from ?? '?') + ' · to ' + (email.to ?? []).join(', ') + ' · ' + new Date(email.date).toLocaleString(),
					]),
					frame,
				)
				frame.srcdoc = email.html ?? ''
			}
			rows.append(row)
		}

		holder.append(rows)
	}

	await render()
}

// One input per defined config, saved back to the local config file.
const configPanel = async (main) => {
	const names = [...new Set(state.resources.filter(r => r.kind === 'config').map(r => r.id))].sort()
	const data = await api('/api/config')
	const values = data.values ?? {}
	const pulled = new Set(data.pulled ?? [])

	const inputs = new Map()
	const form = $('div', { className: 'config-form' })

	// Configs group by the first segment of their name: alphapo-api-key
	// & alphapo-host read as one "alphapo" block with the prefix
	// stripped from the rows. A prefix needs at least two members to
	// form a group - the loners keep their full name under "other".
	const byPrefix = new Map()

	for (const name of names) {
		const prefix = name.split('-')[0]
		if (!byPrefix.has(prefix)) byPrefix.set(prefix, [])
		byPrefix.get(prefix).push(name)
	}

	const sections = []
	const other = []

	for (const [prefix, members] of byPrefix) {
		if (members.length > 1) {
			sections.push([prefix, members])
		} else {
			other.push(members[0])
		}
	}

	if (other.length > 0) {
		sections.push(['other', other])
	}

	const addField = (grid, name) => {
		// An empty input falls through to the value pulled from ssm on
		// boot - the placeholder shows whether the pull provided one.
		const input = $('input', {
			value: values[name] ?? '',
			placeholder: pulled.has(name) ? 'pulled from ssm' : 'not set',
			spellcheck: false,
		})
		inputs.set(name, input)
		grid.append($('label', { className: 'field' }, [$('span', { className: 'name' }, name), input]))
	}

	for (const [prefix, members] of sections) {
		const grid = $('div', { className: 'config-fields' })

		for (const name of members) {
			addField(grid, name)
		}

		// A lone unlabeled group skips its header - the card alone
		// carries the grouping.
		const header = sections.length > 1 || other.length === 0 ? [$('h3', {}, prefix)] : []

		form.append($('div', { className: 'config-group' }, [...header, grid]))
	}

	if (names.length === 0) {
		form.append($('p', { className: 'empty' }, 'No configs defined.'))
	}

	const status = $('span', { className: 'status' })
	const save = $('button', { className: 'primary', textContent: 'Save' })

	save.onclick = async () => {
		save.disabled = true
		try {
			// Unknown keys in the file survive, empty inputs unset.
			const next = { ...values }

			for (const [name, input] of inputs) {
				if (input.value === '') {
					delete next[name]
				} else {
					next[name] = input.value
				}
			}

			await api('/api/config', { method: 'PUT', body: JSON.stringify(next) })
			status.textContent = 'Saved. The worker restarts automatically.'
		} catch (error) {
			status.textContent = String(error.message ?? error)
		}
		save.disabled = false
	}

	main.append(form, $('div', { className: 'actions' }, [save, status]))
}

// The users of a real deployed auth pool, with the same create &
// group-update operations as the auth user cli commands.
const authPanel = async (main, r) => {
	const holder = $('div', {}, $('p', { className: 'empty' }, 'Loading users...'))
	main.append(holder)

	const groupBoxes = (groups, selected) => {
		const boxes = new Map()
		const row = $('div', { className: 'groups' })

		for (const group of groups) {
			const box = $('input', { type: 'checkbox', checked: selected.includes(group) })
			boxes.set(group, box)
			row.append($('label', { className: 'group' }, [box, ' ' + group]))
		}

		return { row, selected: () => [...boxes].filter(([, box]) => box.checked).map(([group]) => group) }
	}

	try {
		const data = await api('/api/auth?pool=' + encodeURIComponent(r.id))
		holder.innerHTML = ''

		// --------------------------------------------------------------
		// The user list, each row expanding into its group/password form.

		if (data.users.length === 0) {
			holder.append($('p', { className: 'empty' }, 'The pool has no users.'))
		} else {
			const editRow = $('tr', { style: 'display: none' })
			const table = $('table', {}, [
				$('tr', {}, ['username', 'email', 'status', 'groups', 'created'].map(c => $('th', {}, c))),
			])

			for (const user of data.users) {
				const row = $('tr', {}, [
					$('td', {}, user.username),
					$('td', {}, user.email ?? ''),
					$('td', {}, user.enabled ? (user.status ?? '') : 'DISABLED'),
					$('td', {}, user.groups.join(', ')),
					$('td', {}, user.createdAt ? new Date(user.createdAt).toLocaleString() : ''),
				])

				row.style.cursor = 'pointer'
				row.onclick = () => {
					const groups = groupBoxes(data.groups, user.groups)
					const password = $('input', { type: 'password', placeholder: 'unchanged', spellcheck: false })
					const status = $('span', { className: 'status' })
					const save = $('button', { className: 'primary', textContent: 'Save' })

					save.onclick = async () => {
						save.disabled = true
						try {
							await api('/api/auth/update', {
								method: 'POST',
								body: JSON.stringify({
									pool: r.id,
									username: user.username,
									password: password.value,
									groups: groups.selected(),
								}),
							})
							main.innerHTML = ''
							renderResource(main)
							return
						} catch (error) {
							status.textContent = String(error.message ?? error)
						}
						save.disabled = false
					}

					editRow.innerHTML = ''
					editRow.style.display = ''
					editRow.append($('td', { colSpan: 5 }, $('div', { className: 'config-form' }, [
						$('label', { className: 'field' }, [$('span', { className: 'name' }, 'groups'), groups.row]),
						$('label', { className: 'field' }, [$('span', { className: 'name' }, 'new password'), password]),
						$('div', { className: 'actions' }, [save, status]),
					])))
					row.after(editRow)
				}

				table.append(row)
			}

			holder.append(table)
		}

		// --------------------------------------------------------------
		// Create a new user.

		const username = $('input', { placeholder: 'username', spellcheck: false })
		const password = $('input', { type: 'password', placeholder: 'password', spellcheck: false })
		const groups = groupBoxes(data.groups, [])
		const status = $('span', { className: 'status' })
		const create = $('button', { className: 'primary', textContent: 'Create user' })

		create.onclick = async () => {
			create.disabled = true
			try {
				await api('/api/auth/create', {
					method: 'POST',
					body: JSON.stringify({
						pool: r.id,
						username: username.value,
						password: password.value,
						groups: groups.selected(),
					}),
				})
				main.innerHTML = ''
				renderResource(main)
				return
			} catch (error) {
				status.textContent = String(error.message ?? error)
			}
			create.disabled = false
		}

		holder.append(
			$('h3', {}, 'Create user'),
			$('div', { className: 'config-form' }, [
				$('label', { className: 'field' }, [$('span', { className: 'name' }, 'username'), username]),
				$('label', { className: 'field' }, [$('span', { className: 'name' }, 'password'), password]),
				$('label', { className: 'field' }, [$('span', { className: 'name' }, 'groups'), groups.row]),
				$('div', { className: 'actions' }, [create, status]),
			]),
		)
	} catch (error) {
		holder.innerHTML = ''
		holder.append($('pre', { className: 'result error' }, String(error.message ?? error)))
	}
}

const renderResource = main => {
	const r = view.resource
	// A route's back button lands on its router's route list, one level
	// below the Routers tab itself.
	const back = $('button', { className: 'back' }, '← ' + (r.kind === 'route' ? 'Routes' : groupTitle(r.kind)))

	back.onclick = () => {
		view.resource = null
		history.pushState(null, '', listUrl(r.kind))
		render()
	}

	main.append(
		back,
		$('h2', {}, label(r)),
		$('p', { className: 'detail' }, [r.kind, r.detail ? ' · ' + r.detail : '', r.routeKey ? ' · ' + r.routeKey : '']),
	)

	if (r.kind === 'instance') return instancePanel(main, r)
	if (r.kind === 'pubsub') return pubsubPanel(main, r)
	if (r.kind === 'rpc') return rpcPanel(main, r)
	if (r.kind === 'search') return searchPanel(main, r)
	if (r.kind === 'table') return tablePanel(main, r)
	if (r.kind === 'cache') return cachePanel(main, r)
	if (r.kind === 'store') return storePanel(main, r)
	if (r.kind === 'config') return configPanel(main)
	if (r.kind === 'auth') return authPanel(main, r)
	if (r.kind === 'worker') {
		cleanupPanel = attachLogFeed(main, 'worker')
		return
	}
	if (r.kind === 'route' || r.kind === 'site') {
		const url = r.url ?? r.detail
		main.append($('p', {}, $('a', { href: url, target: '_blank', style: 'color: var(--accent)' }, url)))

		if (r.channel) {
			cleanupPanel = attachLogFeed(main, r.channel)
		}

		return
	}
	invokePanel(main, r)
}

// ------------------------------------------------------------------
// Kind list

const renderList = main => {
	const items = state.resources.filter(r => r.kind === view.kind)
	const stacks = [...new Set(items.map(r => r.stack).filter(Boolean))].sort()

	// The routes view drills down per router: every router runs as its
	// own local server (like its own domain in production), so a flat
	// list mixing every router's routes would only confuse.
	if (view.kind === 'route' && !filter.router) {
		main.append($('h2', {}, 'Routers'))

		const rows = $('div', { className: 'rows' })

		for (const [id, port] of Object.entries(state.routerPorts)) {
			const count = items.filter(r => r.router === id).length
			const row = $('button', { className: 'row' }, [
				$('span', { className: 'stack' }, id),
				$('span', { className: 'id' }, 'http://localhost:' + port),
				$('span', { className: 'info' }, count + (count === 1 ? ' route' : ' routes')),
			])
			row.onclick = () => {
				filter.router = id
				history.pushState(null, '', listUrl('route'))
				render()
			}
			rows.append(row)
		}

		main.append(rows)
		return
	}

	if (view.kind === 'route') {
		const back = $('button', { className: 'back' }, '← Routers')
		back.onclick = () => {
			filter.router = ''
			history.pushState(null, '', listUrl('route'))
			render()
		}

		main.append(
			back,
			$('h2', {}, 'Routes'),
			$('p', { className: 'detail' }, filter.router + ' · http://localhost:' + state.routerPorts[filter.router]),
		)
	} else {
		main.append($('h2', {}, groupTitle(view.kind)))
	}

	// The config page is a single form over every defined value,
	// instead of a resource list.
	if (view.kind === 'config') {
		return configPanel(main)
	}

	// The email page lists every captured email of the session.
	if (view.kind === 'email') {
		return emailPanel(main)
	}

	// The alert page lists every captured alert of the session.
	if (view.kind === 'alert') {
		return alertPanel(main)
	}

	// The worker page streams the bundle worker output directly,
	// instead of listing its single resource.
	if (view.kind === 'worker') {
		const workerFeed = attachLogFeed(main, 'worker', undefined, 'Worker output')
		const debugFeed = attachLogFeed(main, 'debug', undefined, 'Dev server')

		cleanupPanel = () => {
			workerFeed?.()
			debugFeed?.()
		}
		return
	}

	const matches = r => {
		if (filter.stack && r.stack !== filter.stack) return false
		if (filter.router && r.router !== filter.router) return false
		if (!filter.query) return true

		return (r.stack + ' ' + r.id + ' ' + (r.detail ?? ''))
			.toLowerCase()
			.includes(filter.query.toLowerCase())
	}

	const rows = $('div', { className: 'rows' })
	const count = $('span', { className: 'count' })

	const renderRows = () => {
		rows.innerHTML = ''
		const visible = items.filter(matches)

		count.textContent = visible.length + ' of ' + items.length

		if (visible.length === 0) {
			rows.append($('p', { className: 'empty' }, 'Nothing matches.'))
			return
		}

		for (const r of visible) {
			const row = $('button', { className: 'row' }, [
				$('span', { className: 'stack' }, r.stack ?? '-'),
				$('span', { className: 'id' }, r.id),
				$('span', { className: 'info' }, r.detail ?? ''),
			])
			row.onclick = () => selectResource(r)
			rows.append(row)
		}
	}

	const search = $('input', {
		type: 'search',
		placeholder: 'Filter by name... ( / )',
		value: filter.query,
		autocomplete: 'off',
		id: 'list-filter',
	})
	search.oninput = () => {
		filter.query = search.value.trim()
		history.replaceState(null, '', listUrl(view.kind))
		renderRows()
	}

	const stackSelect = $('select', {}, [
		$('option', { value: '', textContent: 'All stacks' }),
		...stacks.map(stack => $('option', { value: stack, textContent: stack })),
	])
	stackSelect.value = filter.stack
	stackSelect.onchange = () => {
		filter.stack = stackSelect.value
		history.replaceState(null, '', listUrl(view.kind))
		renderRows()
	}

	const controls = [search]
	if (stacks.length > 1) controls.push(stackSelect)
	controls.push(count)

	main.append($('div', { className: 'filters' }, controls), rows)
	renderRows()
	search.focus()
}

// ------------------------------------------------------------------

const render = () => {
	// Panels with live connections clean up when the view changes.
	cleanupPanel?.()
	cleanupPanel = undefined

	const nav = document.getElementById('nav')
	nav.innerHTML = '<h1><span class="logo">AWS<span class="dim">LESS</span></span> <span class="cmd">dev</span></h1>'
	nav.querySelector('h1').onclick = showHome

	const navButton = kind => {
		// The Routers tab lists routers, so its count follows suit.
		const count = kind === 'route'
			? Object.keys(state.routerPorts).length
			: state.resources.filter(r => r.kind === kind).length
		if (count === 0) return null

		// The email outbox is a single feed, so a count of registered
		// resources would only confuse.
		const button = $('button', { className: view.kind === kind ? 'active' : '' }, [
			icon(kind),
			groupTitle(kind),
			kind === 'email' || kind === 'worker' || kind === 'alert' ? '' : $('span', { className: 'count' }, String(count)),
		])
		button.onclick = () => selectKind(kind)
		return button
	}

	const sectioned = new Set(SECTIONS.flatMap(([, kinds]) => kinds))

	for (const [label, kinds] of SECTIONS) {
		const buttons = kinds.map(navButton).filter(Boolean)
		if (buttons.length === 0) continue

		nav.append($('h3', {}, label), ...buttons)
	}

	// A kind without a section still shows, so new features never
	// silently vanish from the nav.
	for (const [kind] of GROUPS) {
		if (sectioned.has(kind)) continue

		const button = navButton(kind)
		if (button) nav.append(button)
	}

	if (state.seeds) {
		const reseed = $('button', { className: 'reseed' }, [icon('seed'), 'Reset & seed'])
		let armed = false
		let disarm

		reseed.onclick = async () => {
			// The reset wipes all local data, so it asks for a second
			// click before running.
			if (!armed) {
				armed = true
				reseed.lastChild.textContent = 'Click to confirm'
				disarm = setTimeout(() => {
					armed = false
					reseed.lastChild.textContent = 'Reset & seed'
				}, 3000)
				return
			}

			clearTimeout(disarm)
			armed = false
			reseed.disabled = true
			reseed.lastChild.textContent = 'Seeding...'

			try {
				const res = await fetch('/api/seed', { method: 'POST' })
				const data = await res.json()
				reseed.lastChild.textContent = data.ok ? 'Done' : 'Failed'
			} catch {
				reseed.lastChild.textContent = 'Failed'
			}

			setTimeout(() => {
				reseed.disabled = false
				reseed.lastChild.textContent = 'Reset & seed'
			}, 2000)
		}

		nav.append(reseed)
	}

	// Every view renders into its own container: navigating detaches
	// the old one, so a slow async panel (like a table scan) finishing
	// after the switch appends into a dead node instead of the screen.
	const main = document.getElementById('main')
	main.innerHTML = ''

	const page = $('div')
	main.append(page)

	if (view.resource) {
		renderResource(page)
	} else if (view.kind) {
		renderList(page)
	} else {
		renderHome(page)
	}
}

// ------------------------------------------------------------------
// Homepage: the session at a glance - endpoints, problems & the live
// activity feed of everything running through the bundle.

const timeAgo = ms => {
	const s = Math.max(0, Math.round(ms / 1000))
	if (s < 60) return s + 's'
	if (s < 3600) return Math.round(s / 60) + 'm'
	return Math.floor(s / 3600) + 'h ' + (Math.round(s / 60) % 60) + 'm'
}

const renderHome = main => {
	const session = state.session ?? {}

	const uptime = $('span', {}, '')
	const updateUptime = () => {
		uptime.textContent = session.startedAt ? 'up ' + timeAgo(Date.now() - session.startedAt) : ''
	}
	updateUptime()
	const uptimeTimer = setInterval(updateUptime, 1000)

	main.append(
		$('h2', {}, state.app),
		$('p', { className: 'detail' }, [
			uptime,
			session.workers ? ' \\u00b7 ' + session.workers + ' workers' : '',
		]),
	)

	// ----------------------------------------------------------------
	// Health: one chip per moving part, live.

	const chips = $('div', { className: 'health' })
	const chipEls = new Map()

	const renderChip = entry => {
		let chip = chipEls.get(entry.id)

		if (!chip) {
			chip = $('span', { className: 'chip' })
			chipEls.set(entry.id, chip)
			chips.append(chip)
		}

		chip.className = 'chip' + (entry.status === 'down' ? ' down' : '')
		chip.innerHTML = ''
		chip.append(
			$('span', { className: 'dot' }),
			entry.id,
			entry.detail ? $('span', { className: 'detail-text' }, '\u00b7 ' + entry.detail) : '',
		)
	}

	for (const entry of state.health ?? []) renderChip(entry)

	const healthSource = new EventSource('/api/events?channel=health')
	healthSource.onmessage = message => {
		try {
			renderChip(JSON.parse(message.data))
		} catch (_) {}
	}

	if ((state.health ?? []).length > 0) {
		main.append(chips)
	}

	// ----------------------------------------------------------------
	// Endpoints

	main.append($('h3', {}, 'Endpoints'))

	const endpoints = $('div', { className: 'rows' })

	for (const [id, port] of Object.entries(state.routerPorts ?? {})) {
		const url = 'http://localhost:' + port
		const row = $('a', { className: 'row', href: url, target: '_blank' }, [
			$('span', { className: 'stack' }, 'router ' + id),
			$('span', { className: 'id' }, url),
			$('span', { className: 'info' }, ''),
		])
		endpoints.append(row)
	}

	main.append(endpoints)

	// ----------------------------------------------------------------
	// Problems: failures, route errors & fired alerts, newest first.

	main.append($('h3', {}, 'Problems'))

	const problems = $('div', { className: 'rows' })
	const calm = $('p', { className: 'empty good' }, 'No problems - everything runs clean.')
	main.append(calm, problems)

	const problemRows = []

	const problemRow = data => {
		calm.hidden = true

		const row = $('button', { className: 'row problem' }, [
			$('span', { className: 'stack' }, new Date(data.date).toLocaleTimeString() + ' \\u00b7 ' + data.kind),
			$('span', { className: 'id' }, data.title ?? ''),
			$('span', { className: 'info' }, (data.detail ?? '').slice(0, 120)),
		])

		row.onclick = () => {
			if (data.kind === 'alert') {
				selectKind('alert')
				return
			}

			const resource = state.resources.find(r => r.routeKey === data.title)
			if (resource) selectResource(resource)
		}

		problems.prepend(row)
		problemRows.push(row)

		while (problemRows.length > 20) {
			problemRows.shift().remove()
		}
	}

	const problemSource = new EventSource('/api/events?channel=problems')
	problemSource.onmessage = message => {
		try {
			problemRow(JSON.parse(message.data))
		} catch (_) {}
	}

	// ----------------------------------------------------------------
	// Activity: every dispatch through the bundle, newest first.

	// Activity & the handler logs sit side by side, both as cards.
	const cols = $('div', { className: 'home-cols' })
	const activityCol = $('div', {})
	const logsCol = $('div', {})

	cols.append(activityCol, logsCol)
	main.append(cols)

	activityCol.append($('h3', {}, 'Activity'))

	const activityFeed = $('div', { className: 'logs' }, $('p', { className: 'empty' }, 'Nothing ran yet.'))
	activityCol.append(activityFeed)

	// The recent dispatches kept as data, not just DOM - the trace tree
	// renders straight from this buffer. It outlives the visible feed,
	// so a chain's early spans stay renderable after the feed pruned them.
	const activityData = []
	const traceCounts = new Map()

	const closeTrace = () => {
		document.querySelector('.overlay')?.remove()
	}

	// The trace tree: the whole request chain of one trace as nested
	// spans - what ran, what caused it, how long each step took & where
	// it failed. Children hang under their caller in dispatch order.
	const openTrace = traceId => {
		closeTrace()

		const entries = activityData.filter(entry => entry.trace === traceId)

		if (entries.length === 0) {
			return
		}

		const started = Math.min(...entries.map(entry => entry.date))
		const ended = Math.max(...entries.map(entry => entry.date + entry.ms))
		const failed = entries.some(entry => !entry.ok)

		const tree = $('div', { className: 'logs trace-tree' })
		const spans = new Set(entries.map(entry => entry.span))

		// A span whose parent already fell out of the buffer renders as
		// its own root instead of vanishing.
		const roots = entries.filter(entry => !entry.parent || !spans.has(entry.parent))

		const renderSpan = (entry, depth) => {
			const guide = $('span', { className: 'guide' }, '\\u2514')
			guide.style.paddingLeft = ((depth - 1) * 18) + 'px'

			tree.append($('div', { className: 'entry' + (entry.ok ? '' : ' error') }, [
				$('div', { className: 'meta' }, [
					depth > 0 ? guide : '',
					$('span', { className: 'time' }, new Date(entry.date).toLocaleTimeString()),
					routeTag(entry.route),
					$('span', { className: 'took' }, (entry.ok ? '' : '\\u2717 ') + entry.ms + 'ms'),
				]),
				entry.ok ? '' : $('div', { className: 'text', title: entry.error ?? '' }, entry.error ?? 'failed'),
				entry.payload ? $('div', { className: 'payload' }, entry.payload) : '',
			]))

			for (const child of entries.filter(other => other.parent === entry.span)) {
				renderSpan(child, depth + 1)
			}
		}

		for (const root of roots) {
			renderSpan(root, 0)
		}

		const close = $('button', { title: 'Close' }, '\\u2715')
		const overlay = $('div', { className: 'overlay' }, $('div', { className: 'modal' }, [
			$('div', { className: 'modal-head' }, [
				$('h3', {}, 'Trace ' + traceId),
				$('span', { className: 'detail' },
					entries.length + ' spans \\u00b7 ' + (ended - started) + 'ms' + (failed ? ' \\u00b7 failed' : '')),
				close,
			]),
			tree,
		]))

		close.onclick = closeTrace
		overlay.onclick = event => {
			if (event.target === overlay) closeTrace()
		}

		document.body.append(overlay)
	}

	const traceChip = traceId => {
		const chip = $('span', { className: 'trace-link', title: 'View the whole request chain' }, 'trace')
		chip.onclick = () => openTrace(traceId)
		return chip
	}

	// A lone dispatch shows no chip - once a second span of its trace
	// arrives, every entry of the chain gets one, retroactively.
	const markTraced = traceId => {
		for (const entry of activityFeed.querySelectorAll('[data-trace="' + traceId + '"]')) {
			if (!entry.querySelector('.trace-link')) {
				entry.querySelector('.meta')?.append(traceChip(traceId))
			}
		}
	}

	const activityRow = data => {
		activityFeed.querySelector('.empty')?.remove()

		activityData.push(data)

		while (activityData.length > 200) {
			activityData.shift()
		}

		// The same entry format as the log feeds: meta header with the
		// linked route tag & the duration, the payload truncated on its
		// own line with the full value on hover.
		const row = $('div', { className: 'entry' + (data.ok ? '' : ' error') }, [
			$('div', { className: 'meta' }, [
				$('span', { className: 'time' }, new Date(data.date).toLocaleTimeString()),
				routeTag(data.route),
				$('span', { className: 'took' }, (data.ok ? '' : '\\u2717 ') + data.ms + 'ms'),
			]),
			data.ok ? '' : $('div', { className: 'text', title: data.error ?? '' }, data.error ?? 'failed'),
			data.payload ? $('div', { className: 'payload' }, data.payload) : '',
		])

		if (data.trace) {
			row.setAttribute('data-trace', data.trace)
			traceCounts.set(data.trace, (traceCounts.get(data.trace) ?? 0) + 1)
		}

		activityFeed.append(row)

		if (data.trace && traceCounts.get(data.trace) > 1) {
			markTraced(data.trace)
		}

		while (activityFeed.children.length > 50) {
			activityFeed.firstChild.remove()
		}

		activityFeed.scrollTop = activityFeed.scrollHeight
	}

	const activitySource = new EventSource('/api/events?channel=activity')
	activitySource.onmessage = message => {
		try {
			activityRow(JSON.parse(message.data))
		} catch (_) {}
	}

	// ----------------------------------------------------------------
	// Logs: the handlers' own console output, live - the full feed
	// (incl. the dev server stream) lives on the Logs tab.

	const logsFeed = attachLogFeed(logsCol, 'worker', undefined, 'Logs')

	cleanupPanel = () => {
		clearInterval(uptimeTimer)
		closeTrace()
		healthSource.close()
		problemSource.close()
		activitySource.close()
		logsFeed?.()
	}
}

document.addEventListener('keydown', event => {
	const search = document.getElementById('list-filter')

	if (event.key === '/' && search && document.activeElement !== search) {
		event.preventDefault()
		search.focus()
		search.select()
	}
})

// The state ships inside the page, so the sidebar renders without a
// single network request.
try {
	state = JSON.parse(document.getElementById('state-data').textContent)
	document.title = state.app + ' · awsless dev'
	state.resources = [
		...state.resources,
		// The full route table per router, like the deployed router: both
		// bundle routes & proxy mounts (site dev servers, the pubsub
		// websocket). Only the raw per-file static asset routes stay out.
		...state.routes.filter(route => !route.rawKey).map(route => ({
			kind: 'route',
			id: route.pattern,
			stack: route.routeKey ? route.routeKey.split(':')[0] : undefined,
			router: route.routerId,
			routeKey: route.routeKey,
			detail: route.routeKey ?? ('proxy → ' + route.proxy),
			url: 'http://localhost:' + state.routerPorts[route.routerId] + route.pattern.split('{')[0].replace(/\\*$/, ''),
		})),
	]
	applyLocation()
} catch (error) {
	document.getElementById('main').innerHTML =
		'<pre class="result error">Loading the dashboard failed: ' + String(error.message ?? error) + '</pre>'
}
</script>
</body>
</html>
`
